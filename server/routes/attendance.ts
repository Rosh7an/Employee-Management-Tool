import express, { Response } from 'express';
import AttendanceModel from '../models/Attendance.js';
import User from '../models/User.js';
import { authenticateToken, requirePermission, AuthenticatedRequest } from '../middleware/auth.js';
import { logSecurityEvent } from '../utils/auditLogger.js';

const router = express.Router();

router.use(authenticateToken);

// GET / - Read attendance records based on scope
router.get('/', requirePermission('read:attendance'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const scope = req.permissionScope;
    let query: any = {};

    if (scope === 'self') {
      query = { employeeId: req.user!._id };
    } else if (scope === 'team') {
      const teamUserIds = await User.find({ department: req.user!.department }).select('_id');
      query = { employeeId: { $in: teamUserIds.map(u => u._id) } };
    } // 'global' returns all attendance logs

    const attendanceLogs = await AttendanceModel.find(query)
      .populate('employeeId', 'name email employeeId department designation')
      .sort({ date: -1 });

    res.json(attendanceLogs);
  } catch (error) {
    console.error('Error fetching attendance logs:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Helper to format current time as "HH:MM AM/PM"
const formatTime = (date: Date): string => {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const minStr = minutes < 10 ? '0' + minutes : minutes;
  const hrStr = hours < 10 ? '0' + hours : hours;
  return `${hrStr}:${minStr} ${ampm}`;
};

// POST /checkin - Register daily check-in
router.post('/checkin', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const employee = await User.findById(req.user!._id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check if attendance already exists for today
    const existing = await AttendanceModel.findOne({ employeeId: employee._id, date: today });
    if (existing) {
      return res.status(400).json({ message: 'Already checked in for today' });
    }

    const checkInTime = formatTime(now);

    const attendance = new AttendanceModel({
      employeeId: employee._id,
      employeeEmail: employee.email,
      date: today,
      checkIn: checkInTime,
      status: 'present'
    });

    await attendance.save();

    await logSecurityEvent({
      action: 'attendance_checkin',
      resource: 'attendance',
      resourceId: attendance._id.toString(),
      targetEmployeeId: employee._id,
      status: 'success',
      details: { checkIn: checkInTime },
      req: req as any,
    });

    res.status(201).json(attendance);
  } catch (error) {
    console.error('Error during check-in:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /checkout - Register daily check-out
router.post('/checkout', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const employee = await User.findById(req.user!._id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check if attendance exists for today
    const attendance = await AttendanceModel.findOne({ employeeId: employee._id, date: today });
    if (!attendance) {
      return res.status(400).json({ message: 'You must check in first before checking out' });
    }

    if (attendance.checkOut) {
      return res.status(400).json({ message: 'Already checked out for today' });
    }

    const checkOutTime = formatTime(now);
    attendance.checkOut = checkOutTime;
    await attendance.save();

    await logSecurityEvent({
      action: 'attendance_checkout',
      resource: 'attendance',
      resourceId: attendance._id.toString(),
      targetEmployeeId: employee._id,
      status: 'success',
      details: { checkOut: checkOutTime },
      req: req as any,
    });

    res.json(attendance);
  } catch (error) {
    console.error('Error during check-out:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
