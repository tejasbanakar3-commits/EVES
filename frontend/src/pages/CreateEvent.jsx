import React, { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api, { extractError } from "../lib/api";
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Loader2,
    Upload,
    XCircle,
    FileJson,
    Sparkles,
} from "lucide-react";

const TYPES = [
    { value: "TRAIN", label: "Train" },
    { value: "BUS", label: "Bus" },
    { value: "CINEMA", label: "Cinema" },
    { value: "EVENT", label: "Live event" },
    { value: "STADIUM", label: "Stadium" },
];

const NEEDS_ROUTE = new Set(["TRAIN", "BUS"]);

const SAMPLE_IMPORT = JSON.stringify(
    [
        {
            title: "Sunday Symphony",
            type: "EVENT",
            venue: "Royal Opera House",
            eventDate: "2026-08-12T19:30:00Z",
            rows: 8,
            columns: 12,
        },
        {
            title: "Bangalore → Chennai Express",
            type: "TRAIN",
            source: "Bangalore",
            destination: "Chennai",
            eventDate: "2026-08-15T06:00:00Z",
            rows: 10,
            columns: 6,
        },
    ],
    null,
    2
);

export default function CreateEvent() {
    const navigate = useNavigate();
    const [tab, setTab] = useState("manual"); // manual | import
    return (
        <div className="mx-auto max-w-5xl px-4 py-10 md:px-8 md:py-16">
            <Link
                to="/events"
                data-testid="create-back-link"
                className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
            >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to events
            </Link>

            <div className="mt-4 flex flex-col gap-2">
                <span className="label-eyebrow">Bring your own</span>
                <h1 className="font-display text-4xl font-medium tracking-tight text-slate-900 md:text-5xl">
                    Create or import events
                </h1>
                <p className="max-w-2xl text-slate-500">
                    Anyone with an account can list a new event on Eves. Use the form for
                    a single event, or paste a JSON file to add many at once. Seats are
                    generated automatically.
                </p>
            </div>

            <div className="mt-8 inline-flex rounded-md border border-slate-200 bg-white p-1">
                {[
                    { k: "manual", label: "New event", icon: <Sparkles className="h-3.5 w-3.5" /> },
                    { k: "import", label: "Import JSON", icon: <FileJson className="h-3.5 w-3.5" /> },
                ].map((t) => (
                    <button
                        key={t.k}
                        data-testid={`create-tab-${t.k}`}
                        onClick={() => setTab(t.k)}
                        className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                            tab === t.k
                                ? "bg-slate-900 text-white"
                                : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        {t.icon}
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="mt-6">
                {tab === "manual" ? (
                    <ManualForm onCreated={(ev) => navigate(`/events/${ev.id}`)} />
                ) : (
                    <ImportPanel />
                )}
            </div>
        </div>
    );
}

function ManualForm({ onCreated }) {
    const [form, setForm] = useState({
        title: "",
        type: "CINEMA",
        source: "",
        destination: "",
        venue: "",
        eventDate: defaultDate(),
        rows: 8,
        columns: 10,
    });
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const set = (k) => (e) =>
        setForm({ ...form, [k]: e.target?.value ?? e });

    const totalSeats = Math.max(0, Number(form.rows) || 0) * Math.max(0, Number(form.columns) || 0);

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        if (!form.title.trim()) return setError("Title is required");
        if (totalSeats < 1) return setError("Rows × Columns must be at least 1");
        const payload = {
            title: form.title.trim(),
            type: form.type,
            eventDate: new Date(form.eventDate).toISOString(),
            rows: Number(form.rows),
            columns: Number(form.columns),
            totalSeats,
        };
        if (NEEDS_ROUTE.has(form.type)) {
            if (!form.source.trim() || !form.destination.trim()) {
                return setError("Source and destination are required for trains and buses");
            }
            payload.source = form.source.trim();
            payload.destination = form.destination.trim();
        } else {
            if (!form.venue.trim())
                return setError("Venue is required for this event type");
            payload.venue = form.venue.trim();
        }

        setSubmitting(true);
        try {
            const res = await api.post("/events", payload);
            onCreated(res.data.data);
        } catch (err) {
            setError(extractError(err, "Could not create event"));
        } finally {
            setSubmitting(false);
        }
    };

    const showRoute = NEEDS_ROUTE.has(form.type);

    return (
        <form
            onSubmit={submit}
            data-testid="create-event-form"
            className="grid gap-6 rounded-xl border border-slate-200 bg-white p-6 md:grid-cols-2 md:p-8"
        >
            <Field label="Event title" testid="create-title-input">
                <input
                    required
                    data-testid="create-title-input"
                    value={form.title}
                    onChange={set("title")}
                    placeholder="e.g. Coldplay World Tour"
                    className={inputCls}
                />
            </Field>

            <Field label="Type">
                <select
                    data-testid="create-type-select"
                    value={form.type}
                    onChange={set("type")}
                    className={inputCls}
                >
                    {TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                            {t.label}
                        </option>
                    ))}
                </select>
            </Field>

            {showRoute ? (
                <>
                    <Field label="Source">
                        <input
                            required
                            data-testid="create-source-input"
                            value={form.source}
                            onChange={set("source")}
                            placeholder="Mumbai Central"
                            className={inputCls}
                        />
                    </Field>
                    <Field label="Destination">
                        <input
                            required
                            data-testid="create-destination-input"
                            value={form.destination}
                            onChange={set("destination")}
                            placeholder="New Delhi"
                            className={inputCls}
                        />
                    </Field>
                </>
            ) : (
                <Field label="Venue" className="md:col-span-2">
                    <input
                        required
                        data-testid="create-venue-input"
                        value={form.venue}
                        onChange={set("venue")}
                        placeholder="Wankhede Stadium"
                        className={inputCls}
                    />
                </Field>
            )}

            <Field label="Date & time">
                <input
                    type="datetime-local"
                    required
                    data-testid="create-date-input"
                    value={form.eventDate}
                    onChange={set("eventDate")}
                    className={inputCls}
                />
            </Field>

            <Field label="Rows × Columns" className="grid grid-cols-2 gap-2">
                <input
                    type="number"
                    min={1}
                    max={50}
                    required
                    data-testid="create-rows-input"
                    value={form.rows}
                    onChange={set("rows")}
                    className={`${inputCls} font-mono`}
                />
                <input
                    type="number"
                    min={1}
                    max={50}
                    required
                    data-testid="create-cols-input"
                    value={form.columns}
                    onChange={set("columns")}
                    className={`${inputCls} font-mono`}
                />
            </Field>

            <div className="md:col-span-2 flex flex-col gap-3">
                <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                    <span className="font-mono uppercase tracking-widest text-slate-500 text-[11px]">
                        Total seats to be generated
                    </span>
                    <span className="font-mono text-base font-semibold text-slate-900">
                        {totalSeats}
                    </span>
                </div>

                {error && (
                    <div
                        data-testid="create-error"
                        className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                    >
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        {error}
                    </div>
                )}

                <button
                    data-testid="create-submit-btn"
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                >
                    {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <>
                            Create event
                            <ArrowRight className="h-4 w-4" />
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}

function ImportPanel() {
    const fileRef = useRef(null);
    const [text, setText] = useState(SAMPLE_IMPORT);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [result, setResult] = useState(null);

    const onFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const content = await file.text();
        setText(content);
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
            setError("Top-level value must be an array of events.");
            return;
        }
        setBusy(true);
        try {
            const res = await api.post("/events/import", parsed);
            setResult(res.data.data);
        } catch (err) {
            setError(extractError(err, "Import failed"));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div
            data-testid="import-events-panel"
            className="grid gap-4 rounded-xl border border-slate-200 bg-white p-6 md:grid-cols-[1fr_320px] md:p-8"
        >
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <span className="label-eyebrow">JSON payload</span>
                    <div className="flex gap-2">
                        <button
                            data-testid="import-file-btn"
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
                            data-testid="import-file-input"
                        />
                    </div>
                </div>
                <textarea
                    data-testid="import-events-textarea"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    spellCheck={false}
                    className="h-80 w-full rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <button
                    data-testid="import-events-submit-btn"
                    onClick={submit}
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Import events
                </button>
                {error && (
                    <div
                        data-testid="import-events-error"
                        className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                    >
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        {error}
                    </div>
                )}
            </div>

            <ImportSidebar
                schema={`[\n  { title, type: TRAIN|BUS|CINEMA|EVENT|STADIUM,\n    source?, destination?, venue?,\n    eventDate (ISO),\n    rows: 1..50, columns: 1..50 }\n]`}
                result={result}
                kind="event"
            />
        </div>
    );
}

function ImportSidebar({ schema, result, kind }) {
    return (
        <aside className="flex flex-col gap-4">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <span className="label-eyebrow">Required schema</span>
                <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-700">
                    {schema}
                </pre>
            </div>

            {result ? (
                <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    data-testid={`import-${kind}-result`}
                    className="rounded-md border border-slate-200 bg-white p-4"
                >
                    <span className="label-eyebrow">Result</span>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                        <Stat label="Total" value={result.total} />
                        <Stat label="Imported" value={result.imported} tone="text-green-700" />
                        <Stat label="Failed" value={result.failed} tone="text-red-700" />
                    </div>
                    <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto">
                        {result.results.map((r) => (
                            <li
                                key={r.index}
                                className={`flex items-start gap-2 rounded px-2 py-1 text-xs ${
                                    r.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
                                }`}
                            >
                                {r.ok ? (
                                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                ) : (
                                    <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                )}
                                <span className="font-mono">#{r.index + 1}</span>
                                <span className="break-all">
                                    {r.ok
                                        ? `OK · ${r.eventId || r.bookingCode || "created"}`
                                        : r.error}
                                </span>
                            </li>
                        ))}
                    </ul>
                </motion.div>
            ) : (
                <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                    Upload or paste a JSON array, then click <span className="font-mono">Import</span>.
                    Invalid rows are reported individually.
                </div>
            )}
        </aside>
    );
}

function Field({ label, children, className = "" }) {
    return (
        <div className={className}>
            <label className="label-eyebrow mb-1.5 block">{label}</label>
            {children}
        </div>
    );
}

function Stat({ label, value, tone }) {
    return (
        <div className="rounded-md bg-slate-50 px-2 py-1.5">
            <div className={`font-mono text-lg font-semibold ${tone || "text-slate-900"}`}>
                {value}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">
                {label}
            </div>
        </div>
    );
}

const inputCls =
    "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";

function defaultDate() {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setMinutes(0, 0, 0);
    // toISOString gives UTC; trim to "YYYY-MM-DDTHH:mm" for datetime-local input
    return d.toISOString().slice(0, 16);
}

export { ImportSidebar }; // re-used in admin booking-import panel
