import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { extractError } from "../lib/api";
import { EventTypeBadge, StatusBadge } from "../components/Badges";
import {
    AlertTriangle,
    ArrowLeft,
    Calendar,
    Hash,
    Loader2,
    MapPin,
    QrCode,
    Receipt,
} from "lucide-react";

const TICKET_TEXTURE =
    "https://static.prod-images.emergentagent.com/jobs/30fbe795-f7e8-4aab-adda-3d2a2945c1a4/images/88dfd69f2b75ce625704957942f8130903eb360331eb7f1b049d6a3cd9e04fcd.png";

export default function BookingDetail() {
    const { bookingId } = useParams();
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const res = await api.get(`/bookings/${bookingId}`);
                if (active) setBooking(res.data.data);
            } catch (err) {
                if (active) setError(extractError(err, "Could not load booking"));
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => {
            active = false;
        };
    }, [bookingId]);

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center text-slate-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
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
                    to="/bookings"
                    className="mt-4 inline-flex items-center gap-1 text-sm text-red-700 underline"
                >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to bookings
                </Link>
            </div>
        );
    }

    const isConfirmed = booking.bookingStatus === "CONFIRMED";

    return (
        <div className="mx-auto max-w-5xl px-4 py-10 md:px-8 md:py-16">
            <Link
                to="/bookings"
                data-testid="booking-back-link"
                className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
            >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to bookings
            </Link>

            <div
                data-testid="ticket-card"
                className="mt-6 grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.06)] md:grid-cols-[1fr_auto_320px]"
            >
                {/* Left: Event details */}
                <div className="relative p-6 md:p-10">
                    <div
                        aria-hidden
                        style={{ backgroundImage: `url(${TICKET_TEXTURE})` }}
                        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.06] mix-blend-multiply"
                    />
                    <div className="relative">
                        <div className="flex items-center gap-2">
                            <EventTypeBadge type={booking.event?.type} />
                            <StatusBadge status={booking.bookingStatus} />
                            <StatusBadge status={booking.paymentStatus} size="xs" />
                        </div>

                        <h1 className="mt-4 font-display text-3xl font-medium tracking-tight text-slate-900 md:text-4xl">
                            {booking.event?.title}
                        </h1>

                        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                            <Field
                                label="Date"
                                value={new Date(booking.event?.eventDate).toLocaleString()}
                                icon={<Calendar className="h-3.5 w-3.5" />}
                            />
                            <Field
                                label={
                                    booking.event?.source ? "Route" : "Venue"
                                }
                                value={
                                    booking.event?.source && booking.event?.destination
                                        ? `${booking.event.source} → ${booking.event.destination}`
                                        : booking.event?.venue
                                }
                                icon={<MapPin className="h-3.5 w-3.5" />}
                            />
                            <Field
                                label="Booking code"
                                mono
                                value={booking.bookingCode}
                                icon={<Hash className="h-3.5 w-3.5" />}
                            />
                            <Field
                                label="Amount"
                                mono
                                value={`₹ ${Number(booking.amount).toFixed(2)}`}
                                icon={<Receipt className="h-3.5 w-3.5" />}
                            />
                        </div>

                        {booking.payments && booking.payments.length > 0 && (
                            <div className="mt-8">
                                <span className="label-eyebrow">
                                    Payment trail
                                </span>
                                <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 text-[11px] uppercase tracking-widest text-slate-500">
                                            <tr>
                                                <th className="px-3 py-2 font-medium">When</th>
                                                <th className="px-3 py-2 font-medium">Type</th>
                                                <th className="px-3 py-2 font-medium">Status</th>
                                                <th className="px-3 py-2 font-medium text-right">
                                                    Amount
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {booking.payments.map((p) => (
                                                <tr key={p.id} className="bg-white">
                                                    <td className="px-3 py-2 font-mono text-xs text-slate-500">
                                                        {new Date(p.createdAt).toLocaleString()}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <span className="font-mono text-[11px] uppercase tracking-widest text-slate-700">
                                                            {p.simulationType}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <StatusBadge status={p.status} size="xs" />
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-mono text-slate-700">
                                                        ₹ {Number(p.amount).toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Perforation */}
                <div className="hidden w-px bg-slate-100 ticket-perforation md:block" />
                <div className="block h-px ticket-perforation-h bg-slate-100 md:hidden" />

                {/* Right stub: Seat + QR */}
                <div className="flex flex-col justify-between gap-6 bg-slate-50 p-6 md:p-8">
                    <div>
                        <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                            Seat
                        </div>
                        <div className="mt-1 font-display text-6xl font-semibold tracking-tight text-slate-900">
                            {booking.seat?.seatNumber}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                            Row {booking.seat?.rowLabel} · Col {booking.seat?.columnNumber}
                        </div>
                    </div>

                    <div
                        data-testid="ticket-qr"
                        className="flex aspect-square w-full items-center justify-center rounded-md border border-dashed border-slate-300 bg-white text-slate-400"
                    >
                        <div className="flex flex-col items-center gap-2">
                            <QrCode className="h-16 w-16" />
                            <span className="font-mono text-[10px] uppercase tracking-widest">
                                {booking.bookingCode}
                            </span>
                        </div>
                    </div>

                    <div className="rounded-md border border-slate-200 bg-white p-3 text-center">
                        <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                            Status
                        </div>
                        <div
                            className={`mt-1 font-display text-lg font-medium ${
                                isConfirmed ? "text-blue-600" : "text-slate-500"
                            }`}
                        >
                            {isConfirmed ? "Confirmed" : booking.bookingStatus}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Field({ label, value, mono, icon }) {
    return (
        <div>
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-slate-500">
                {icon}
                {label}
            </div>
            <div
                className={`mt-1 ${mono ? "font-mono" : "font-display"} text-base text-slate-900`}
            >
                {value || "—"}
            </div>
        </div>
    );
}
