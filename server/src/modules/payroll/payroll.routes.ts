import { Router } from 'express';
import { asyncWrapper } from '../../shared/utils/asyncWrapper';
import { authenticate } from '../../shared/middleware/authenticate';
import { authorise } from '../../shared/middleware/authorise';
import * as controller from './payroll.controller';

const router = Router();

router.use(authenticate);

router.get('/', asyncWrapper(controller.getAll));
router.post('/', authorise('admin'), asyncWrapper(controller.create));

export default router;
