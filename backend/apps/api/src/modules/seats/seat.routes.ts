import { Router } from 'express';
import { seatController } from './seat.controller';
import { asyncHandler } from '../../utils/helpers';

const router = Router();

router.get('/:eventId/seats', asyncHandler(seatController.getSeatGrid));
router.get('/:eventId/availability', asyncHandler(seatController.getAvailability));

export { router as seatRoutes };
