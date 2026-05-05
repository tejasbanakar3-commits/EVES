import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { extractError } from "../lib/api";
import { AlertCircle, ArrowRight, Loader2, Lock, Mail } from "lucide-react";

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const onSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const user = await login(email.trim().toLowerCase(), password);
            const next = location.state?.from?.pathname || "/events";
            navigate(user.role === "ADMIN" ? next || "/admin" : next, {
                replace: true,
            });
        } catch (err) {
            setError(extractError(err, "Could not sign in"));
        } finally {
            setLoading(false);
        }
    };

    const fillDemo = (e, who) => {
        e.preventDefault();
        if (who === "admin") {
            setEmail("admin@eves.io");
            setPassword("admin123");
        } else {
            setEmail("user@eves.io");
            setPassword("user123");
        }
    };

    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-50 px-4 py-16">
            <div className="w-full max-w-md">
                <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
                    <div className="mb-8">
                        <span className="label-eyebrow">Welcome back</span>
                        <h1 className="mt-2 font-display text-3xl font-medium tracking-tight text-slate-900">
                            Sign in to Eves
                        </h1>
                        <p className="mt-2 text-sm text-slate-500">
                            Use the demo accounts below to skip ahead.
                        </p>
                    </div>

                    {error && (
                        <div
                            data-testid="login-error"
                            className="mb-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                        >
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={onSubmit} className="space-y-4">
                        <div>
                            <label className="label-eyebrow mb-1.5 block">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    data-testid="login-email-input"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="w-full rounded-md border border-slate-200 bg-white px-9 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="label-eyebrow mb-1.5 block">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    data-testid="login-password-input"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    placeholder="Your password"
                                    className="w-full rounded-md border border-slate-200 bg-white px-9 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                />
                            </div>
                        </div>

                        <button
                            data-testid="login-submit-btn"
                            type="submit"
                            disabled={loading}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    Sign in
                                    <ArrowRight className="h-4 w-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 flex flex-col gap-2 rounded-md border border-dashed border-slate-200 bg-slate-50 p-3 text-xs">
                        <span className="font-mono uppercase tracking-widest text-slate-500">
                            Demo credentials
                        </span>
                        <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-slate-700">
                                admin@eves.io / admin123
                            </span>
                            <button
                                data-testid="use-admin-demo-btn"
                                onClick={(e) => fillDemo(e, "admin")}
                                className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600 hover:text-slate-900"
                            >
                                use
                            </button>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-slate-700">
                                user@eves.io / user123
                            </span>
                            <button
                                data-testid="use-user-demo-btn"
                                onClick={(e) => fillDemo(e, "user")}
                                className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600 hover:text-slate-900"
                            >
                                use
                            </button>
                        </div>
                    </div>

                    <p className="mt-6 text-center text-sm text-slate-500">
                        New to Eves?{" "}
                        <Link
                            to="/register"
                            className="font-medium text-blue-600 hover:underline"
                            data-testid="login-to-register-link"
                        >
                            Create an account
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
