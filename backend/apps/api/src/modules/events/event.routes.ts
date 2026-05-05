import { Router } from 'express';
import { eventController } from './event.controller';
import { authMiddleware, adminMiddleware } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createEventSchema, generateSeatsSchema } from '@eves/shared';
import { asyncHandler } from '../../utils/helpers';

const router = Router();

router.get('/', asyncHandler(eventController.listEvents));
router.get('/:eventId', asyncHandler(eventController.getEvent));
router.post('/', authMiddleware, adminMiddleware, validate(createEventSchema), asyncHandler(eventController.createEvent));
router.post('/:eventId/generate-seats', authMiddleware, adminMiddleware, validate(generateSeatsSchema), asyncHandler(eventController.generateSeats));

export { router as eventRoutes };
