import express, { Response } from 'express';
import PayrollModel from '../models/Payroll.js';
import User from '../models/User.js';
import { authenticateToken, requirePermission, AuthenticatedRequest } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// GET / - Read payroll summaries based on scope
router.get('/', requirePermission('read:payroll'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const scope = req.permissionScope;
    let query: any = {};

    if (scope === 'self') {
      query = { employeeId: req.user!._id };
    } else if (scope === 'team') {
      // Find all employees in the manager's department
      const teamUserIds = await User.find({ department: req.user!.department }).select('_id');
      query = { employeeId: { $in: teamUserIds.map(u => u._id) } };
    } // 'global' returns all payrolls

    const payrolls = await PayrollModel.find(query)
      .populate('employeeId', 'name email employeeId department designation')
      .sort({ payPeriod: -1, createdAt: -1 });

    res.json(payrolls);
  } catch (error) {
    console.error('Error fetching payroll summaries:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
