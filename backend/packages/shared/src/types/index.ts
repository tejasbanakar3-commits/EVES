export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'CUSTOMER' | 'ADMIN';
  createdAt: Date;
}

export interface Event {
  id: string;
  title: string;
  type: 'TRAIN' | 'BUS' | 'CINEMA' | 'EVENT' | 'STADIUM';
  source?: string;
  destination?: string;
  venue?: string;
  eventDate: Date;
  totalSeats: number;
  rows: number;
  columns: number;
  status: 'ACTIVE' | 'CANCELLED' | 'COMPLETED';
  createdAt: Date;
}

export interface Seat {
  id: string;
  eventId: string;
  seatNumber: string;
  rowLabel: string;
  columnNumber: number;
  status: 'AVAILABLE' | 'LOCKED' | 'BOOKED';
  lockedBy?: string;
  lockedUntil?: Date;
  version: number;
}

export interface Lock {
  id: string;
  seatId: string;
  eventId: string;
  userId: string;
  sessionId: string;
  lockToken: string;
  status: 'ACTIVE' | 'EXPIRED' | 'RELEASED' | 'CONVERTED';
  lockedAt: Date;
  expiresAt: Date;
  releasedAt?: Date;
}

export interface Booking {
  id: string;
  bookingCode: string;
  userId: string;
  eventId: string;
  seatId: string;
  paymentStatus: 'PENDING' | 'SUCCESS' | 'FAILED' | 'TIMEOUT';
  bookingStatus: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  amount: number;
  createdAt: Date;
}

export interface Payment {
  id: string;
  bookingId: string;
  userId: string;
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'TIMEOUT';
  simulationType: 'SUCCESS' | 'FAILURE' | 'TIMEOUT' | 'CRASH';
  createdAt: Date;
}

export interface RecoveryLog {
  id: string;
  seatId: string;
  eventId: string;
  lockId?: string;
  reason: 'LOCK_EXPIRED' | 'REDIS_KEY_MISSING' | 'MANUAL_TRIGGER';
  recoveryStatus: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  recoveredAt: Date;
}

export interface SeatAvailability {
  total: number;
  available: number;
  locked: number;
  booked: number;
}

export interface LockResult {
  lockToken: string;
  seatId: string;
  expiresAt: Date;
  ttlSeconds: number;
}

export interface QueuePosition {
  seatId: string;
  position: number;
  totalInQueue: number;
}

export interface RaceTestResult {
  totalAttempts: number;
  successCount: number;
  failedCount: number;
  winner?: { userId: string; lockToken: string };
  timingMs: number;
}

export interface DashboardStats {
  totalEvents: number;
  totalSeats: number;
  availableSeats: number;
  lockedSeats: number;
  bookedSeats: number;
  activeLocksCount: number;
  totalBookings: number;
  totalRecoveries: number;
}
