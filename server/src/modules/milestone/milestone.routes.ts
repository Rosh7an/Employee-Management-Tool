import { Router } from 'express';
import { asyncWrapper } from '../../shared/utils/asyncWrapper';
import { authenticate } from '../../shared/middleware/authenticate';
import { auditLog } from '../../shared/middleware/audit';
import * as controller from './milestone.controller';

const router = Router();
router.use(authenticate);
router.get('/', asyncWrapper(controller.getAll));
router.post(
  '/',
  auditLog({ action: 'milestone.create', targetModel: 'Milestone', getTargetId: () => null }),
  asyncWrapper(controller.create)
);
router.patch(
  '/:id',
  auditLog({ action: 'milestone.update', targetModel: 'Milestone' }),
  asyncWrapper(controller.update)
);
router.delete(
  '/:id',
  auditLog({ action: 'milestone.delete', targetModel: 'Milestone' }),
  asyncWrapper(controller.remove)
);
export default router;
