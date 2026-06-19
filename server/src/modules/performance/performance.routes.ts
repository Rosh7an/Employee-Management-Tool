import { Router } from 'express';
import { asyncWrapper } from '../../shared/utils/asyncWrapper';
import { authenticate } from '../../shared/middleware/authenticate';
import { authorise } from '../../shared/middleware/authorise';
import { auditLog } from '../../shared/middleware/audit';
import { scopePerformanceCreate } from './performance.middleware';
import * as controller from './performance.controller';

const router = Router();

router.use(authenticate);

router.get('/', asyncWrapper(controller.getAll));

router.get('/employee/:empId', asyncWrapper(controller.getByEmployee));

router.post(
  '/',
  authorise('admin', 'manager'),
  scopePerformanceCreate,
  auditLog({ action: 'performance.create', targetModel: 'PerformanceReview', getTargetId: () => null }),
  asyncWrapper(controller.create)
);

router.patch(
  '/:id',
  authorise('admin', 'manager'),
  auditLog({ action: 'performance.update', targetModel: 'PerformanceReview' }),
  asyncWrapper(controller.update)
);

router.delete(
  '/:id',
  authorise('admin', 'manager'),
  auditLog({ action: 'performance.delete', targetModel: 'PerformanceReview' }),
  asyncWrapper(controller.remove)
);

// Quarter management routes
router.get('/quarters', asyncWrapper(controller.listQuarters));
router.post('/quarters', authorise('admin'), asyncWrapper(controller.createQuarter));
router.patch('/quarters/:id/lock', authorise('admin'), asyncWrapper(controller.lockQuarter));
router.patch('/quarters/:id/unlock', authorise('admin'), asyncWrapper(controller.unlockQuarter));

export default router;
