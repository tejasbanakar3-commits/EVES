import { Router } from 'express';
import { recoveryController } from './recovery.controller';
import { authMiddleware, adminMiddleware } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../utils/helpers';

const router = Router();

router.post('/run', authMiddleware, adminMiddleware, asyncHandler(recoveryController.manualRun));
router.get('/logs', authMiddleware, adminMiddleware, asyncHandler(recoveryController.getLogs));
router.get('/stats', authMiddleware, adminMiddleware, asyncHandler(recoveryController.getStats));

export { router as recoveryRoutes };
