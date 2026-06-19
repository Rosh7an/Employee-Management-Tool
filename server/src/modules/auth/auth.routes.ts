import { Router } from 'express';
import { asyncWrapper } from '../../shared/utils/asyncWrapper';
import { authenticate } from '../../shared/middleware/authenticate';
import * as controller from './auth.controller';

const router = Router();

router.post('/register', asyncWrapper(controller.register));
router.post('/login', asyncWrapper(controller.login));
router.get('/me', authenticate, asyncWrapper(controller.getMe));

export default router;
