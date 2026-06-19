import express, { Response } from 'express';
import User from '../models/User.js';
import DepartmentModel from '../models/Department.js';
import LeaveRequestModel from '../models/LeaveRequest.js';
import PayrollModel from '../models/Payroll.js';
import AttendanceModel from '../models/Attendance.js';
import AuditLog from '../models/AuditLog.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';

const router = express.Router();

// GET /api/db/:collection - Fetch raw MongoDB collection data for visual explorer
router.get('/:collection', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { collection } = req.params;
    let data: any[] = [];

    if (collection === 'users') {
      data = await User.find().sort({ createdAt: -1 });
    } else if (collection === 'departments') {
      data = await DepartmentModel.find().sort({ name: 1 });
    } else if (collection === 'leaverequests') {
      data = await LeaveRequestModel.find().sort({ createdAt: -1 });
    } else if (collection === 'payrolls') {
      data = await PayrollModel.find().sort({ payPeriod: -1, createdAt: -1 });
    } else if (collection === 'attendances') {
      data = await AttendanceModel.find().sort({ date: -1 });
    } else if (collection === 'logs' || collection === 'auditlogs') {
      data = await AuditLog.find().sort({ timestamp: -1 }).limit(100);
    } else {
      return res.status(400).json({ message: 'Invalid collection' });
    }

    res.json(data);
  } catch (error) {
    console.error(`Error fetching DB collection ${req.params.collection}:`, error);
    res.status(500).json({ message: 'Failed to query database collections' });
  }
});

export default router;
