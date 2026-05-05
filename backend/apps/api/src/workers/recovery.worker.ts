import { Queue, Worker, Job } from 'bullmq';
import { prisma } from '../config/database';
import { redis, getLockKey } from '../config/redis';
import { env } from '../config/env';
import { emitToEvent } from '../config/socket';

const QUEUE_NAME = 'recovery-queue';

let recoveryQueue: Queue;
let recoveryWorker: Worker;

export async function runRecoveryPass(): Promise<{
  scanned: number;
  recovered: number;
  skipped: number;
  errors: number;
}> {
  const stats = { scanned: 0, recovered: 0, skipped: 0, errors: 0 };

  const expiredSeats = await prisma.seat.findMany({
    where: {
      status: 'LOCKED',
      lockedUntil: { lt: new Date() },
    },
    include: {
      event: { select: { id: true } },
    },
  });

  stats.scanned = expiredSeats.length;

  for (const seat of expiredSeats) {
    try {
      const lockKey = getLockKey(seat.id);
      const redisValue = await redis.get(lockKey);
      const redisTtl = await redis.ttl(lockKey);

      // If Redis key still exists and has positive TTL, skip (clock skew protection)
      if (redisValue && redisTtl > 0) {
        stats.skipped++;
        continue;
      }

      // Perform recovery in a transaction with row-level lock
      await prisma.$transaction(async (tx) => {
        const lockedSeat = await tx.$queryRaw<Array<{
          id: string;
          status: string;
          event_id: string;
        }>>`
          SELECT id, status, event_id FROM seats
          WHERE id = ${seat.id}::uuid
          FOR UPDATE
        `;

        if (!lockedSeat || lockedSeat.length === 0) return;

        // CRITICAL: Never touch BOOKED seats
        if (lockedSeat[0].status === 'BOOKED') {
          stats.skipped++;
          return;
        }

        // Only recover LOCKED seats
        if (lockedSeat[0].status !== 'LOCKED') {
          stats.skipped++;
          return;
        }

        // Update seat to AVAILABLE
        await tx.seat.update({
          where: { id: seat.id },
          data: {
            status: 'AVAILABLE',
            lockedBy: null,
            lockedUntil: null,
            version: { increment: 1 },
          },
        });

        // Mark active locks as EXPIRED
        const activeLock = await tx.lock.findFirst({
          where: { seatId: seat.id, status: 'ACTIVE' },
        });

        if (activeLock) {
          await tx.lock.update({
            where: { id: activeLock.id },
            data: { status: 'EXPIRED', releasedAt: new Date() },
          });
        }

        // Write recovery log
        await tx.recoveryLog.create({
          data: {
            seatId: seat.id,
            eventId: seat.eventId,
            lockId: activeLock?.id || null,
            reason: redisValue ? 'LOCK_EXPIRED' : 'REDIS_KEY_MISSING',
            recoveryStatus: 'SUCCESS',
          },
        });

        stats.recovered++;
      });

      // Clean up any stale Redis key
      await redis.del(getLockKey(seat.id));

      // Broadcast seat availability
      emitToEvent(seat.eventId, 'seat:available', { seatId: seat.id });
      emitToEvent(seat.eventId, 'lock:expired', {
        seatId: seat.id,
        message: 'Lock expired — seat recovered by system',
      });
    } catch (error) {
      stats.errors++;
      console.error(`Recovery error for seat ${seat.id}:`, error);
    }
  }

  return stats;
}

export function startRecoveryWorker(): void {
  const connection = {
    host: new URL(env.REDIS_URL).hostname || 'localhost',
    port: parseInt(new URL(env.REDIS_URL).port || '6379'),
  };

  recoveryQueue = new Queue(QUEUE_NAME, { connection });

  // Add repeatable job
  recoveryQueue.add(
    'recovery-scan',
    {},
    {
      repeat: { every: env.RECOVERY_INTERVAL_MS },
      removeOnComplete: 100,
      removeOnFail: 50,
    }
  );

  recoveryWorker = new Worker(
    QUEUE_NAME,
    async (_job: Job) => {
      const result = await runRecoveryPass();
      if (result.recovered > 0) {
        console.log(
          `Recovery pass: scanned=${result.scanned} recovered=${result.recovered} skipped=${result.skipped}`
        );
      }
      return result;
    },
    {
      connection,
      concurrency: 1,
    }
  );

  recoveryWorker.on('failed', (job, err) => {
    console.error(`Recovery job ${job?.id} failed:`, err.message);
  });

  console.log(`Recovery worker started (interval: ${env.RECOVERY_INTERVAL_MS}ms)`);
}

export function stopRecoveryWorker(): void {
  if (recoveryWorker) recoveryWorker.close();
  if (recoveryQueue) recoveryQueue.close();
}
