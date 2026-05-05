import { prisma } from '../../config/database';
import { runRecoveryPass } from '../../workers/recovery.worker';

export class RecoveryService {
  async manualRun() {
    return runRecoveryPass();
  }

  async getLogs(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      prisma.recoveryLog.findMany({
        skip,
        take: limit,
        orderBy: { recoveredAt: 'desc' },
        include: {
          seat: { select: { seatNumber: true, rowLabel: true } },
          lock: { select: { userId: true, sessionId: true, lockedAt: true } },
        },
      }),
      prisma.recoveryLog.count(),
    ]);

    return { logs, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getStats() {
    const [totalRecoveries, last24h, byReason] = await Promise.all([
      prisma.recoveryLog.count({ where: { recoveryStatus: 'SUCCESS' } }),
      prisma.recoveryLog.count({
        where: {
          recoveryStatus: 'SUCCESS',
          recoveredAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.recoveryLog.groupBy({
        by: ['reason'],
        _count: { id: true },
        where: { recoveryStatus: 'SUCCESS' },
      }),
    ]);

    return {
      totalRecoveries,
      last24h,
      byReason: byReason.map((r) => ({ reason: r.reason, count: r._count.id })),
    };
  }
}

export const recoveryService = new RecoveryService();
