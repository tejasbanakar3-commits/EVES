import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import api, { extractError } from "../lib/api";
import { getSocket } from "../lib/socket";
import { useAuth } from "../lib/auth";
import { EventTypeBadge } from "../components/Badges";
import CountdownTimer from "../components/CountdownTimer";
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    CircleCheck,
    Clock,
    Loader2,
    LogIn,
    Wifi,
    WifiOff,
    X,
} from "lucide-react";

// Tiny self-contained toast queue
function useToasts() {
    const [items, setItems] = useState([]);
    const push = useCallback((toast) => {
        const id = Math.random().toString(36).slice(2);
        setItems((s) => [...s, { id, ...toast }]);
        setTimeout(() => {
            setItems((s) => s.filter((t) => t.id !== id));
        }, toast.duration || 3500);
    }, []);
    const remove = (id) => setItems((s) => s.filter((t) => t.id !== id));
    return { items, push, remove };
}

function ToastViewport({ items, remove }) {
    return (
        <div
            data-testid="toast-viewport"
            className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-2"
        >
            {items.map((t) => (
                <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 12, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className={`pointer-events-auto flex max-w-sm items-start gap-3 rounded-md border bg-white p-3 shadow-lg ${
                        t.tone === "error"
                            ? "border-red-200"
                            : t.tone === "warn"
                              ? "border-yellow-200"
                              : t.tone === "success"
                                ? "border-green-200"
                                : "border-slate-200"
                    }`}
                >
                    <div
                        className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                            t.tone === "error"
                                ? "bg-red-500"
                                : t.tone === "warn"
                                  ? "bg-yellow-500"
                                  : t.tone === "success"
                                    ? "bg-green-500"
                                    : "bg-blue-500"
                        }`}
                    />
                    <div className="flex-1 text-sm">
                        <div className="font-medium text-slate-900">{t.title}</div>
                        {t.body && (
                            <div className="text-slate-500">{t.body}</div>
                        )}
                    </div>
                    <button
                        onClick={() => remove(t.id)}
                        className="text-slate-400 hover:text-slate-600"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </motion.div>
            ))}
        </div>
    );
}

const STATUS_CLASS = {
    AVAILABLE:
        "bg-white border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-slate-700 cursor-pointer",
    LOCKED_OTHER:
        "bg-yellow-50 border-yellow-400 text-yellow-700 cursor-not-allowed opacity-90",
    LOCKED_ME:
        "bg-purple-100 border-purple-500 text-purple-800 ring-2 ring-purple-400 ring-offset-1 cursor-pointer animate-lock-pulse",
    BOOKED:
        "bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed opacity-70 line-through",
};

function classify(seat, currentUserId) {
    if (seat.status === "BOOKED") return "BOOKED";
    if (seat.status === "LOCKED") {
        if (currentUserId && seat.lockedBy === currentUserId) return "LOCKED_ME";
        return "LOCKED_OTHER";
    }
    return "AVAILABLE";
}

export default function SeatSelection() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    const sessionId = useMemo(
        () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)),
        []
    );

    const [event, setEvent] = useState(null);
    const [seats, setSeats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [myLock, setMyLock] = useState(null); // { seatId, lockToken, expiresAt }
    const [locking, setLocking] = useState(false);
    const [connected, setConnected] = useState(false);
    const toastApi = useToasts();
    const myLockRef = useRef(null);
    useEffect(() => {
        myLockRef.current = myLock;
    }, [myLock]);

    const fetchAll = useCallback(async () => {
        try {
            const [evRes, seatsRes] = await Promise.all([
                api.get(`/events/${eventId}`),
                api.get(`/events/${eventId}/seats`),
            ]);
            setEvent(evRes.data.data);
            setSeats(seatsRes.data.data.seats);
        } catch (err) {
            setError(extractError(err, "Could not load seat grid"));
        } finally {
            setLoading(false);
        }
    }, [eventId]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    // Socket.IO live updates
    useEffect(() => {
        if (!eventId) return;
        const socket = getSocket();
        const handleConnect = () => {
            setConnected(true);
            socket.emit("join:event", eventId);
        };
        const handleDisconnect = () => setConnected(false);

        if (socket.connected) handleConnect();
        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);

        const onLocked = ({ seatId, userId, expiresAt }) => {
            setSeats((prev) =>
                prev.map((s) =>
                    s.id === seatId
                        ? { ...s, status: "LOCKED", lockedBy: userId, lockedUntil: expiresAt }
                        : s
                )
            );
        };
        const onAvailable = ({ seatId }) => {
            setSeats((prev) =>
                prev.map((s) =>
                    s.id === seatId
                        ? { ...s, status: "AVAILABLE", lockedBy: null, lockedUntil: null }
                        : s
                )
            );
            if (myLockRef.current?.seatId === seatId) {
                setMyLock(null);
            }
        };
        const onBooked = ({ seatId, bookingCode }) => {
            setSeats((prev) =>
                prev.map((s) =>
                    s.id === seatId
                        ? { ...s, status: "BOOKED", lockedBy: null, lockedUntil: null }
                        : s
                )
            );
            toastApi.push({
                title: "Seat booked",
                body: `Booking code ${bookingCode}`,
                tone: "success",
            });
        };
        const onLockExpired = ({ seatId }) => {
            if (myLockRef.current?.seatId === seatId) {
                setMyLock(null);
                toastApi.push({
                    title: "Lock expired",
                    body: "Your seat reservation timed out and was released.",
                    tone: "warn",
                });
            }
        };
        const onCrash = ({ message }) => {
            toastApi.push({ title: "Server crash simulated", body: message, tone: "warn" });
        };

        socket.on("seat:locked", onLocked);
        socket.on("seat:available", onAvailable);
        socket.on("seat:booked", onBooked);
        socket.on("lock:expired", onLockExpired);
        socket.on("payment:crashed", onCrash);
        socket.on("payment:failed", onAvailable);

        return () => {
            socket.emit("leave:event", eventId);
            socket.off("connect", handleConnect);
            socket.off("disconnect", handleDisconnect);
            socket.off("seat:locked", onLocked);
            socket.off("seat:available", onAvailable);
            socket.off("seat:booked", onBooked);
            socket.off("lock:expired", onLockExpired);
            socket.off("payment:crashed", onCrash);
            socket.off("payment:failed", onAvailable);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventId]);

    const onSeatClick = async (seat) => {
        if (!isAuthenticated) {
            navigate("/login", {
                state: { from: { pathname: `/events/${eventId}` } },
            });
            return;
        }
        const cls = classify(seat, user?.id);
        if (cls === "BOOKED" || cls === "LOCKED_OTHER") return;
        if (cls === "LOCKED_ME") {
            // navigate to payment for this seat
            navigate(
                `/events/${eventId}/payment?seat=${seat.id}&token=${myLock.lockToken}&session=${sessionId}`
            );
            return;
        }
        if (myLock) {
            toastApi.push({
                title: "Already holding a seat",
                body: `Release ${prettySeat(myLock.seatId, seats)} first or proceed to payment.`,
                tone: "warn",
            });
            return;
        }
        setLocking(true);
        try {
            const res = await api.post(`/seats/${seat.id}/lock`, { sessionId });
            const data = res.data.data;
            setMyLock({
                seatId: seat.id,
                lockToken: data.lockToken,
                expiresAt: data.expiresAt,
            });
            setSeats((prev) =>
                prev.map((s) =>
                    s.id === seat.id
                        ? { ...s, status: "LOCKED", lockedBy: user.id, lockedUntil: data.expiresAt }
                        : s
                )
            );
            toastApi.push({
                title: `Seat ${seat.seatNumber} locked`,
                body: "You have 5 minutes to complete payment.",
                tone: "success",
            });
        } catch (err) {
            const msg = extractError(err, "Could not lock seat");
            toastApi.push({
                title: "Could not lock seat",
                body: msg,
                tone: "error",
            });
            // refresh to get current truth
            fetchAll();
        } finally {
            setLocking(false);
        }
    };

    const releaseMyLock = async () => {
        if (!myLock) return;
        try {
            await api.delete(`/seats/${myLock.seatId}/release`, {
                headers: { "X-Session-Id": sessionId },
                data: { sessionId },
            });
            setMyLock(null);
            toastApi.push({ title: "Lock released", tone: "success" });
        } catch (err) {
            toastApi.push({
                title: "Could not release",
                body: extractError(err),
                tone: "error",
            });
        }
    };

    const goToPayment = () => {
        if (!myLock) return;
        navigate(
            `/events/${eventId}/payment?seat=${myLock.seatId}&token=${myLock.lockToken}&session=${sessionId}`
        );
    };

    const counts = useMemo(() => {
        let available = 0,
            locked = 0,
            booked = 0;
        for (const s of seats) {
            if (s.status === "AVAILABLE") available++;
            else if (s.status === "LOCKED") locked++;
            else if (s.status === "BOOKED") booked++;
        }
        return { total: seats.length, available, locked, booked };
    }, [seats]);

    const seatsByRow = useMemo(() => {
        const map = new Map();
        for (const s of seats) {
            if (!map.has(s.rowLabel)) map.set(s.rowLabel, []);
            map.get(s.rowLabel).push(s);
        }
        for (const arr of map.values()) {
            arr.sort((a, b) => a.columnNumber - b.columnNumber);
        }
        return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    }, [seats]);

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center text-slate-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading seat grid…
            </div>
        );
    }
    if (error) {
        return (
            <div className="mx-auto mt-16 max-w-xl rounded-md border border-red-200 bg-red-50 p-6 text-red-700">
                <div className="flex items-center gap-2 font-medium">
                    <AlertTriangle className="h-4 w-4" /> {error}
                </div>
                <Link
                    to="/events"
                    className="mt-4 inline-flex items-center gap-1 text-sm text-red-700 underline"
                >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to events
                </Link>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
            <Link
                to="/events"
                data-testid="seat-back-link"
                className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
            >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to events
            </Link>

            <div className="mt-4 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
                <div>
                    <div className="flex items-center gap-2">
                        <EventTypeBadge type={event.type} />
                        <ConnectionPill connected={connected} />
                    </div>
                    <h1 className="mt-3 font-display text-3xl font-medium tracking-tight text-slate-900 md:text-4xl">
                        {event.title}
                    </h1>
                    <div className="mt-1 text-sm text-slate-500 font-mono">
                        {event.source && event.destination
                            ? `${event.source} → ${event.destination}`
                            : event.venue}{" "}
                        · {new Date(event.eventDate).toLocaleString()}
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Stat label="Available" value={counts.available} tone="green" />
                    <Stat label="Locked" value={counts.locked} tone="yellow" />
                    <Stat label="Booked" value={counts.booked} tone="red" />
                </div>
            </div>

            {/* My lock bar */}
            {myLock && (
                <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="sticky top-16 z-30 mt-6 flex flex-col items-start justify-between gap-3 rounded-lg border border-purple-300 bg-purple-50/80 p-4 backdrop-blur md:flex-row md:items-center"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-purple-600 text-white">
                            <CircleCheck className="h-4 w-4" />
                        </div>
                        <div>
                            <div className="font-medium text-purple-900">
                                Seat {prettySeat(myLock.seatId, seats)} locked for you
                            </div>
                            <div className="font-mono text-xs uppercase tracking-widest text-purple-700">
                                Complete payment before the timer hits zero
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <CountdownTimer
                            expiresAt={myLock.expiresAt}
                            onExpire={() => setMyLock(null)}
                            testid="my-lock-timer"
                        />
                        <button
                            data-testid="release-lock-btn"
                            onClick={releaseMyLock}
                            className="rounded-md border border-purple-300 bg-white px-3 py-2 text-sm text-purple-700 hover:bg-purple-100"
                        >
                            Release
                        </button>
                        <button
                            data-testid="proceed-to-payment-btn"
                            onClick={goToPayment}
                            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            Proceed to payment
                            <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </motion.div>
            )}

            {!isAuthenticated && (
                <div className="mt-6 flex items-center justify-between gap-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                    <div className="flex items-center gap-2">
                        <LogIn className="h-4 w-4" />
                        Sign in to lock a seat. You can still preview the live grid.
                    </div>
                    <Link
                        to="/login"
                        state={{ from: { pathname: `/events/${eventId}` } }}
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                        data-testid="seat-signin-cta"
                    >
                        Sign in
                    </Link>
                </div>
            )}

            {/* Stage indicator */}
            <div className="mt-10 flex items-center justify-center">
                <div className="rounded-t-full border border-b-0 border-slate-200 bg-gradient-to-b from-slate-100 to-white px-12 py-3 text-center font-mono text-[10px] uppercase tracking-[0.4em] text-slate-500">
                    SCREEN · STAGE · ENTRY
                </div>
            </div>

            {/* SEAT GRID */}
            <div
                data-testid="seat-grid"
                className="mt-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 md:p-8"
            >
                <div className="flex flex-col gap-2 min-w-fit">
                    {seatsByRow.map(([row, rowSeats]) => (
                        <div key={row} className="flex items-center gap-2">
                            <span className="w-6 shrink-0 text-center font-mono text-xs font-medium text-slate-400">
                                {row}
                            </span>
                            <div
                                className="grid gap-1.5 md:gap-2"
                                style={{
                                    gridTemplateColumns: `repeat(${event.columns}, minmax(2rem, 2.5rem))`,
                                }}
                            >
                                {rowSeats.map((seat) => {
                                    const cls = classify(seat, user?.id);
                                    return (
                                        <button
                                            key={seat.id}
                                            data-testid={`seat-${seat.seatNumber}`}
                                            data-status={cls}
                                            onClick={() => onSeatClick(seat)}
                                            disabled={
                                                locking ||
                                                cls === "BOOKED" ||
                                                cls === "LOCKED_OTHER"
                                            }
                                            title={`${seat.seatNumber} · ${cls.replace("_", " ")}`}
                                            className={`flex h-9 items-center justify-center rounded-md border font-mono text-[11px] font-medium transition-all duration-150 md:h-10 ${STATUS_CLASS[cls]}`}
                                        >
                                            {seat.columnNumber}
                                        </button>
                                    );
                                })}
                            </div>
                            <span className="w-6 shrink-0 text-center font-mono text-xs font-medium text-slate-400">
                                {row}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 text-xs">
                    <Legend className="border-slate-200 bg-white" label="Available" />
                    <Legend className="border-yellow-400 bg-yellow-50" label="Locked (other)" />
                    <Legend className="border-purple-500 bg-purple-100" label="Locked (you)" />
                    <Legend className="border-slate-300 bg-slate-100" label="Booked" />
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-slate-400">
                    <Clock className="h-3.5 w-3.5" />
                    Lock TTL: 5 min
                </div>
            </div>

            <ToastViewport items={toastApi.items} remove={toastApi.remove} />
        </div>
    );
}

function prettySeat(seatId, seats) {
    const s = seats.find((x) => x.id === seatId);
    return s ? s.seatNumber : "—";
}

function Stat({ label, value, tone }) {
    const tones = {
        green: "text-green-700",
        yellow: "text-yellow-700",
        red: "text-red-700",
    };
    return (
        <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-right">
            <div
                className={`font-mono text-xl font-semibold ${tones[tone] || "text-slate-700"}`}
            >
                {value}
            </div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                {label}
            </div>
        </div>
    );
}

function Legend({ className, label }) {
    return (
        <span className="inline-flex items-center gap-2 text-slate-600">
            <span className={`inline-block h-4 w-4 rounded border ${className}`} />
            {label}
        </span>
    );
}

function ConnectionPill({ connected }) {
    return (
        <span
            data-testid="ws-connection-pill"
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-mono font-medium uppercase tracking-widest ring-1 ${
                connected
                    ? "bg-green-50 text-green-700 ring-green-200"
                    : "bg-slate-100 text-slate-500 ring-slate-200"
            }`}
        >
            {connected ? (
                <Wifi className="h-3 w-3" />
            ) : (
                <WifiOff className="h-3 w-3" />
            )}
            {connected ? "Live" : "Offline"}
        </span>
    );
}
