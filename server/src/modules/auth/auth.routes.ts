import { Router, RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncWrapper } from '../../shared/utils/asyncWrapper';
import { authenticate } from '../../shared/middleware/authenticate';
import * as controller from './auth.controller';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again in 15 minutes.', field: null } },
  skip: () => process.env.NODE_ENV === 'test',
}) as unknown as RequestHandler;

const router = Router();

router.post('/register', authLimiter, asyncWrapper(controller.register));
router.post('/login', authLimiter, asyncWrapper(controller.login));
router.post('/change-password', authenticate, asyncWrapper(controller.changePassword));
router.get('/me', authenticate, asyncWrapper(controller.getMe));

export default router;
