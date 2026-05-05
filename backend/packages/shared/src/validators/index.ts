import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createEventSchema = z.object({
  title: z.string().min(2).max(200),
  type: z.enum(['TRAIN', 'BUS', 'CINEMA', 'EVENT', 'STADIUM']),
  source: z.string().optional(),
  destination: z.string().optional(),
  venue: z.string().optional(),
  eventDate: z.string().datetime(),
  totalSeats: z.number().int().positive(),
  rows: z.number().int().positive().max(50),
  columns: z.number().int().positive().max(50),
});

export const generateSeatsSchema = z.object({
  rows: z.number().int().positive().max(50).optional(),
  columns: z.number().int().positive().max(50).optional(),
});

export const lockSeatSchema = z.object({
  sessionId: z.string().uuid(),
});

export const extendLockSchema = z.object({
  seatId: z.string().uuid(),
  sessionId: z.string().uuid(),
  additionalSeconds: z.number().int().positive().max(300).optional(),
});

export const confirmBookingSchema = z.object({
  seatId: z.string().uuid(),
  sessionId: z.string().uuid(),
  lockToken: z.string().min(1),
  amount: z.number().positive(),
});

export const simulatePaymentSchema = z.object({
  seatId: z.string().uuid(),
  sessionId: z.string().uuid(),
  lockToken: z.string().min(1),
  amount: z.number().positive(),
});

export const raceTestSchema = z.object({
  eventId: z.string().uuid(),
  seatId: z.string().uuid(),
  concurrentUsers: z.number().int().positive().max(100).default(50),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type GenerateSeatsInput = z.infer<typeof generateSeatsSchema>;
export type LockSeatInput = z.infer<typeof lockSeatSchema>;
export type ExtendLockInput = z.infer<typeof extendLockSchema>;
export type ConfirmBookingInput = z.infer<typeof confirmBookingSchema>;
export type SimulatePaymentInput = z.infer<typeof simulatePaymentSchema>;
export type RaceTestInput = z.infer<typeof raceTestSchema>;
