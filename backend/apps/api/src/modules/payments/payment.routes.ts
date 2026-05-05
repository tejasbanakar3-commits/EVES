import { Router } from 'express';
import { paymentController } from './payment.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { simulatePaymentSchema } from '@eves/shared';
import { asyncHandler } from '../../utils/helpers';

const router = Router();

router.post('/simulate-success', authMiddleware, validate(simulatePaymentSchema), asyncHandler(paymentController.simulateSuccess));
router.post('/simulate-failure', authMiddleware, validate(simulatePaymentSchema), asyncHandler(paymentController.simulateFailure));
router.post('/simulate-timeout', authMiddleware, validate(simulatePaymentSchema), asyncHandler(paymentController.simulateTimeout));
router.post('/simulate-crash', authMiddleware, validate(simulatePaymentSchema), asyncHandler(paymentController.simulateCrash));

export { router as paymentRoutes };
