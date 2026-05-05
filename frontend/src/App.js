import React from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import "@/App.css";

import { AuthProvider, useAuth } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Events from "@/pages/Events";
import SeatSelection from "@/pages/SeatSelection";
import Payment from "@/pages/Payment";
import MyBookings from "@/pages/MyBookings";
import BookingDetail from "@/pages/BookingDetail";
import AdminDashboard from "@/pages/AdminDashboard";
import RaceSimulation from "@/pages/RaceSimulation";

function ProtectedRoute({ children, role }) {
    const { isAuthenticated, user } = useAuth();
    const location = useLocation();
    if (!isAuthenticated) {
        return (
            <Navigate to="/login" replace state={{ from: location }} />
        );
    }
    if (role && user?.role !== role) {
        return (
            <div className="mx-auto mt-16 max-w-xl rounded-md border border-yellow-200 bg-yellow-50 p-6 text-yellow-800">
                <div className="font-display text-lg font-medium">Admin only</div>
                <p className="mt-2 text-sm">
                    This page requires an ADMIN role. Sign in with the seeded admin
                    account: <span className="font-mono">admin@eves.io / admin123</span>.
                </p>
            </div>
        );
    }
    return children;
}

function Shell() {
    return (
        <div className="App min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
                <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/events" element={<Events />} />
                    <Route path="/events/:eventId" element={<SeatSelection />} />
                    <Route
                        path="/events/:eventId/payment"
                        element={
                            <ProtectedRoute>
                                <Payment />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/bookings"
                        element={
                            <ProtectedRoute>
                                <MyBookings />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/bookings/:bookingId"
                        element={
                            <ProtectedRoute>
                                <BookingDetail />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin"
                        element={
                            <ProtectedRoute role="ADMIN">
                                <AdminDashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/simulation"
                        element={
                            <ProtectedRoute role="ADMIN">
                                <RaceSimulation />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>
        </div>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Shell />
            </AuthProvider>
        </BrowserRouter>
    );
}
