import { Router } from 'express';
import { asyncWrapper } from '../../shared/utils/asyncWrapper';
import { authenticate } from '../../shared/middleware/authenticate';
import * as controller from './milestone.controller';

const router = Router();
router.use(authenticate);
router.get('/', asyncWrapper(controller.getAll));
router.post('/', asyncWrapper(controller.create));
router.patch('/:id', asyncWrapper(controller.update));
router.delete('/:id', asyncWrapper(controller.remove));
export default router;
