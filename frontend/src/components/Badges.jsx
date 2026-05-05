import React from "react";

export function StatusBadge({ status, size = "sm", className = "" }) {
    const map = {
        AVAILABLE: "bg-green-50 text-green-700 ring-1 ring-green-200",
        LOCKED: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-300",
        BOOKED: "bg-red-50 text-red-700 ring-1 ring-red-200",
        SUCCESS: "bg-green-50 text-green-700 ring-1 ring-green-200",
        FAILED: "bg-red-50 text-red-700 ring-1 ring-red-200",
        TIMEOUT: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
        PENDING: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
        CONFIRMED: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
        CANCELLED: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
        ACTIVE: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
        EXPIRED: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
    };
    const sizes = {
        xs: "text-[10px] px-1.5 py-0.5",
        sm: "text-[11px] px-2 py-0.5",
        md: "text-xs px-2.5 py-1",
    };
    const cls = map[status] || "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
    return (
        <span
            className={`inline-flex items-center rounded-md font-mono font-medium uppercase tracking-widest ${cls} ${sizes[size]} ${className}`}
        >
            {status}
        </span>
    );
}

export function EventTypeBadge({ type }) {
    const map = {
        TRAIN: "bg-sky-50 text-sky-700 ring-sky-200",
        BUS: "bg-emerald-50 text-emerald-700 ring-emerald-200",
        CINEMA: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200",
        EVENT: "bg-amber-50 text-amber-700 ring-amber-200",
        STADIUM: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    };
    return (
        <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-widest ring-1 ${map[type] || "bg-slate-100 text-slate-700 ring-slate-200"}`}
        >
            {type}
        </span>
    );
}
