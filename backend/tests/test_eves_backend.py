"""
Eves backend end-to-end API tests.
Covers: auth, events, seats, locks, payments (4 flows), recovery,
admin endpoints, race-test.
"""
import os
import time
import uuid
import pytest
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://fullstack-analyzer-3.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@eves.io"
ADMIN_PASS = "admin123"
USER_EMAIL = "user@eves.io"
USER_PASS = "user123"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=15)
    assert r.status_code in (200, 201), r.text
    return r.json()["data"]["token"]


@pytest.fixture(scope="session")
def user_token():
    r = requests.post(f"{API}/auth/login", json={"email": USER_EMAIL, "password": USER_PASS}, timeout=15)
    assert r.status_code in (200, 201), r.text
    return r.json()["data"]["token"]


@pytest.fixture(scope="session")
def user_token2():
    """A second distinct user (registered) to exercise concurrent-lock conflicts."""
    email = f"tester_{uuid.uuid4().hex[:8]}@eves.io"
    r = requests.post(
        f"{API}/auth/register",
        json={"name": "Tester2", "email": email, "password": "password123"},
        timeout=15,
    )
    assert r.status_code in (200, 201), r.text
    return r.json()["data"]["token"]


@pytest.fixture(scope="session", autouse=True)
def reset_demo(admin_token):
    """Reset demo data once before running all tests."""
    requests.post(f"{API}/admin/reset-demo", headers={"Authorization": f"Bearer {admin_token}"}, timeout=30)
    yield


@pytest.fixture(scope="session")
def sample_event_id():
    r = requests.get(f"{API}/events", timeout=15)
    assert r.status_code == 200
    data = r.json()["data"]
    events = data if isinstance(data, list) else data.get("events") or data.get("items") or []
    assert len(events) > 0, "No events seeded"
    return events[0]["id"]


def _pick_available_seat(event_id, count=1):
    r = requests.get(f"{API}/events/{event_id}/seats", timeout=15)
    assert r.status_code == 200
    data = r.json()["data"]
    seats = data if isinstance(data, list) else data.get("seats") or []
    avail = [s for s in seats if s.get("status") == "AVAILABLE"]
    assert len(avail) >= count, f"Not enough available seats: {len(avail)}"
    return avail[:count]


# ---------- Health ----------
def test_backend_login_available():
    """Login endpoint is reachable, implies backend up."""
    r = requests.post(f"{API}/auth/login", json={"email": USER_EMAIL, "password": USER_PASS}, timeout=15)
    assert r.status_code == 200
    assert r.json()["success"] is True


# ---------- Auth ----------
class TestAuth:
    def test_login_success(self):
        r = requests.post(f"{API}/auth/login", json={"email": USER_EMAIL, "password": USER_PASS})
        assert r.status_code == 200
        body = r.json()
        assert body["success"] is True
        assert body["data"]["user"]["email"] == USER_EMAIL
        assert isinstance(body["data"]["token"], str) and len(body["data"]["token"]) > 20

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": USER_EMAIL, "password": "wrong"})
        assert r.status_code in (400, 401)

    def test_register_new_user(self):
        email = f"TEST_{uuid.uuid4().hex[:8]}@eves.io"
        r = requests.post(f"{API}/auth/register", json={"name": "TestX", "email": email, "password": "pw12345678"})
        assert r.status_code in (200, 201), r.text
        body = r.json()
        assert "token" in body["data"]
        assert body["data"]["user"]["email"] == email

    def test_me_endpoint(self, user_token):
        r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {user_token}"})
        assert r.status_code == 200
        d = r.json()["data"]
        assert (d.get("email") or d.get("user", {}).get("email")) == USER_EMAIL


# ---------- Events & Seats ----------
class TestEvents:
    def test_list_events(self):
        r = requests.get(f"{API}/events")
        assert r.status_code == 200
        data = r.json()["data"]
        events = data if isinstance(data, list) else data.get("events") or data.get("items") or []
        assert len(events) > 0

    def test_get_event_details(self, sample_event_id):
        r = requests.get(f"{API}/events/{sample_event_id}")
        assert r.status_code == 200
        assert r.json()["data"]["id"] == sample_event_id

    def test_get_seats(self, sample_event_id):
        r = requests.get(f"{API}/events/{sample_event_id}/seats")
        assert r.status_code == 200
        data = r.json()["data"]
        seats = data if isinstance(data, list) else data.get("seats") or []
        assert len(seats) > 0
        statuses = {s.get("status") for s in seats}
        assert statuses.issubset({"AVAILABLE", "LOCKED", "BOOKED"})

    def test_availability(self, sample_event_id):
        r = requests.get(f"{API}/events/{sample_event_id}/availability")
        assert r.status_code == 200
        d = r.json()["data"]
        assert "available" in d or "availableSeats" in d or "total" in d


# ---------- Locks ----------
class TestLocks:
    def test_lock_and_release(self, sample_event_id, user_token):
        seat = _pick_available_seat(sample_event_id)[0]
        session_id = str(uuid.uuid4())
        r = requests.post(
            f"{API}/seats/{seat['id']}/lock",
            headers={"Authorization": f"Bearer {user_token}"},
            json={"sessionId": session_id, "eventId": sample_event_id},
        )
        assert r.status_code in (200, 201), r.text
        data = r.json()["data"]
        assert "expiresAt" in data or "lockToken" in data or "token" in data
        # Release
        rel = requests.delete(
            f"{API}/seats/{seat['id']}/release",
            headers={"Authorization": f"Bearer {user_token}"},
            json={"sessionId": session_id},
        )
        assert rel.status_code in (200, 204)

    def test_concurrent_lock_conflict(self, sample_event_id, user_token, user_token2):
        seat = _pick_available_seat(sample_event_id)[0]
        sid1 = str(uuid.uuid4())
        sid2 = str(uuid.uuid4())

        def attempt(token, sid):
            return requests.post(
                f"{API}/seats/{seat['id']}/lock",
                headers={"Authorization": f"Bearer {token}"},
                json={"sessionId": sid, "eventId": sample_event_id},
                timeout=15,
            )

        with ThreadPoolExecutor(max_workers=2) as ex:
            futs = [ex.submit(attempt, user_token, sid1), ex.submit(attempt, user_token2, sid2)]
            results = [f.result() for f in as_completed(futs)]

        statuses = sorted([r.status_code for r in results])
        assert 201 in statuses or 200 in statuses, f"Expected one success, got {statuses}: {[r.text[:200] for r in results]}"
        assert 409 in statuses, f"Expected one 409, got {statuses}: {[r.text[:200] for r in results]}"

        # Cleanup – release whichever won
        winner = next(r for r in results if r.status_code in (200, 201))
        body = winner.json().get("data", {})
        # release by owner
        for tok, sid in [(user_token, sid1), (user_token2, sid2)]:
            requests.delete(
                f"{API}/seats/{seat['id']}/release",
                headers={"Authorization": f"Bearer {tok}"},
                json={"sessionId": sid},
            )

    def test_lock_ttl_approx_5min(self, sample_event_id, user_token):
        seat = _pick_available_seat(sample_event_id)[0]
        sid = str(uuid.uuid4())
        r = requests.post(
            f"{API}/seats/{seat['id']}/lock",
            headers={"Authorization": f"Bearer {user_token}"},
            json={"sessionId": sid, "eventId": sample_event_id},
        )
        assert r.status_code in (200, 201)
        data = r.json()["data"]
        exp = data.get("expiresAt")
        assert exp, f"No expiresAt in response: {data}"
        from datetime import datetime, timezone
        # Handle trailing Z
        exp_dt = datetime.fromisoformat(exp.replace("Z", "+00:00"))
        delta = (exp_dt - datetime.now(timezone.utc)).total_seconds()
        assert 240 <= delta <= 360, f"Lock TTL not ~5min: {delta}s"
        requests.delete(
            f"{API}/seats/{seat['id']}/release",
            headers={"Authorization": f"Bearer {user_token}"},
            json={"sessionId": sid},
        )


# ---------- Payment Flows ----------
def _lock_seat(event_id, token):
    seat = _pick_available_seat(event_id)[0]
    sid = str(uuid.uuid4())
    r = requests.post(
        f"{API}/seats/{seat['id']}/lock",
        headers={"Authorization": f"Bearer {token}"},
        json={"sessionId": sid, "eventId": event_id},
    )
    assert r.status_code in (200, 201), r.text
    data = r.json()["data"]
    lock_token = data.get("lockToken") or data.get("token")
    price = seat.get("price") or seat.get("priceCents") or 100
    return seat, sid, lock_token, price


class TestPayments:
    def test_payment_success(self, sample_event_id, user_token):
        seat, sid, lock_token, price = _lock_seat(sample_event_id, user_token)
        payload = {"seatId": seat["id"], "eventId": sample_event_id, "sessionId": sid, "lockToken": lock_token, "amount": price}
        r = requests.post(
            f"{API}/payments/simulate-success",
            headers={"Authorization": f"Bearer {user_token}"},
            json=payload,
        )
        assert r.status_code in (200, 201), r.text
        data = r.json()["data"]
        booking = data.get("booking") or data
        assert booking.get("bookingStatus") in ("CONFIRMED",) or booking.get("status") in ("CONFIRMED",)
        # Verify seat now BOOKED
        time.sleep(1)
        seats = requests.get(f"{API}/events/{sample_event_id}/seats").json()["data"]
        seats = seats if isinstance(seats, list) else seats.get("seats") or []
        s = next((x for x in seats if x["id"] == seat["id"]), None)
        assert s and s["status"] == "BOOKED", f"seat status={s}"

    def test_payment_failure_releases(self, sample_event_id, user_token):
        seat, sid, lock_token, price = _lock_seat(sample_event_id, user_token)
        payload = {"seatId": seat["id"], "eventId": sample_event_id, "sessionId": sid, "lockToken": lock_token, "amount": price}
        r = requests.post(
            f"{API}/payments/simulate-failure",
            headers={"Authorization": f"Bearer {user_token}"},
            json=payload,
        )
        assert r.status_code in (200, 201), r.text
        time.sleep(1)
        seats = requests.get(f"{API}/events/{sample_event_id}/seats").json()["data"]
        seats = seats if isinstance(seats, list) else seats.get("seats") or []
        s = next((x for x in seats if x["id"] == seat["id"]), None)
        assert s and s["status"] == "AVAILABLE", f"expected AVAILABLE, got {s}"

    def test_payment_timeout_releases(self, sample_event_id, user_token):
        seat, sid, lock_token, price = _lock_seat(sample_event_id, user_token)
        payload = {"seatId": seat["id"], "eventId": sample_event_id, "sessionId": sid, "lockToken": lock_token, "amount": price}
        r = requests.post(
            f"{API}/payments/simulate-timeout",
            headers={"Authorization": f"Bearer {user_token}"},
            json=payload,
        )
        assert r.status_code in (200, 201), r.text
        time.sleep(1)
        seats = requests.get(f"{API}/events/{sample_event_id}/seats").json()["data"]
        seats = seats if isinstance(seats, list) else seats.get("seats") or []
        s = next((x for x in seats if x["id"] == seat["id"]), None)
        assert s and s["status"] == "AVAILABLE", f"expected AVAILABLE, got {s}"

    def test_payment_crash_keeps_locked(self, sample_event_id, user_token, admin_token):
        seat, sid, lock_token, price = _lock_seat(sample_event_id, user_token)
        payload = {"seatId": seat["id"], "eventId": sample_event_id, "sessionId": sid, "lockToken": lock_token, "amount": price}
        r = requests.post(
            f"{API}/payments/simulate-crash",
            headers={"Authorization": f"Bearer {user_token}"},
            json=payload,
        )
        assert r.status_code in (200, 201, 500, 503), r.text
        time.sleep(1)
        seats = requests.get(f"{API}/events/{sample_event_id}/seats").json()["data"]
        seats = seats if isinstance(seats, list) else seats.get("seats") or []
        s = next((x for x in seats if x["id"] == seat["id"]), None)
        assert s and s["status"] == "LOCKED", f"expected LOCKED post-crash, got {s}"
        # Recovery: manual run (may not free seat yet if TTL hasn't expired;
        # just assert endpoint responds).
        rec = requests.post(
            f"{API}/recovery/run", headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert rec.status_code in (200, 201), rec.text


# ---------- Admin endpoints ----------
class TestAdmin:
    def test_dashboard(self, admin_token):
        r = requests.get(f"{API}/admin/dashboard", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        assert "data" in r.json()

    def test_active_locks(self, admin_token):
        r = requests.get(f"{API}/admin/active-locks", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200

    def test_bookings_list(self, admin_token):
        r = requests.get(f"{API}/admin/bookings?limit=10", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200

    def test_recovery_logs(self, admin_token):
        r = requests.get(f"{API}/recovery/logs", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200

    def test_recovery_stats(self, admin_token):
        r = requests.get(f"{API}/recovery/stats", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200

    def test_non_admin_blocked(self, user_token):
        r = requests.get(f"{API}/admin/dashboard", headers={"Authorization": f"Bearer {user_token}"})
        assert r.status_code in (401, 403)


# ---------- Race test ----------
class TestRace:
    def test_race_20_users(self, admin_token, sample_event_id):
        # pick a fresh seat
        requests.post(f"{API}/admin/reset-demo", headers={"Authorization": f"Bearer {admin_token}"}, timeout=30)
        time.sleep(1)
        seat = _pick_available_seat(sample_event_id)[0]
        r = requests.post(
            f"{API}/admin/race-test",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"eventId": sample_event_id, "seatId": seat["id"], "concurrentUsers": 20},
            timeout=60,
        )
        assert r.status_code in (200, 201), r.text
        d = r.json()["data"]
        assert d.get("successCount") == 1, f"Expected 1 success, got {d}"
        assert d.get("failedCount") == 19, f"Expected 19 fails, got {d}"


# ---------- New: Customer can create / import events ----------
def _future_iso(days=10):
    from datetime import datetime, timezone, timedelta
    return (datetime.now(timezone.utc) + timedelta(days=days)).replace(microsecond=0).isoformat().replace("+00:00", "Z")


class TestCreateEventByCustomer:
    """POST /api/events should be allowed for any authenticated user (formerly admin-only)."""

    def test_customer_can_create_event_with_seats_autogenerated(self, user_token):
        payload = {
            "title": f"TEST_Customer Event {uuid.uuid4().hex[:6]}",
            "type": "EVENT",
            "venue": "Test Hall",
            "eventDate": _future_iso(7),
            "totalSeats": 12,  # 3 * 4
            "rows": 3,
            "columns": 4,
        }
        r = requests.post(
            f"{API}/events",
            headers={"Authorization": f"Bearer {user_token}"},
            json=payload,
            timeout=30,
        )
        assert r.status_code in (200, 201), r.text
        body = r.json()
        assert body["success"] is True
        ev = body["data"]
        assert ev["title"] == payload["title"]
        # Auto-generated seats
        assert ev.get("_count", {}).get("seats") == 3 * 4, f"seats not auto-generated: {ev}"
        # GET seat grid
        seats_resp = requests.get(f"{API}/events/{ev['id']}/seats", timeout=15)
        assert seats_resp.status_code == 200
        sd = seats_resp.json()["data"]
        seats = sd if isinstance(sd, list) else sd.get("seats") or []
        assert len(seats) == 12
        # Statuses are AVAILABLE
        assert all(s["status"] == "AVAILABLE" for s in seats)

    def test_create_event_requires_auth(self):
        payload = {
            "title": "TEST_Anonymous",
            "type": "EVENT",
            "venue": "x",
            "eventDate": _future_iso(7),
            "totalSeats": 4,
            "rows": 2,
            "columns": 2,
        }
        r = requests.post(f"{API}/events", json=payload, timeout=15)
        assert r.status_code in (401, 403), r.text


class TestImportEventsByCustomer:
    """POST /api/events/import — open to any auth user, partial-success per row."""

    def test_customer_import_mixed_rows(self, user_token):
        good_title = f"TEST_Import_OK_{uuid.uuid4().hex[:6]}"
        bad_title = f"TEST_Import_BAD_{uuid.uuid4().hex[:6]}"
        payload = [
            # 1 valid event
            {
                "title": good_title,
                "type": "EVENT",
                "venue": "Royal Hall",
                "eventDate": _future_iso(8),
                "rows": 4,
                "columns": 5,
            },
            # 1 invalid: bad type
            {
                "title": bad_title,
                "type": "PLANE",
                "venue": "Nowhere",
                "eventDate": _future_iso(9),
                "rows": 2,
                "columns": 2,
            },
            # 1 invalid: missing eventDate
            {
                "title": bad_title + "_2",
                "type": "EVENT",
                "venue": "Nowhere",
                "rows": 2,
                "columns": 2,
            },
        ]
        r = requests.post(
            f"{API}/events/import",
            headers={"Authorization": f"Bearer {user_token}"},
            json=payload,
            timeout=60,
        )
        assert r.status_code in (200, 201), r.text
        d = r.json()["data"]
        assert d["total"] == 3
        assert d["imported"] == 1
        assert d["failed"] == 2
        assert len(d["results"]) == 3
        ok = [x for x in d["results"] if x["ok"]]
        assert len(ok) == 1 and ok[0].get("eventId")
        bad = [x for x in d["results"] if not x["ok"]]
        assert all("error" in b for b in bad)

    def test_import_requires_array(self, user_token):
        r = requests.post(
            f"{API}/events/import",
            headers={"Authorization": f"Bearer {user_token}"},
            json={"not": "an array"},
            timeout=15,
        )
        assert r.status_code in (400, 422), r.text


# ---------- New: Admin import bookings ----------
class TestImportBookings:
    @pytest.fixture
    def fresh_event(self, user_token):
        """Create a fresh event with seats for booking-import tests."""
        payload = {
            "title": f"TEST_BookingImport_{uuid.uuid4().hex[:6]}",
            "type": "CINEMA",
            "venue": "Plex 7",
            "eventDate": _future_iso(12),
            "totalSeats": 9,
            "rows": 3,
            "columns": 3,
        }
        r = requests.post(
            f"{API}/events",
            headers={"Authorization": f"Bearer {user_token}"},
            json=payload,
            timeout=30,
        )
        assert r.status_code in (200, 201), r.text
        ev = r.json()["data"]
        seats = requests.get(f"{API}/events/{ev['id']}/seats").json()["data"]
        seats = seats if isinstance(seats, list) else seats.get("seats") or []
        return ev, seats

    def test_admin_import_bookings_success(self, admin_token, fresh_event):
        ev, seats = fresh_event
        # Take 3 available seats
        avail = [s for s in seats if s["status"] == "AVAILABLE"][:3]
        assert len(avail) == 3
        items = [
            {"eventId": ev["id"], "seatId": s["id"], "userEmail": USER_EMAIL, "amount": 500}
            for s in avail
        ]
        r = requests.post(
            f"{API}/admin/bookings/import",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=items,
            timeout=60,
        )
        assert r.status_code in (200, 201), r.text
        d = r.json()["data"]
        assert d["total"] == 3
        assert d["imported"] == 3
        assert d["failed"] == 0
        for row in d["results"]:
            assert row["ok"] is True
            assert row.get("bookingCode")
            assert isinstance(row["bookingCode"], str) and len(row["bookingCode"]) > 0
        # Verify seats are now BOOKED
        seats2 = requests.get(f"{API}/events/{ev['id']}/seats").json()["data"]
        seats2 = seats2 if isinstance(seats2, list) else seats2.get("seats") or []
        booked_ids = {s["id"] for s in seats2 if s["status"] == "BOOKED"}
        for s in avail:
            assert s["id"] in booked_ids, f"Seat {s['seatNumber']} not BOOKED"

    def test_admin_import_bookings_partial_failure(self, admin_token, fresh_event, user_token):
        ev, seats = fresh_event
        avail = [s for s in seats if s["status"] == "AVAILABLE"]
        # First, book one seat so it becomes BOOKED for the next import
        booked_seat = avail[0]
        first = requests.post(
            f"{API}/admin/bookings/import",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=[{"eventId": ev["id"], "seatId": booked_seat["id"], "userEmail": USER_EMAIL, "amount": 200}],
            timeout=30,
        )
        assert first.status_code in (200, 201)
        assert first.json()["data"]["imported"] == 1

        # Now build a 4-row import: re-use already-booked seat, bogus seatId,
        # invalid email, and one fresh seat that should succeed.
        next_seat = avail[1]
        items = [
            # already booked
            {"eventId": ev["id"], "seatId": booked_seat["id"], "userEmail": USER_EMAIL, "amount": 200},
            # bogus seatId
            {"eventId": ev["id"], "seatId": str(uuid.uuid4()), "userEmail": USER_EMAIL, "amount": 200},
            # bad email
            {"eventId": ev["id"], "seatId": next_seat["id"], "userEmail": "ghost@nowhere.io", "amount": 200},
            # valid → should succeed (still uses next_seat, but previous row failed before tx wrote)
            {"eventId": ev["id"], "seatId": next_seat["id"], "userEmail": USER_EMAIL, "amount": 250},
        ]
        r = requests.post(
            f"{API}/admin/bookings/import",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=items,
            timeout=30,
        )
        assert r.status_code in (200, 201), r.text
        d = r.json()["data"]
        assert d["total"] == 4
        # exactly 1 success
        oks = [x for x in d["results"] if x["ok"]]
        fails = [x for x in d["results"] if not x["ok"]]
        assert len(oks) == 1, f"oks={oks} fails={fails}"
        assert len(fails) == 3
        for f in fails:
            assert isinstance(f.get("error"), str) and len(f["error"]) > 0

    def test_non_admin_blocked(self, user_token, fresh_event):
        ev, seats = fresh_event
        avail = [s for s in seats if s["status"] == "AVAILABLE"][:1]
        items = [{"eventId": ev["id"], "seatId": avail[0]["id"], "userEmail": USER_EMAIL, "amount": 100}]
        r = requests.post(
            f"{API}/admin/bookings/import",
            headers={"Authorization": f"Bearer {user_token}"},
            json=items,
            timeout=15,
        )
        assert r.status_code in (401, 403), r.text

    def test_anonymous_blocked(self, fresh_event):
        ev, seats = fresh_event
        avail = [s for s in seats if s["status"] == "AVAILABLE"][:1]
        items = [{"eventId": ev["id"], "seatId": avail[0]["id"], "userEmail": USER_EMAIL, "amount": 100}]
        r = requests.post(f"{API}/admin/bookings/import", json=items, timeout=15)
        assert r.status_code in (401, 403)

