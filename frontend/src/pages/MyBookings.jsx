import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { extractError } from "../lib/api";
import { EventTypeBadge, StatusBadge } from "../components/Badges";
import { Calendar, Loader2, Ticket, ArrowRight } from "lucide-react";

export default function MyBookings() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const res = await api.get("/bookings/my");
                if (active) setBookings(res.data.data);
            } catch (err) {
                if (active) setError(extractError(err, "Could not load bookings"));
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => {
            active = false;
        };
    }, []);

    return (
        <div className="mx-auto max-w-6xl px-4 py-10 md:px-8 md:py-16">
            <span className="label-eyebrow">Reservations</span>
            <h1 className="mt-2 font-display text-4xl font-medium tracking-tight text-slate-900 md:text-5xl">
                My bookings
            </h1>
            <p className="mt-2 text-slate-500">
                Tickets and attempted payments are kept here for the demo.
            </p>

            {loading && (
                <div className="mt-12 flex items-center gap-2 text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
            )}
            {error && (
                <div
                    data-testid="bookings-error"
                    className="mt-8 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                    {error}
                </div>
            )}

            {!loading && !error && bookings.length === 0 && (
                <div className="mt-12 rounded-md border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
                    You haven't booked anything yet.{" "}
                    <Link
                        to="/events"
                        className="font-medium text-blue-600 underline"
                    >
                        Browse events
                    </Link>
                    .
                </div>
            )}

            <div
                data-testid="bookings-list"
                className="mt-8 grid grid-cols-1 gap-4"
            >
                {bookings.map((b) => (
                    <Link
                        key={b.id}
                        to={`/bookings/${b.id}`}
                        data-testid={`booking-row-${b.id}`}
                        className="group grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-md md:grid-cols-12 md:items-center"
                    >
                        <div className="flex items-center gap-3 md:col-span-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                                <Ticket className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="font-mono text-[11px] uppercase tracking-widest text-slate-500">
                                    Booking code
                                </div>
                                <div className="font-mono text-base font-semibold tracking-tight text-slate-900">
                                    {b.bookingCode}
                                </div>
                            </div>
                        </div>
                        <div className="md:col-span-4">
                            <div className="flex items-center gap-2">
                                <EventTypeBadge type={b.event?.type} />
                                <span className="font-display text-base font-medium text-slate-900">
                                    {b.event?.title}
                                </span>
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                                <Calendar className="h-3 w-3" />
                                {new Date(b.event?.eventDate).toLocaleString()}
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <div className="font-mono text-[11px] uppercase tracking-widest text-slate-500">
                                Seat
                            </div>
                            <div className="font-mono text-base text-slate-900">
                                {b.seat?.seatNumber}
                            </div>
                        </div>
                        <div className="flex items-center justify-between md:col-span-2 md:justify-end">
                            <div className="flex flex-col items-end gap-1">
                                <StatusBadge status={b.bookingStatus} />
                                <StatusBadge status={b.paymentStatus} size="xs" />
                            </div>
                            <ArrowRight className="ml-3 h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-700" />
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
