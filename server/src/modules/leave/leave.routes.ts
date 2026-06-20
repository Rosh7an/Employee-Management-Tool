import { Router } from 'express';
import { asyncWrapper } from '../../shared/utils/asyncWrapper';
import { authenticate } from '../../shared/middleware/authenticate';
import { auditLog } from '../../shared/middleware/audit';
import { timeWindow } from '../../shared/middleware/timeWindow';
import { scopeLeaveReview } from './leave.middleware';
import * as controller from './leave.controller';

const router = Router();

router.use(authenticate);

router.get('/', asyncWrapper(controller.getAll));
router.get('/:id', asyncWrapper(controller.getById));
router.post('/', timeWindow({ bypassRoles: ['admin', 'manager'] }), asyncWrapper(controller.submit));

router.patch(
  '/:id/review',
  scopeLeaveReview,
  auditLog({ action: 'leave.review', targetModel: 'LeaveRequest' }),
  asyncWrapper(controller.review)
);

export default router;
