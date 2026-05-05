import React, { useEffect, useState } from "react";

/**
 * Display a live MM:SS countdown until `expiresAt`.
 * Calls `onExpire` once when the timer hits 0.
 */
export default function CountdownTimer({
    expiresAt,
    onExpire,
    className = "",
    label = "Time remaining",
    testid = "countdown",
}) {
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 500);
        return () => clearInterval(id);
    }, []);

    const target = expiresAt ? new Date(expiresAt).getTime() : 0;
    const diff = Math.max(0, target - now);
    const seconds = Math.floor(diff / 1000);
    const m = Math.floor(seconds / 60)
        .toString()
        .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");

    useEffect(() => {
        if (target && diff <= 0 && onExpire) onExpire();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [diff <= 0]);

    const danger = seconds <= 30;

    return (
        <div
            data-testid={testid}
            className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1 font-mono text-sm tracking-tight ${
                danger
                    ? "border-red-300 bg-red-50 text-red-700"
                    : "border-purple-300 bg-purple-50 text-purple-700"
            } ${className}`}
        >
            <span className="text-[10px] uppercase tracking-[0.2em] opacity-80">
                {label}
            </span>
            <span className="text-base font-semibold">
                {m}:{s}
            </span>
        </div>
    );
}
