import { Router } from 'express';
import { lockController } from './lock.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { lockSeatSchema, extendLockSchema } from '@eves/shared';
import { asyncHandler } from '../../utils/helpers';

const router = Router();

router.post('/:seatId/lock', authMiddleware, validate(lockSeatSchema), asyncHandler(lockController.acquireLock));
router.delete('/:seatId/release', authMiddleware, asyncHandler(lockController.releaseLock));
router.get('/my-active', authMiddleware, asyncHandler(lockController.getMyActiveLocks));
router.post('/extend', authMiddleware, validate(extendLockSchema), asyncHandler(lockController.extendLock));

export { router as lockRoutes };
