import { Router } from 'express';
import { asyncWrapper } from '../../shared/utils/asyncWrapper';
import { authenticate } from '../../shared/middleware/authenticate';
import { authorise } from '../../shared/middleware/authorise';
import * as controller from './audit.controller';

const router = Router();

router.use(authenticate);
router.use(authorise('admin'));

router.get('/', asyncWrapper(controller.getAll));

export default router;
