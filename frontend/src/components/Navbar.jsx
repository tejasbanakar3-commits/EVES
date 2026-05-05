import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { LogOut, ShieldCheck, Ticket, User } from "lucide-react";

export default function Navbar() {
    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const { pathname } = useLocation();

    const link = (to, label, testid) => (
        <Link
            to={to}
            data-testid={testid}
            className={`px-3 py-1.5 text-sm tracking-tight transition-colors ${
                pathname === to || pathname.startsWith(to + "/")
                    ? "text-slate-900 font-medium"
                    : "text-slate-500 hover:text-slate-900"
            }`}
        >
            {label}
        </Link>
    );

    return (
        <header
            data-testid="navbar"
            className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-xl"
        >
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
                <Link
                    to="/"
                    data-testid="navbar-logo"
                    className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-slate-900"
                >
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white">
                        <Ticket className="h-4 w-4" />
                    </span>
                    Eves
                    <span className="ml-1 hidden rounded-sm bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-slate-500 md:inline">
                        v1.0
                    </span>
                </Link>

                <nav className="hidden items-center gap-1 md:flex">
                    {link("/events", "Events", "nav-events")}
                    {isAuthenticated && link("/events/new", "Create", "nav-create-event")}
                    {isAuthenticated && link("/bookings", "My Bookings", "nav-bookings")}
                    {user?.role === "ADMIN" &&
                        link("/admin", "Admin", "nav-admin")}
                </nav>

                <div className="flex items-center gap-2">
                    {!isAuthenticated ? (
                        <>
                            <Link
                                to="/login"
                                data-testid="nav-login-link"
                                className="rounded-md px-3 py-1.5 text-sm text-slate-700 hover:text-slate-900"
                            >
                                Sign in
                            </Link>
                            <Link
                                to="/register"
                                data-testid="nav-register-link"
                                className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800"
                            >
                                Get started
                            </Link>
                        </>
                    ) : (
                        <div className="flex items-center gap-2">
                            <div
                                data-testid="navbar-user"
                                className="hidden items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 md:flex"
                            >
                                {user?.role === "ADMIN" ? (
                                    <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                                ) : (
                                    <User className="h-3.5 w-3.5 text-slate-500" />
                                )}
                                <span className="font-medium text-slate-800">
                                    {user?.name || user?.email}
                                </span>
                                {user?.role === "ADMIN" && (
                                    <span className="rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[10px] tracking-widest text-blue-600">
                                        ADMIN
                                    </span>
                                )}
                            </div>
                            <button
                                data-testid="nav-logout-btn"
                                onClick={() => {
                                    logout();
                                    navigate("/");
                                }}
                                className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                            >
                                <LogOut className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Logout</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
