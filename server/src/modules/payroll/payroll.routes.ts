import { Router } from 'express';
import { asyncWrapper } from '../../shared/utils/asyncWrapper';
import { authenticate } from '../../shared/middleware/authenticate';
import { authorise } from '../../shared/middleware/authorise';
import { auditLog } from '../../shared/middleware/audit';
import * as controller from './payroll.controller';

const router = Router();

router.use(authenticate);

router.get('/', asyncWrapper(controller.getAll));
router.get('/employee/:empId', asyncWrapper(controller.getByEmployee));
router.post(
  '/',
  authorise('admin'),
  auditLog({ action: 'payroll.create', targetModel: 'Payroll', getTargetId: (req) => req.body.employeeId ?? null }),
  asyncWrapper(controller.create)
);

export default router;
