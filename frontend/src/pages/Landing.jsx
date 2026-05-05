import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
    ArrowRight,
    Database,
    Layers,
    LockKeyhole,
    Rocket,
    Server,
    ShieldCheck,
    Timer,
    Workflow,
    Zap,
} from "lucide-react";

const HERO_IMAGE =
    "https://static.prod-images.emergentagent.com/jobs/30fbe795-f7e8-4aab-adda-3d2a2945c1a4/images/194b39196ad22cba866a57f1e0b45e3dae76bbde8a2f41aa76e20ad597f75382.png";

const FEATURES = [
    {
        icon: <LockKeyhole className="h-5 w-5" />,
        title: "Atomic Redis Locks",
        body: "SET NX EX guarantees a single winner across hundreds of concurrent users — every time.",
    },
    {
        icon: <Timer className="h-5 w-5" />,
        title: "Phantom Lock Recovery",
        body: "BullMQ worker continuously reconciles Redis & Postgres so abandoned carts never strand a seat.",
    },
    {
        icon: <Workflow className="h-5 w-5" />,
        title: "Fair Queue",
        body: "When a seat is contested, queued users are notified the moment the lock releases.",
    },
    {
        icon: <ShieldCheck className="h-5 w-5" />,
        title: "Race-Condition Proof",
        body: "Built-in race simulator: 50 users, 1 seat, exactly 1 winner. Auditable proof of correctness.",
    },
];

export default function Landing() {
    return (
        <div className="min-h-screen bg-slate-50">
            {/* HERO */}
            <section className="relative overflow-hidden border-b border-slate-200 bg-white">
                <div
                    aria-hidden
                    className="absolute inset-0 bg-grid opacity-60"
                />
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/40 via-white/70 to-white"
                />
                <img
                    src={HERO_IMAGE}
                    alt=""
                    aria-hidden
                    className="absolute right-0 top-0 hidden h-full w-1/2 object-cover opacity-25 mix-blend-multiply md:block"
                />

                <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 md:grid-cols-12 md:px-8 md:py-24 lg:py-32">
                    <div className="md:col-span-7">
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs text-slate-600 backdrop-blur"
                        >
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                            <span className="font-mono uppercase tracking-[0.2em]">
                                Real-time booking infrastructure
                            </span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.55, delay: 0.05 }}
                            className="mt-6 font-display text-5xl font-semibold leading-[1.05] tracking-tight text-slate-900 sm:text-6xl lg:text-7xl"
                        >
                            Zero double bookings.
                            <br />
                            <span className="text-blue-600">
                                Real-time recovery.
                            </span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.55, delay: 0.1 }}
                            className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600"
                        >
                            Eves is a battle-tested seat-reservation engine that
                            survives cart abandonment, network failures and
                            full-blown server crashes — without ever stranding a
                            seat or letting two users book the same row.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.55, delay: 0.15 }}
                            className="mt-10 flex flex-wrap items-center gap-3"
                        >
                            <Link
                                to="/events"
                                data-testid="hero-try-demo-btn"
                                className="group inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md"
                            >
                                Try Live Demo
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                            </Link>
                            <Link
                                to="/login"
                                data-testid="hero-signin-btn"
                                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-800 hover:bg-slate-50"
                            >
                                Sign in to your account
                            </Link>
                        </motion.div>

                        <div className="mt-8 flex flex-wrap items-center gap-6 text-xs text-slate-500">
                            <span className="font-mono">
                                <span className="text-slate-900 font-semibold">admin@eves.io</span>{" "}
                                / admin123
                            </span>
                            <span className="font-mono">
                                <span className="text-slate-900 font-semibold">user@eves.io</span>{" "}
                                / user123
                            </span>
                        </div>
                    </div>

                    {/* Architecture visual */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="md:col-span-5"
                    >
                        <ArchitectureBlueprint />
                    </motion.div>
                </div>
            </section>

            {/* PROBLEM / SOLUTION */}
            <section className="relative border-b border-slate-200 bg-white">
                <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 md:grid-cols-2 md:px-8">
                    <div>
                        <span className="label-eyebrow">The problem</span>
                        <h2 className="mt-3 font-display text-3xl font-medium tracking-tight text-slate-900 md:text-4xl">
                            Phantom locks strand seats. Unhappy customers and lost revenue follow.
                        </h2>
                        <p className="mt-5 text-base leading-relaxed text-slate-600">
                            Most booking systems lock a seat the moment a user clicks
                            it — but if the user abandons checkout, the network drops,
                            or the payment service crashes, that lock can linger for
                            hours. The result: seats marked "unavailable" while
                            physically empty, and irate customers staring at sold-out
                            screens.
                        </p>
                    </div>
                    <div>
                        <span className="label-eyebrow">The eves approach</span>
                        <h2 className="mt-3 font-display text-3xl font-medium tracking-tight text-slate-900 md:text-4xl">
                            Atomic locks + a recovery worker that never sleeps.
                        </h2>
                        <p className="mt-5 text-base leading-relaxed text-slate-600">
                            Every lock is an atomic Redis <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[13px] text-blue-600">SET NX EX</code>{" "}
                            with a 5-minute TTL. A BullMQ worker continuously reconciles
                            Postgres against Redis, releasing any seat that has been
                            abandoned. Combined with Postgres
                            <code className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[13px] text-blue-600">SELECT FOR UPDATE</code>{" "}
                            during booking, the system is provably double-booking-free.
                        </p>
                    </div>
                </div>
            </section>

            {/* FEATURES */}
            <section className="border-b border-slate-200 bg-slate-50">
                <div className="mx-auto max-w-7xl px-4 py-20 md:px-8">
                    <div className="flex flex-col gap-2">
                        <span className="label-eyebrow">Why Eves</span>
                        <h2 className="font-display text-3xl font-medium tracking-tight text-slate-900 md:text-4xl">
                            Built for the messy realities of real-time booking.
                        </h2>
                    </div>
                    <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
                        {FEATURES.map((f, i) => (
                            <motion.div
                                key={f.title}
                                initial={{ opacity: 0, y: 8 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ duration: 0.4, delay: i * 0.06 }}
                                className="bg-white p-6"
                            >
                                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                                    {f.icon}
                                </div>
                                <h3 className="mt-4 font-display text-lg font-medium text-slate-900">
                                    {f.title}
                                </h3>
                                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                                    {f.body}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="bg-white">
                <div className="mx-auto max-w-7xl px-4 py-20 md:px-8">
                    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-900 p-10 text-white md:p-16">
                        <div className="absolute inset-0 bg-grid opacity-10" />
                        <div className="relative grid items-center gap-8 md:grid-cols-2">
                            <div>
                                <span className="label-eyebrow text-blue-300">
                                    Ready when you are
                                </span>
                                <h2 className="mt-3 font-display text-3xl font-medium tracking-tight md:text-4xl">
                                    Try the live booking flow now.
                                </h2>
                                <p className="mt-4 text-slate-300">
                                    Sign in with the seeded demo accounts, book a
                                    seat, then open a second tab and watch the seat
                                    grid update in real time.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-3 md:justify-end">
                                <Link
                                    to="/events"
                                    data-testid="cta-events-btn"
                                    className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-500"
                                >
                                    Browse events
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                                <Link
                                    to="/register"
                                    data-testid="cta-register-btn"
                                    className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/5 px-5 py-3 text-sm font-medium text-white hover:bg-white/10"
                                >
                                    Create an account
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="border-t border-slate-200 bg-white">
                <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 py-10 text-sm text-slate-500 md:flex-row md:items-center md:px-8">
                    <div className="flex items-center gap-2">
                        <Rocket className="h-4 w-4 text-blue-600" />
                        <span className="font-display text-base font-semibold text-slate-900">
                            Eves
                        </span>
                        <span className="font-mono text-xs uppercase tracking-widest">
                            real-time bookings
                        </span>
                    </div>
                    <div className="font-mono text-xs">
                        © {new Date().getFullYear()} Eves · Built with Express, Redis &amp;
                        Postgres
                    </div>
                </div>
            </footer>
        </div>
    );
}

function ArchitectureBlueprint() {
    const Pill = ({ icon, label, sub, accent }) => (
        <div
            className={`flex items-center gap-3 rounded-md border bg-white px-3 py-2.5 shadow-sm ${
                accent || "border-slate-200"
            }`}
        >
            <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-50 text-slate-700">
                {icon}
            </div>
            <div className="min-w-0">
                <div className="font-display text-sm font-medium leading-none text-slate-900">
                    {label}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                    {sub}
                </div>
            </div>
        </div>
    );

    return (
        <div
            data-testid="architecture-blueprint"
            className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
        >
            <div className="flex items-center justify-between">
                <span className="label-eyebrow">Architecture</span>
                <span className="rounded bg-blue-50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-blue-600">
                    Live
                </span>
            </div>
            <div className="mt-5 grid gap-3">
                <Pill
                    icon={<Database className="h-4 w-4" />}
                    label="Redis"
                    sub="Atomic locks · TTL"
                    accent="border-red-200"
                />
                <div className="ml-4 h-3 w-px bg-slate-300" />
                <Pill
                    icon={<Server className="h-4 w-4" />}
                    label="Express API"
                    sub="REST + Socket.IO"
                    accent="border-blue-200"
                />
                <div className="ml-4 h-3 w-px bg-slate-300" />
                <Pill
                    icon={<Database className="h-4 w-4" />}
                    label="PostgreSQL"
                    sub="SELECT FOR UPDATE"
                    accent="border-emerald-200"
                />
                <div className="ml-4 h-3 w-px bg-slate-300" />
                <Pill
                    icon={<Layers className="h-4 w-4" />}
                    label="BullMQ Worker"
                    sub="Phantom lock recovery"
                    accent="border-purple-200"
                />
            </div>
            <div className="mt-6 flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <Zap className="h-3.5 w-3.5 text-yellow-500" />
                <span>
                    Every state change broadcasts via Socket.IO to every connected
                    tab.
                </span>
            </div>
        </div>
    );
}
