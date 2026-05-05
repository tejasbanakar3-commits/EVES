import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api, { extractError } from "../lib/api";
import { ImportSidebar } from "./CreateEvent";
import {
    AlertTriangle,
    ArrowLeft,
    Loader2,
    Upload,
    Wand2,
} from "lucide-react";

const SAMPLE = `[
  {
    "eventId": "<paste-an-eventId>",
    "seatId":  "<paste-a-seatId>",
    "userEmail": "user@eves.io",
    "amount": 500
  }
]`;

export default function ImportBookings() {
    const fileRef = useRef(null);
    const [text, setText] = useState(SAMPLE);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [result, setResult] = useState(null);
    const [events, setEvents] = useState([]);
    const [picker, setPicker] = useState({ eventId: "", seats: [] });

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const res = await api.get("/events");
                if (active) {
                    setEvents(res.data.data);
                    if (res.data.data[0]) {
                        setPicker((p) => ({ ...p, eventId: res.data.data[0].id }));
                    }
                }
            } catch (err) {
                if (active) setError(extractError(err));
            }
        })();
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!picker.eventId) return;
        let active = true;
        (async () => {
            try {
                const res = await api.get(`/events/${picker.eventId}/seats`);
                if (active) {
                    setPicker((p) => ({
                        ...p,
                        seats: res.data.data.seats.filter((s) => s.status === "AVAILABLE").slice(0, 10),
                    }));
                }
            } catch {
                /* ignore */
            }
        })();
        return () => {
            active = false;
        };
    }, [picker.eventId]);

    const onFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const content = await file.text();
        setText(content);
    };

    const generateSample = () => {
        const seats = picker.seats.slice(0, 3);
        const sample = seats.map((s) => ({
            eventId: picker.eventId,
            seatId: s.id,
            userEmail: "user@eves.io",
            amount: 500,
        }));
        setText(JSON.stringify(sample, null, 2));
    };

    const submit = async () => {
        setError("");
        setResult(null);
        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch (err) {
            setError("Could not parse JSON: " + err.message);
            return;
        }
        if (!Array.isArray(parsed)) {
            setError("Top-level value must be an array of bookings.");
            return;
        }
        setBusy(true);
        try {
            const res = await api.post("/admin/bookings/import", parsed);
            setResult(res.data.data);
        } catch (err) {
            setError(extractError(err, "Import failed"));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="mx-auto max-w-6xl px-4 py-10 md:px-8 md:py-16">
            <Link
                to="/admin"
                data-testid="import-back-link"
                className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
            >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to admin
            </Link>

            <div className="mt-4 flex flex-col gap-2">
                <span className="label-eyebrow">Bulk operations</span>
                <h1 className="font-display text-4xl font-medium tracking-tight text-slate-900 md:text-5xl">
                    Import bookings
                </h1>
                <p className="max-w-2xl text-slate-500">
                    Upload a JSON array of booking instructions to confirm seats in
                    bulk. Each row uses the same row-locked Postgres path the live
                    booking flow does, so concurrent imports stay safe.
                </p>
            </div>

            <div className="mt-8 grid gap-4 rounded-xl border border-slate-200 bg-white p-6 md:grid-cols-[1fr_320px] md:p-8">
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="label-eyebrow">JSON payload</span>
                        <div className="flex gap-2">
                            <button
                                data-testid="import-bookings-sample-btn"
                                onClick={generateSample}
                                disabled={!picker.seats.length}
                                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                                <Wand2 className="h-3 w-3" /> Fill sample
                            </button>
                            <button
                                data-testid="import-bookings-file-btn"
                                onClick={() => fileRef.current?.click()}
                                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50"
                            >
                                <Upload className="h-3 w-3" /> Pick file
                            </button>
                            <input
                                ref={fileRef}
                                type="file"
                                accept="application/json,.json"
                                onChange={onFile}
                                className="hidden"
                                data-testid="import-bookings-file-input"
                            />
                        </div>
                    </div>

                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                            Helper · pick an event to grab real seat ids
                        </span>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <select
                                data-testid="import-bookings-event-select"
                                value={picker.eventId}
                                onChange={(e) => setPicker({ eventId: e.target.value, seats: [] })}
                                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                            >
                                {events.map((ev) => (
                                    <option key={ev.id} value={ev.id}>
                                        {ev.title}
                                    </option>
                                ))}
                            </select>
                            <span className="font-mono text-[10px] text-slate-500">
                                {picker.seats.length} available seats listed above (showing first 10)
                            </span>
                        </div>
                    </div>

                    <textarea
                        data-testid="import-bookings-textarea"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        spellCheck={false}
                        className="h-80 w-full rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />

                    <button
                        data-testid="import-bookings-submit-btn"
                        onClick={submit}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                        {busy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Upload className="h-4 w-4" />
                        )}
                        Import bookings
                    </button>

                    {error && (
                        <div
                            data-testid="import-bookings-error"
                            className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                        >
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}
                </div>

                <ImportSidebar
                    schema={`[\n  { eventId, seatId,\n    userEmail (must exist),\n    amount: > 0 }\n]`}
                    result={result}
                    kind="booking"
                />
            </div>
        </div>
    );
}
