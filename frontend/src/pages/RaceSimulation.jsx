import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import api, { extractError } from "../lib/api";
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    Loader2,
    Play,
    Trophy,
    XCircle,
    Zap,
} from "lucide-react";

export default function RaceSimulation() {
    const [events, setEvents] = useState([]);
    const [eventId, setEventId] = useState("");
    const [seats, setSeats] = useState([]);
    const [seatId, setSeatId] = useState("");
    const [users, setUsers] = useState(50);
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const res = await api.get("/events");
                if (!active) return;
                setEvents(res.data.data);
                if (res.data.data[0]) setEventId(res.data.data[0].id);
            } catch (err) {
                if (active) setError(extractError(err, "Could not load events"));
            }
        })();
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!eventId) return;
        let active = true;
        (async () => {
            try {
                const res = await api.get(`/events/${eventId}/seats`);
                if (!active) return;
                const available = res.data.data.seats.filter((s) => s.status === "AVAILABLE");
                setSeats(available);
                setSeatId(available[0]?.id || "");
            } catch (err) {
                if (active) setError(extractError(err, "Could not load seats"));
            }
        })();
        return () => {
            active = false;
        };
    }, [eventId]);

    const run = async () => {
        if (!eventId || !seatId) return;
        setRunning(true);
        setError("");
        setResult(null);
        try {
            const res = await api.post("/admin/race-test", {
                eventId,
                seatId,
                concurrentUsers: Number(users),
            });
            setResult(res.data.data);
        } catch (err) {
            setError(extractError(err, "Race test failed"));
        } finally {
            setRunning(false);
        }
    };

    const dots = useMemo(() => {
        if (!result) return [];
        const arr = Array.from({ length: result.totalAttempts }, (_, i) => ({
            id: i,
            won: false,
        }));
        if (result.successCount > 0) arr[0].won = true;
        return arr;
    }, [result]);

    return (
        <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
            <Link
                to="/admin"
                data-testid="race-back-link"
                className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
            >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to admin
            </Link>

            <div className="mt-4">
                <span className="label-eyebrow">Concurrency proof</span>
                <h1 className="mt-2 font-display text-4xl font-medium tracking-tight text-slate-900 md:text-5xl">
                    Race condition simulation
                </h1>
                <p className="mt-2 max-w-2xl text-slate-500">
                    Fire <span className="font-mono">N</span> simultaneous lock requests
                    at a single seat. Eves should always pick exactly one winner thanks
                    to atomic Redis <code className="font-mono">SET NX EX</code>.
                </p>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-1">
                    <span className="label-eyebrow">Configure</span>
                    <div className="mt-4 space-y-4">
                        <div>
                            <label className="label-eyebrow mb-1.5 block">Event</label>
                            <select
                                data-testid="race-event-select"
                                value={eventId}
                                onChange={(e) => setEventId(e.target.value)}
                                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            >
                                {events.map((e) => (
                                    <option key={e.id} value={e.id}>
                                        {e.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label-eyebrow mb-1.5 block">Seat</label>
                            <select
                                data-testid="race-seat-select"
                                value={seatId}
                                onChange={(e) => setSeatId(e.target.value)}
                                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            >
                                {seats.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.seatNumber}
                                    </option>
                                ))}
                            </select>
                            <div className="mt-1 text-[11px] text-slate-500">
                                {seats.length} available seats found.
                            </div>
                        </div>
                        <div>
                            <label className="label-eyebrow mb-1.5 block">
                                Concurrent users · {users}
                            </label>
                            <input
                                data-testid="race-users-slider"
                                type="range"
                                min={5}
                                max={100}
                                step={1}
                                value={users}
                                onChange={(e) => setUsers(e.target.value)}
                                className="w-full accent-blue-600"
                            />
                            <div className="mt-1 flex justify-between font-mono text-[10px] uppercase tracking-widest text-slate-400">
                                <span>5</span>
                                <span>100</span>
                            </div>
                        </div>

                        <button
                            data-testid="race-run-btn"
                            disabled={running || !seatId}
                            onClick={run}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                        >
                            {running ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Play className="h-4 w-4" />
                            )}
                            Run race test
                        </button>

                        {error && (
                            <div
                                data-testid="race-error"
                                className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700"
                            >
                                <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />
                                {error}
                            </div>
                        )}
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
                    <div className="flex items-center justify-between">
                        <span className="label-eyebrow">Result</span>
                        {result && (
                            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-blue-600">
                                <Zap className="h-3 w-3" /> {result.timingMs}ms
                            </span>
                        )}
                    </div>

                    {!result ? (
                        <div className="mt-12 flex flex-col items-center gap-2 text-slate-400">
                            <Trophy className="h-12 w-12" />
                            <span className="text-sm">
                                Run a test to see the visualization.
                            </span>
                        </div>
                    ) : (
                        <>
                            <div className="mt-6 grid grid-cols-3 gap-3">
                                <ResultStat
                                    icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
                                    label="Winners"
                                    value={result.successCount}
                                    tone="text-green-700"
                                />
                                <ResultStat
                                    icon={<XCircle className="h-4 w-4 text-red-600" />}
                                    label="Rejected"
                                    value={result.failedCount}
                                    tone="text-red-700"
                                />
                                <ResultStat
                                    icon={<Zap className="h-4 w-4 text-blue-600" />}
                                    label="Total ms"
                                    value={result.timingMs}
                                    tone="text-blue-700"
                                />
                            </div>

                            <div className="mt-6 rounded-md border border-slate-100 bg-slate-50 p-4">
                                <div
                                    data-testid="race-dots"
                                    className="grid grid-cols-10 gap-2 sm:grid-cols-12 lg:grid-cols-[repeat(auto-fill,minmax(28px,1fr))]"
                                >
                                    {dots.map((d, i) => (
                                        <motion.div
                                            key={d.id}
                                            initial={{ scale: 0.5, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{
                                                delay: i * 0.012,
                                                duration: 0.25,
                                            }}
                                            className={`flex h-7 w-7 items-center justify-center rounded-md text-[10px] font-mono ${
                                                d.won
                                                    ? "bg-green-500 text-white shadow-md ring-2 ring-green-200"
                                                    : "bg-red-100 text-red-500 ring-1 ring-red-200"
                                            }`}
                                            title={
                                                d.won ? "Winner" : "Rejected"
                                            }
                                        >
                                            {d.won ? (
                                                <CheckCircle2 className="h-3 w-3" />
                                            ) : (
                                                <XCircle className="h-3 w-3" />
                                            )}
                                        </motion.div>
                                    ))}
                                </div>
                            </div>

                            {result.winner && (
                                <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                                    <div className="flex items-center gap-2 font-medium">
                                        <Trophy className="h-4 w-4" /> Winner
                                    </div>
                                    <div className="mt-1 font-mono text-xs">
                                        userId: {result.winner.userId} · token:{" "}
                                        {result.winner.lockToken?.slice(0, 8)}…
                                    </div>
                                </div>
                            )}
                            <p className="mt-4 text-xs leading-relaxed text-slate-500">
                                Out of <span className="font-mono">{result.totalAttempts}</span>{" "}
                                concurrent attempts, exactly{" "}
                                <span className="font-mono text-green-700">
                                    {result.successCount}
                                </span>{" "}
                                user acquired the lock. The other{" "}
                                <span className="font-mono text-red-700">
                                    {result.failedCount}
                                </span>{" "}
                                were atomically rejected by Redis. This is the proof of
                                correctness Eves promises.
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function ResultStat({ icon, label, value, tone }) {
    return (
        <div className="rounded-md border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-slate-500">
                {icon}
                <span className="font-mono text-[10px] uppercase tracking-widest">
                    {label}
                </span>
            </div>
            <div className={`mt-2 font-mono text-3xl font-semibold ${tone}`}>
                {value}
            </div>
        </div>
    );
}
