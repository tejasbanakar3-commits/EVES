import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import api, { extractError } from "../lib/api";
import CountdownTimer from "../components/CountdownTimer";
import {
    AlertTriangle,
    ArrowLeft,
    CircleDollarSign,
    CloudOff,
    Loader2,
    ServerCrash,
    TimerReset,
    XCircle,
} from "lucide-react";

const SCENARIOS = [
    {
        key: "success",
        endpoint: "/payments/simulate-success",
        title: "Pay Successfully",
        body: "Atomic booking · seat moves to BOOKED · receipt issued.",
        tone: "success",
        icon: <CircleDollarSign className="h-5 w-5" />,
    },
    {
        key: "failure",
        endpoint: "/payments/simulate-failure",
        title: "Simulate Failure",
        body: "Payment gateway declines · lock released · seat returns to grid.",
        tone: "danger",
        icon: <XCircle className="h-5 w-5" />,
    },
    {
        key: "timeout",
        endpoint: "/payments/simulate-timeout",
        title: "Simulate Timeout",
        body: "User connection drops · lock released after grace period.",
        tone: "warning",
        icon: <TimerReset className="h-5 w-5" />,
    },
    {
        key: "crash",
        endpoint: "/payments/simulate-crash",
        title: "Simulate Crash",
        body: "Server dies mid-payment · recovery worker reclaims phantom lock.",
        tone: "neutral",
        icon: <ServerCrash className="h-5 w-5" />,
    },
];

const TONE_BTN = {
    success: "bg-green-600 hover:bg-green-700 text-white border-green-700",
    danger: "bg-red-600 hover:bg-red-700 text-white border-red-700",
    warning: "bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-600",
    neutral: "bg-slate-900 hover:bg-slate-800 text-white border-slate-900",
};

export default function Payment() {
    const { eventId } = useParams();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const seatId = params.get("seat");
    const lockToken = params.get("token");
    const sessionId = params.get("session");

    const [event, setEvent] = useState(null);
    const [seat, setSeat] = useState(null);
    const [amount, setAmount] = useState(500);
    const [loading, setLoading] = useState(true);
    const [paying, setPaying] = useState(null); // scenario key
    const [error, setError] = useState("");
    const [crashBanner, setCrashBanner] = useState(false);

    useEffect(() => {
        let active = true;
        if (!seatId || !lockToken || !sessionId) {
            setError("Missing payment context. Pick a seat first.");
            setLoading(false);
            return;
        }
        (async () => {
            try {
                const [evRes, seatsRes] = await Promise.all([
                    api.get(`/events/${eventId}`),
                    api.get(`/events/${eventId}/seats`),
                ]);
                if (!active) return;
                setEvent(evRes.data.data);
                const s = seatsRes.data.data.seats.find((x) => x.id === seatId);
                if (!s) {
                    setError("Seat not found.");
                } else {
                    setSeat(s);
                }
            } catch (err) {
                if (active) setError(extractError(err, "Could not load payment page"));
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => {
            active = false;
        };
    }, [eventId, seatId, lockToken, sessionId]);

    const run = async (scenario) => {
        setError("");
        setPaying(scenario.key);
        try {
            const res = await api.post(scenario.endpoint, {
                seatId,
                sessionId,
                lockToken,
                amount: Number(amount),
            });
            const data = res.data.data;
            if (scenario.key === "success") {
                navigate(`/bookings/${data.booking.id}`, { replace: true });
                return;
            }
            if (scenario.key === "crash") {
                setCrashBanner(true);
                return;
            }
            // failure or timeout — return to seats with toast via query
            navigate(`/events/${eventId}?paymentResult=${scenario.key}`, {
                replace: true,
            });
        } catch (err) {
            setError(extractError(err, "Payment scenario failed"));
        } finally {
            setPaying(null);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center text-slate-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
            </div>
        );
    }

    if (error && !seat) {
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

    const lockExpiresAt = seat?.lockedUntil;

    return (
        <div className="mx-auto max-w-5xl px-4 py-10 md:px-8 md:py-16">
            <Link
                to={`/events/${eventId}`}
                data-testid="payment-back-link"
                className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
            >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to seat grid
            </Link>

            <div className="mt-6 grid gap-8 md:grid-cols-3">
                {/* Seat info */}
                <div className="md:col-span-1">
                    <span className="label-eyebrow">Reservation</span>
                    <div className="mt-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                            {event?.title}
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                            <div>
                                <div className="font-display text-4xl font-semibold tracking-tight text-slate-900">
                                    {seat?.seatNumber}
                                </div>
                                <div className="text-xs text-slate-500">
                                    Row {seat?.rowLabel} · Col {seat?.columnNumber}
                                </div>
                            </div>
                            {lockExpiresAt && (
                                <CountdownTimer
                                    expiresAt={lockExpiresAt}
                                    label="Hold"
                                    testid="payment-lock-timer"
                                />
                            )}
                        </div>

                        <div className="mt-6">
                            <label className="label-eyebrow mb-1.5 block">
                                Amount (₹)
                            </label>
                            <input
                                data-testid="payment-amount-input"
                                type="number"
                                min={1}
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-lg text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            />
                        </div>

                        <div className="mt-6 rounded-md bg-slate-50 p-3 font-mono text-[11px] leading-relaxed text-slate-500">
                            <div className="flex justify-between">
                                <span>Lock token</span>
                                <span className="truncate text-slate-700">
                                    {lockToken?.slice(0, 8)}…
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Session</span>
                                <span className="truncate text-slate-700">
                                    {sessionId?.slice(0, 8)}…
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scenarios */}
                <div className="md:col-span-2">
                    <span className="label-eyebrow">Choose a scenario</span>
                    <h1 className="mt-2 font-display text-3xl font-medium tracking-tight text-slate-900 md:text-4xl">
                        Simulate any outcome.
                    </h1>
                    <p className="mt-2 text-sm text-slate-500">
                        Each button calls a real backend endpoint and lets you observe how
                        Eves recovers from failures, timeouts, and full server crashes.
                    </p>

                    {error && (
                        <div
                            data-testid="payment-error"
                            className="mt-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                        >
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                        </div>
                    )}

                    {crashBanner && (
                        <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-4 flex items-start gap-3 rounded-md border border-slate-300 bg-slate-100 p-4 text-sm text-slate-800"
                        >
                            <CloudOff className="mt-0.5 h-4 w-4 shrink-0" />
                            <div>
                                <div className="font-medium">
                                    Server crash simulated
                                </div>
                                <div className="mt-1 text-slate-600">
                                    The booking is stuck in PENDING. Wait ~5 minutes for the
                                    recovery worker, or visit the admin dashboard and click
                                    "Run Recovery" to clean it up immediately.
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <Link
                                        to="/bookings"
                                        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                                        data-testid="crash-view-bookings-btn"
                                    >
                                        View my bookings
                                    </Link>
                                    <Link
                                        to="/admin"
                                        className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                                        data-testid="crash-go-admin-btn"
                                    >
                                        Open admin dashboard
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {SCENARIOS.map((s) => (
                            <button
                                key={s.key}
                                data-testid={`payment-${s.key}-btn`}
                                disabled={!!paying}
                                onClick={() => run(s)}
                                className={`group flex flex-col items-start gap-2 rounded-lg border p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 ${TONE_BTN[s.tone]}`}
                            >
                                <div className="flex w-full items-center justify-between">
                                    <span className="flex items-center gap-2 font-display text-base font-medium">
                                        {s.icon}
                                        {s.title}
                                    </span>
                                    {paying === s.key && (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    )}
                                </div>
                                <div className="text-xs leading-relaxed opacity-90">
                                    {s.body}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
