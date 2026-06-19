import { Router } from 'express';
import { asyncWrapper } from '../../shared/utils/asyncWrapper';
import { authenticate } from '../../shared/middleware/authenticate';
import { authorise } from '../../shared/middleware/authorise';
import { auditLog } from '../../shared/middleware/audit';
import * as controller from './departments.controller';

const router = Router();

router.use(authenticate);

router.get('/', asyncWrapper(controller.getAll));
router.get('/:id', asyncWrapper(controller.getById));

router.post(
  '/',
  authorise('admin'),
  auditLog({ action: 'department.create', targetModel: 'Department', getTargetId: () => null }),
  asyncWrapper(controller.create)
);

router.patch(
  '/:id',
  authorise('admin'),
  auditLog({ action: 'department.update', targetModel: 'Department' }),
  asyncWrapper(controller.update)
);

router.delete(
  '/:id',
  authorise('admin'),
  auditLog({ action: 'department.delete', targetModel: 'Department' }),
  asyncWrapper(controller.remove)
);

export default router;
