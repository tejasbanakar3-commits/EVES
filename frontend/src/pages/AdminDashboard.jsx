import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { extractError } from "../lib/api";
import { StatusBadge } from "../components/Badges";
import {
    Activity,
    AlertTriangle,
    BarChart2,
    Database,
    Loader2,
    LockKeyhole,
    Play,
    RefreshCw,
    RotateCcw,
    ServerCrash,
    Ticket,
    Wrench,
} from "lucide-react";

function fmtTime(d) {
    return new Date(d).toLocaleTimeString();
}

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [locks, setLocks] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [recovery, setRecovery] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [toast, setToast] = useState("");
    const [busy, setBusy] = useState("");

    const fetchAll = useCallback(async () => {
        try {
            const [d, l, b, r] = await Promise.all([
                api.get("/admin/dashboard"),
                api.get("/admin/active-locks"),
                api.get("/admin/bookings?limit=10"),
                api.get("/recovery/logs?limit=10"),
            ]);
            setStats(d.data.data);
            setLocks(l.data.data);
            setBookings(b.data.data.bookings);
            setRecovery(r.data.data.logs);
            setError("");
        } catch (err) {
            setError(extractError(err, "Could not load dashboard"));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
        const id = setInterval(fetchAll, 5000);
        return () => clearInterval(id);
    }, [fetchAll]);

    const flash = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(""), 2500);
    };

    const action = async (key, cb) => {
        setBusy(key);
        try {
            await cb();
            await fetchAll();
        } catch (err) {
            setError(extractError(err, "Action failed"));
        } finally {
            setBusy("");
        }
    };

    const runRecovery = () =>
        action("recovery", async () => {
            const r = await api.post("/recovery/run");
            const stats = r.data.data;
            flash(
                `Recovery: scanned ${stats.scanned} · recovered ${stats.recovered} · skipped ${stats.skipped}`
            );
        });

    const resetDemo = () =>
        action("reset", async () => {
            await api.post("/admin/reset-demo");
            flash("Demo data reset successfully.");
        });

    if (loading && !stats) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center text-slate-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading admin console…
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
                <div>
                    <span className="label-eyebrow">Operations</span>
                    <h1 className="mt-2 font-display text-4xl font-medium tracking-tight text-slate-900 md:text-5xl">
                        Admin console
                    </h1>
                    <p className="mt-2 text-slate-500">
                        Polled live every 5 seconds · Redis + Postgres reconciled by
                        the recovery worker.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        data-testid="admin-refresh-btn"
                        onClick={fetchAll}
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                        <RefreshCw className="h-3.5 w-3.5" /> Refresh
                    </button>
                    <button
                        data-testid="admin-run-recovery-btn"
                        disabled={busy === "recovery"}
                        onClick={runRecovery}
                        className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                        {busy === "recovery" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Wrench className="h-3.5 w-3.5" />
                        )}
                        Run recovery
                    </button>
                    <button
                        data-testid="admin-reset-demo-btn"
                        disabled={busy === "reset"}
                        onClick={resetDemo}
                        className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100 disabled:opacity-60"
                    >
                        {busy === "reset" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        Reset demo
                    </button>
                    <Link
                        to="/admin/simulation"
                        data-testid="admin-go-race-btn"
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-900 bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                    >
                        <Play className="h-3.5 w-3.5" /> Race test
                    </Link>
                </div>
            </div>

            {toast && (
                <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                    {toast}
                </div>
            )}
            {error && (
                <div
                    data-testid="admin-error"
                    className="mt-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                </div>
            )}

            {/* KPI cards */}
            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
                <KpiCard label="Events" value={stats?.totalEvents} icon={<Activity className="h-4 w-4" />} />
                <KpiCard label="Total seats" value={stats?.totalSeats} icon={<Database className="h-4 w-4" />} />
                <KpiCard label="Available" value={stats?.availableSeats} tone="green" icon={<Database className="h-4 w-4" />} />
                <KpiCard label="Locked" value={stats?.lockedSeats} tone="yellow" icon={<LockKeyhole className="h-4 w-4" />} />
                <KpiCard label="Booked" value={stats?.bookedSeats} tone="red" icon={<Ticket className="h-4 w-4" />} />
                <KpiCard label="Active locks (Redis)" value={stats?.activeLocksCount} tone="purple" icon={<LockKeyhole className="h-4 w-4" />} />
                <KpiCard label="Confirmed bookings" value={stats?.totalBookings} tone="blue" icon={<Ticket className="h-4 w-4" />} />
                <KpiCard label="Recoveries" value={stats?.totalRecoveries} tone="amber" icon={<Wrench className="h-4 w-4" />} />
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-2">
                {/* Active locks */}
                <Panel title="Active locks" icon={<LockKeyhole className="h-4 w-4" />}>
                    {locks.length === 0 ? (
                        <Empty label="No active locks. The grid is calm." />
                    ) : (
                        <Table
                            head={["Event", "Seat", "User", "TTL"]}
                            rows={locks.map((l) => ({
                                id: l.id,
                                cells: [
                                    l.event?.title,
                                    <span className="font-mono">{l.seat?.seatNumber}</span>,
                                    l.user?.email,
                                    <span className={`font-mono ${l.remainingTtl < 30 ? "text-red-600" : "text-slate-700"}`}>
                                        {l.remainingTtl}s
                                    </span>,
                                ],
                            }))}
                        />
                    )}
                </Panel>

                {/* Recovery logs */}
                <Panel title="Recovery log" icon={<Wrench className="h-4 w-4" />}>
                    {recovery.length === 0 ? (
                        <Empty label="No recoveries yet. Trigger a 'Simulate Crash' from the payment page to see one." />
                    ) : (
                        <Table
                            head={["When", "Seat", "Reason", "Status"]}
                            rows={recovery.map((r) => ({
                                id: r.id,
                                cells: [
                                    <span className="font-mono text-xs text-slate-500">{fmtTime(r.recoveredAt)}</span>,
                                    <span className="font-mono">{r.seat?.seatNumber || "—"}</span>,
                                    <span className="font-mono text-[10px] uppercase tracking-widest">
                                        {r.reason}
                                    </span>,
                                    <StatusBadge status={r.recoveryStatus} size="xs" />,
                                ],
                            }))}
                        />
                    )}
                </Panel>
            </div>

            {/* Recent bookings */}
            <div className="mt-6">
                <Panel
                    title="Recent bookings"
                    icon={<BarChart2 className="h-4 w-4" />}
                >
                    {bookings.length === 0 ? (
                        <Empty label="No bookings yet." />
                    ) : (
                        <Table
                            head={["Code", "User", "Event", "Seat", "Booking", "Payment"]}
                            rows={bookings.map((b) => ({
                                id: b.id,
                                cells: [
                                    <span className="font-mono">{b.bookingCode}</span>,
                                    b.user?.email,
                                    b.event?.title,
                                    <span className="font-mono">{b.seat?.seatNumber}</span>,
                                    <StatusBadge status={b.bookingStatus} size="xs" />,
                                    <StatusBadge status={b.paymentStatus} size="xs" />,
                                ],
                            }))}
                        />
                    )}
                </Panel>
            </div>
        </div>
    );
}

function KpiCard({ label, value, tone, icon }) {
    const tones = {
        green: "text-green-700",
        yellow: "text-yellow-700",
        red: "text-red-700",
        blue: "text-blue-700",
        purple: "text-purple-700",
        amber: "text-amber-700",
    };
    return (
        <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 text-slate-500">
                {icon}
                <span className="font-mono text-[10px] uppercase tracking-widest">
                    {label}
                </span>
            </div>
            <div
                className={`font-mono text-3xl font-semibold tracking-tight ${tones[tone] || "text-slate-900"}`}
            >
                {value ?? "—"}
            </div>
        </div>
    );
}

function Panel({ title, icon, children }) {
    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                <div className="flex items-center gap-2 font-display text-sm font-medium text-slate-900">
                    {icon}
                    {title}
                </div>
            </div>
            <div className="p-3 md:p-5">{children}</div>
        </div>
    );
}

function Empty({ label }) {
    return (
        <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            {label}
        </div>
    );
}

function Table({ head, rows }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="text-[10px] uppercase tracking-widest text-slate-500">
                        {head.map((h) => (
                            <th key={h} className="px-3 py-2 font-medium">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {rows.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50">
                            {row.cells.map((cell, j) => (
                                <td
                                    key={`${row.id}-${j}`}
                                    className="px-3 py-2 align-middle text-slate-700"
                                >
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
