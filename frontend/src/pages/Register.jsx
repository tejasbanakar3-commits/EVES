import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { extractError } from "../lib/api";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";

export default function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        phone: "",
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const setField = (k) => (e) => setForm({ ...form, [k]: e.target.value });

    const onSubmit = async (e) => {
        e.preventDefault();
        setError("");
        if (form.password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        setLoading(true);
        try {
            const payload = {
                name: form.name.trim(),
                email: form.email.trim().toLowerCase(),
                password: form.password,
            };
            if (form.phone.trim()) payload.phone = form.phone.trim();
            await register(payload);
            navigate("/events", { replace: true });
        } catch (err) {
            setError(extractError(err, "Could not create account"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-50 px-4 py-16">
            <div className="w-full max-w-md">
                <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
                    <span className="label-eyebrow">Create account</span>
                    <h1 className="mt-2 font-display text-3xl font-medium tracking-tight text-slate-900">
                        Join Eves
                    </h1>
                    <p className="mt-2 text-sm text-slate-500">
                        Free for the demo, no credit card required.
                    </p>

                    {error && (
                        <div
                            data-testid="register-error"
                            className="mt-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                        >
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={onSubmit} className="mt-6 space-y-4">
                        <FormField
                            label="Name"
                            value={form.name}
                            onChange={setField("name")}
                            testid="register-name-input"
                            required
                            placeholder="Jane Doe"
                        />
                        <FormField
                            label="Email"
                            type="email"
                            value={form.email}
                            onChange={setField("email")}
                            testid="register-email-input"
                            required
                            placeholder="jane@example.com"
                        />
                        <FormField
                            label="Password"
                            type="password"
                            value={form.password}
                            onChange={setField("password")}
                            testid="register-password-input"
                            required
                            placeholder="min. 6 characters"
                        />
                        <FormField
                            label="Phone (optional)"
                            value={form.phone}
                            onChange={setField("phone")}
                            testid="register-phone-input"
                            placeholder="+91 90000 00000"
                        />

                        <button
                            data-testid="register-submit-btn"
                            type="submit"
                            disabled={loading}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    Create account
                                    <ArrowRight className="h-4 w-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm text-slate-500">
                        Already have an account?{" "}
                        <Link
                            to="/login"
                            className="font-medium text-blue-600 hover:underline"
                            data-testid="register-to-login-link"
                        >
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

function FormField({ label, type = "text", value, onChange, testid, required, placeholder }) {
    return (
        <div>
            <label className="label-eyebrow mb-1.5 block">{label}</label>
            <input
                data-testid={testid}
                type={type}
                required={required}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
        </div>
    );
}
