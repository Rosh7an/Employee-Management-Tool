import express, { Response } from 'express';
import LeaveRequestModel from '../models/LeaveRequest.js';
import User from '../models/User.js';
import { authenticateToken, requirePermission, AuthenticatedRequest } from '../middleware/auth.js';
import { logSecurityEvent } from '../utils/auditLogger.js';

const router = express.Router();

router.use(authenticateToken);

// GET / - List leaves based on role scope
router.get('/', requirePermission('read:leaves'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const scope = req.permissionScope;
    let query: any = {};

    if (scope === 'self') {
      query = { employeeId: req.user!._id };
    } else if (scope === 'team') {
      // Find all employees in the manager's department
      const teamUserIds = await User.find({ department: req.user!.department }).select('_id');
      query = { employeeId: { $in: teamUserIds.map(u => u._id) } };
    } // 'global' returns all leaves

    const leaves = await LeaveRequestModel.find(query)
      .populate('employeeId', 'name email employeeId department designation')
      .populate('approvedBy', 'name email employeeId')
      .sort({ createdAt: -1 });

    res.json(leaves);
  } catch (error) {
    console.error('Error fetching leaves:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST / - Submit a leave request (validation of dates and balance)
router.post('/', requirePermission('create:leaves'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type, startDate, endDate, reason } = req.body;

    if (!type || !startDate || !endDate || !reason) {
      return res.status(400).json({ message: 'All fields (type, startDate, endDate, reason) are required' });
    }

    if (!['sick', 'casual', 'earned'].includes(type)) {
      return res.status(400).json({ message: 'Invalid leave type' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    if (end < start) {
      return res.status(400).json({ message: 'End date cannot be before start date' });
    }

    // Calculate number of leave days
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Get the employee document to check balance
    const employee = await User.findById(req.user!._id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const balance = employee.leaveBalances[type as 'sick' | 'casual' | 'earned'] || 0;
    if (balance < diffDays) {
      return res.status(400).json({
        message: `Insufficient leave balance. Requested: ${diffDays} days, Available: ${balance} days`
      });
    }

    const leaveRequest = new LeaveRequestModel({
      employeeId: employee._id,
      employeeEmail: employee.email,
      type,
      startDate: start,
      endDate: end,
      reason,
      status: 'pending'
    });

    await leaveRequest.save();

    await logSecurityEvent({
      action: 'leave_submit',
      resource: 'leaves',
      resourceId: leaveRequest._id.toString(),
      targetEmployeeId: employee._id,
      status: 'success',
      details: { type, startDate, endDate, days: diffDays },
      req: req as any,
    });

    res.status(201).json(leaveRequest);
  } catch (error) {
    console.error('Error submitting leave:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /:id/approve - Manager/Admin approval endpoint
router.put('/:id/approve', requirePermission('approve:leaves'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body; // 'approved' or 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or rejected' });
    }

    const leave = await LeaveRequestModel.findById(id);
    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({ message: `Leave request has already been ${leave.status}` });
    }

    const employee = await User.findById(leave.employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee associated with leave request not found' });
    }

    const scope = req.permissionScope;

    // Scoped restriction check
    if (scope === 'team') {
      // Manager can only approve leaves within their department
      if (employee.department !== req.user!.department) {
        await logSecurityEvent({
          action: 'denied:approve_leave',
          resource: 'leaves',
          resourceId: id,
          status: 'denied',
          details: { reason: `Manager department ${req.user!.department} mismatch with employee department ${employee.department}` },
          req: req as any,
        });
        return res.status(403).json({ message: `Access denied. You can only approve leave requests within your department (${req.user!.department}).` });
      }
    }

    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (status === 'approved') {
      const balance = employee.leaveBalances[leave.type as 'sick' | 'casual' | 'earned'] || 0;
      if (balance < diffDays) {
        return res.status(400).json({
          message: `Cannot approve. Employee has insufficient leave balance (${balance} days available, needs ${diffDays} days).`
        });
      }

      // Deduct balance and update employee status to 'on-leave'
      employee.leaveBalances[leave.type as 'sick' | 'casual' | 'earned'] -= diffDays;
      employee.status = 'on-leave';
      await employee.save();
    }

    leave.status = status;
    leave.approvedBy = req.user!._id;
    await leave.save();

    await logSecurityEvent({
      action: `leave_${status}`,
      resource: 'leaves',
      resourceId: id,
      targetEmployeeId: employee._id,
      status: 'success',
      details: { approvedBy: req.user!.email, type: leave.type, days: diffDays },
      req: req as any,
    });

    res.json(leave);
  } catch (error) {
    console.error('Error approving/rejecting leave:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
