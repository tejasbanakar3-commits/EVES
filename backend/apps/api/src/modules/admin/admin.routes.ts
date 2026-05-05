import { Router } from 'express';
import { adminController } from './admin.controller';
import { authMiddleware, adminMiddleware } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { raceTestSchema } from '@eves/shared';
import { asyncHandler } from '../../utils/helpers';

const router = Router();

router.use(authMiddleware, adminMiddleware);

router.get('/dashboard', asyncHandler(adminController.getDashboard));
router.get('/active-locks', asyncHandler(adminController.getActiveLocks));
router.get('/bookings', asyncHandler(adminController.getAllBookings));
router.post('/bookings/import', asyncHandler(adminController.importBookings));
router.post('/reset-demo', asyncHandler(adminController.resetDemo));
router.post('/race-test', validate(raceTestSchema), asyncHandler(adminController.raceTest));

export { router as adminRoutes };
