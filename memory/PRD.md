# Eves — PRD & Implementation Memory

## 1. Original problem statement (verbatim)
> analyze the backend according to the uploaded file and also read the frontend MD file inside it and ,build a premium ,professional,user friendly frontend. And connect both backend and frontend. And make it deploy ready.

User shipped a `shreyes_bro_eves.zip` containing:
- `apps/api/` — Express + Socket.IO + BullMQ TypeScript backend (Eves)
- `prisma/schema.prisma` + `prisma/seed.ts` — PostgreSQL schema & demo data
- `FRONTEND_PRD.md` — explicit page/route/payload contract for the UI
- `Dockerfile`, `docker-compose.yml` — deployment scaffolding

## 2. Architecture (live in this preview)
```
React 19 (CRA, port 3000)  ──HTTP+WS──▶  Express + Socket.IO (port 8001)
                                              │
                                              ├── Redis (atomic locks · TTL · queue)
                                              ├── PostgreSQL (durable state · SELECT FOR UPDATE)
                                              └── BullMQ recovery worker (in-process)
```

### Why we replaced server.py
The Emergent supervisor hard-pins `uvicorn server:app` for the `backend` program.
`/app/backend/server.py` therefore uses `os.execvp` at import time to replace
the Python worker with `node tsx apps/api/src/server.ts`. After exec, Node owns
the supervisor PID and binds 8001 directly. PostgreSQL and Redis run as new
supervisor programs (`/etc/supervisor/conf.d/eves-services.conf`).

## 3. User personas
- **Customer** — discovers events, locks a seat, completes a (simulated) payment, downloads ticket.
- **Admin** — operates the system: dashboard KPIs, active locks, recovery logs, race-condition simulator, demo reset.
- **Engineer/recruiter** — visits the landing page to evaluate the phantom-lock-recovery story.

## 4. Core requirements (locked)
1. **JWT auth** with seeded demo accounts (admin/customer).
2. **Real-time seat grid** with Socket.IO live updates: AVAILABLE/LOCKED-by-other/LOCKED-by-me/BOOKED.
3. **Atomic locking** (Redis `SET NX EX`) + **fair queue**.
4. **Four payment scenarios**: success, failure, timeout, crash.
5. **Phantom-lock recovery** — BullMQ worker scans every 10s.
6. **Premium ticket-style booking detail** with QR placeholder.
7. **Admin console** with KPI cards, locks/bookings/recovery tables, demo reset, manual recovery, race-test page.
8. **Deploy-ready & flexible** — backend Dockerfile, docker-compose for Postgres+Redis, environment-driven config.

## 5. What's been implemented (Jan 2026)
- ✅ Backend wired to local Postgres + Redis; Prisma schema pushed; demo data seeded.
- ✅ Express, Socket.IO, BullMQ recovery worker, JWT auth, four payment scenarios.
- ✅ Bug fix: removed invalid `::uuid` casts on raw `$queryRaw` SQL (text-id columns).
- ✅ Bug fix: race-test now uses runner's real userId so PG FK is satisfied; 1 winner / N-1 rejected.
- ✅ Frontend: Landing, Login (with demo-fill buttons), Register, Events list (filter+search+type icons), Seat Selection (Socket.IO), Payment (4 scenarios), My Bookings, Premium Ticket detail (with perforation), Admin Dashboard (5s polling), Race Simulation visualizer.
- ✅ Tailwind + Outfit/IBM Plex Sans/JetBrains Mono fonts; lock-pulse animation; ticket textures.
- ✅ Test results: 22/23 backend (race-test fix re-verified), all frontend smoke flows pass.
- ✅ **Iteration 2 (Jan 2026)** — Any logged-in user can create events via `/events/new` (manual form auto-generates seats). Bulk import for events (any user) and bookings (admin only) via JSON paste/upload with per-row error reporting. Server-side validation of TRAIN/BUS source+destination vs venue, 200-row import cap. 31/31 backend tests pass.

## 6. Prioritized backlog
**P0** — Already done.

**P1**
- Convert frontend to TypeScript (user originally asked, deferred for stability).
- Add `prisma/migrations` proper migrations file (currently using `db push`).
- Wire `setupMiddlewares` to silence webpack-dev-server deprecation warnings.

**P2**
- Real QR encoding on ticket detail.
- Per-event ticket pricing on the server (currently amount comes from client).
- Email/SMS confirmation on successful booking (SendGrid/Twilio integration).
- Persistent rate-limiting via `rate-limit-redis` (already a dependency).

## 7. Deployment notes
- `Dockerfile` builds the API via `tsup` → `dist/server.js`. CMD `node dist/server.js`.
- `docker-compose.yml` ships Postgres 16 + Redis 7. Add an `api` service that uses the Dockerfile.
- For Vercel/Railway/Fly: deploy the API as a Node service, set the env vars from `.env.example`, and host the frontend separately or as a static build pointed at the API URL.
- Environment vars expected: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `LOCK_TTL_SECONDS`, `RECOVERY_INTERVAL_MS`, `CORS_ORIGIN`, `PORT`.

## 8. Next tasks
- Decide whether to migrate the frontend to React + Vite + TS (user-stated preference) once feature surface stabilizes.
- Add basic Cypress/Playwright e2e for the seat-locking concurrency flow.
