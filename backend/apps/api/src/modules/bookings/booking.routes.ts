import { Router } from 'express';
import { bookingController } from './booking.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { confirmBookingSchema } from '@eves/shared';
import { asyncHandler } from '../../utils/helpers';

const router = Router();

router.post('/confirm', authMiddleware, validate(confirmBookingSchema), asyncHandler(bookingController.confirmBooking));
router.get('/my', authMiddleware, asyncHandler(bookingController.getMyBookings));
router.get('/:bookingId', authMiddleware, asyncHandler(bookingController.getBookingById));

export { router as bookingRoutes };
