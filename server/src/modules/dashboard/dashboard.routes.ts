import { Router } from 'express';
import { asyncWrapper } from '../../shared/utils/asyncWrapper';
import { authenticate } from '../../shared/middleware/authenticate';
import * as controller from './dashboard.controller';

const router = Router();

router.use(authenticate);
router.get('/stats', asyncWrapper(controller.getStats));

export default router;
