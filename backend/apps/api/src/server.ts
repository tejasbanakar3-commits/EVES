import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { env } from './config/env';
import { prisma } from './config/database';
import { redis } from './config/redis';
import { initializeSocket } from './config/socket';
import { errorMiddleware } from './middleware/error.middleware';
import { authRoutes } from './modules/auth/auth.routes';
import { eventRoutes } from './modules/events/event.routes';
import { seatRoutes } from './modules/seats/seat.routes';
import { lockRoutes } from './modules/locks/lock.routes';
import { paymentRoutes } from './modules/payments/payment.routes';
import { bookingRoutes } from './modules/bookings/booking.routes';
import { recoveryRoutes } from './modules/recovery/recovery.routes';
import { adminRoutes } from './modules/admin/admin.routes';
import { startRecoveryWorker } from './workers/recovery.worker';

const app = express();
const httpServer = createServer(app);

initializeSocket(httpServer);

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: String(error) });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/events', seatRoutes);
app.use('/api/seats', lockRoutes);
app.use('/api/locks', lockRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/recovery', recoveryRoutes);
app.use('/api/admin', adminRoutes);

app.use(errorMiddleware);

httpServer.listen(env.PORT, () => {
  console.log(`Eves API running on port ${env.PORT}`);
  console.log(`Environment: ${env.NODE_ENV}`);
  startRecoveryWorker();
});

async function shutdown() {
  console.log('Shutting down...');
  httpServer.close();
  await prisma.$disconnect();
  redis.disconnect();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
