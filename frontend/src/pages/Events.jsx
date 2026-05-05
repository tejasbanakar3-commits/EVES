import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import api, { extractError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { EventTypeBadge } from "../components/Badges";
import {
    Building2,
    Calendar,
    Loader2,
    MapPin,
    Plus,
    Search,
    Train,
    Bus as BusIcon,
    Film,
    Trophy,
    PartyPopper,
    ArrowRight,
} from "lucide-react";

const TYPE_FILTERS = ["ALL", "TRAIN", "BUS", "CINEMA", "EVENT", "STADIUM"];

const TYPE_IMAGE = {
    TRAIN:
        "https://images.pexels.com/photos/34843209/pexels-photo-34843209.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    BUS:
        "https://images.unsplash.com/photo-1556122071-e404eaedb77f?auto=format&fit=crop&w=900&q=70",
    CINEMA:
        "https://images.unsplash.com/photo-1546708770-589dab7b22c7?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzl8MHwxfHNlYXJjaHwyfHxjb25jZXJ0JTIwY3Jvd2QlMjBsaXZlJTIwbXVzaWN8ZW58MHx8fHwxNzc3OTg1NzMzfDA&ixlib=rb-4.1.0&q=85",
    STADIUM:
        "https://images.unsplash.com/photo-1765130420876-9137faaf983d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzB8MHwxfHNlYXJjaHwzfHxtb2Rlcm4lMjBzdGFkaXVtJTIwYXJlbmF8ZW58MHx8fHwxNzc3OTg1NzMzfDA&ixlib=rb-4.1.0&q=85",
    EVENT:
        "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=70",
};

const TYPE_ICON = {
    TRAIN: Train,
    BUS: BusIcon,
    CINEMA: Film,
    EVENT: PartyPopper,
    STADIUM: Trophy,
};

function fmtDate(d) {
    try {
        return new Date(d).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return d;
    }
}

export default function Events() {
    const { isAuthenticated } = useAuth();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState("ALL");

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const res = await api.get("/events");
                if (active) setEvents(res.data.data);
            } catch (err) {
                if (active) setError(extractError(err, "Could not load events"));
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => {
            active = false;
        };
    }, []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return events.filter((e) => {
            if (filter !== "ALL" && e.type !== filter) return false;
            if (!q) return true;
            return (
                e.title.toLowerCase().includes(q) ||
                (e.source || "").toLowerCase().includes(q) ||
                (e.destination || "").toLowerCase().includes(q) ||
                (e.venue || "").toLowerCase().includes(q)
            );
        });
    }, [events, query, filter]);

    return (
        <div className="mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-16">
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
                <div>
                    <span className="label-eyebrow">Live inventory</span>
                    <h1 className="mt-2 font-display text-4xl font-medium tracking-tight text-slate-900 md:text-5xl">
                        Pick an event
                    </h1>
                    <p className="mt-2 max-w-xl text-slate-600">
                        Real-time seat counts. Lock a seat in one tab and watch it update
                        instantly in another.
                    </p>
                </div>
                <div className="flex w-full items-center gap-2 md:w-auto">
                    <div className="relative w-full md:w-80">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            data-testid="events-search-input"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search title, route or venue…"
                            className="w-full rounded-md border border-slate-200 bg-white px-9 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                    </div>
                    {isAuthenticated && (
                        <Link
                            to="/events/new"
                            data-testid="events-create-btn"
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            <Plus className="h-4 w-4" />
                            <span className="hidden sm:inline">New event</span>
                        </Link>
                    )}
                </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
                {TYPE_FILTERS.map((t) => (
                    <button
                        key={t}
                        onClick={() => setFilter(t)}
                        data-testid={`events-filter-${t.toLowerCase()}`}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium uppercase tracking-widest transition-colors ${
                            filter === t
                                ? "bg-slate-900 text-white"
                                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {loading && (
                <div
                    data-testid="events-loading"
                    className="mt-16 flex flex-col items-center justify-center gap-3 text-slate-500"
                >
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Loading events…</span>
                </div>
            )}

            {error && (
                <div
                    data-testid="events-error"
                    className="mt-8 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                    {error}
                </div>
            )}

            {!loading && !error && filtered.length === 0 && (
                <div className="mt-16 rounded-md border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
                    No events match your filters.
                </div>
            )}

            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((event, i) => {
                    const Icon = TYPE_ICON[event.type] || PartyPopper;
                    const totalSeats = event._count?.seats ?? event.totalSeats;
                    const booked = event._count?.bookings ?? 0;
                    const available = Math.max(0, totalSeats - booked);
                    return (
                        <motion.div
                            key={event.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.35, delay: i * 0.04 }}
                        >
                            <Link
                                to={`/events/${event.id}`}
                                data-testid={`event-card-${event.id}`}
                                className="group block overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.07)]"
                            >
                                <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
                                    <img
                                        src={TYPE_IMAGE[event.type] || TYPE_IMAGE.EVENT}
                                        alt={event.title}
                                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />
                                    <div className="absolute left-3 top-3">
                                        <EventTypeBadge type={event.type} />
                                    </div>
                                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                                        <div className="flex items-center gap-1.5 text-xs font-mono">
                                            <Icon className="h-3.5 w-3.5" />
                                            <span>{available} / {totalSeats} free</span>
                                        </div>
                                        <span className="rounded bg-white/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest backdrop-blur">
                                            Live
                                        </span>
                                    </div>
                                </div>
                                <div className="p-5">
                                    <h3 className="font-display text-lg font-medium tracking-tight text-slate-900 group-hover:text-blue-600">
                                        {event.title}
                                    </h3>
                                    <div className="mt-3 flex flex-col gap-1.5 text-sm text-slate-500">
                                        {event.source && event.destination ? (
                                            <span className="flex items-center gap-1.5">
                                                <MapPin className="h-3.5 w-3.5" />
                                                <span className="font-mono text-xs">
                                                    {event.source} → {event.destination}
                                                </span>
                                            </span>
                                        ) : event.venue ? (
                                            <span className="flex items-center gap-1.5">
                                                <Building2 className="h-3.5 w-3.5" />
                                                <span>{event.venue}</span>
                                            </span>
                                        ) : null}
                                        <span className="flex items-center gap-1.5">
                                            <Calendar className="h-3.5 w-3.5" />
                                            <span>{fmtDate(event.eventDate)}</span>
                                        </span>
                                    </div>
                                    <div className="mt-4 flex items-center justify-between">
                                        <span className="font-mono text-xs uppercase tracking-widest text-slate-400">
                                            {event.rows}×{event.columns} grid
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600">
                                            Select seats
                                            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
