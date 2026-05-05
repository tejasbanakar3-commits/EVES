export const SeatStatus = {
  AVAILABLE: 'AVAILABLE',
  LOCKED: 'LOCKED',
  BOOKED: 'BOOKED',
} as const;

export const LockStatus = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  RELEASED: 'RELEASED',
  CONVERTED: 'CONVERTED',
} as const;

export const PaymentStatus = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  TIMEOUT: 'TIMEOUT',
} as const;

export const BookingStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
} as const;

export const UserRole = {
  CUSTOMER: 'CUSTOMER',
  ADMIN: 'ADMIN',
} as const;

export const EventType = {
  TRAIN: 'TRAIN',
  BUS: 'BUS',
  CINEMA: 'CINEMA',
  EVENT: 'EVENT',
  STADIUM: 'STADIUM',
} as const;

export const SimulationType = {
  SUCCESS: 'SUCCESS',
  FAILURE: 'FAILURE',
  TIMEOUT: 'TIMEOUT',
  CRASH: 'CRASH',
} as const;

export const RecoveryReason = {
  LOCK_EXPIRED: 'LOCK_EXPIRED',
  REDIS_KEY_MISSING: 'REDIS_KEY_MISSING',
  MANUAL_TRIGGER: 'MANUAL_TRIGGER',
} as const;

export const LOCK_TTL_SECONDS = 300;
export const RECOVERY_INTERVAL_MS = 10000;
