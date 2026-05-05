import { Router } from 'express';
import { eventController } from './event.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createEventSchema, generateSeatsSchema } from '@eves/shared';
import { asyncHandler } from '../../utils/helpers';

const router = Router();

router.get('/', asyncHandler(eventController.listEvents));
router.get('/:eventId', asyncHandler(eventController.getEvent));
router.post('/', authMiddleware, validate(createEventSchema), asyncHandler(eventController.createEvent));
router.post('/import', authMiddleware, asyncHandler(eventController.importEvents));
router.post('/:eventId/generate-seats', authMiddleware, validate(generateSeatsSchema), asyncHandler(eventController.generateSeats));

export { router as eventRoutes };
