import { Router } from 'express';
import { asyncWrapper } from '../../shared/utils/asyncWrapper';
import { authenticate } from '../../shared/middleware/authenticate';
import { authorise } from '../../shared/middleware/authorise';
import { auditLog } from '../../shared/middleware/audit';
import { scopeEmployee } from './employees.middleware';
import * as controller from './employees.controller';

const router = Router();

router.use(authenticate);

router.get('/', asyncWrapper(controller.getAll));

router.post(
  '/',
  authorise('admin'),
  auditLog({ action: 'employee.create', targetModel: 'Employee', getTargetId: () => null }),
  asyncWrapper(controller.create)
);

router.get('/:id', scopeEmployee, asyncWrapper(controller.getById));

router.patch(
  '/:id',
  scopeEmployee,
  auditLog({ action: 'employee.update', targetModel: 'Employee' }),
  asyncWrapper(controller.update)
);

router.delete(
  '/:id',
  authorise('admin'),
  auditLog({ action: 'employee.terminate', targetModel: 'Employee' }),
  asyncWrapper(controller.terminate)
);

export default router;
