import Employee from '../../models/Employee';
import Department from '../../models/Department';
import LeaveRequest from '../../models/LeaveRequest';
import AuditLog from '../../models/AuditLog';
import { Request } from 'express';

export async function getStats(req: Request) {
  const { role, departmentId } = req.user;

  const empFilter: Record<string, unknown> = { status: { $ne: 'terminated' } };
  if (role === 'manager') empFilter.department = departmentId;

  const leaveFilter: Record<string, unknown> = { status: 'pending' };
  if (role === 'manager') {
    const deptEmployees = await Employee.find({ department: departmentId }, '_id').lean();
    leaveFilter.employeeId = { $in: deptEmployees.map((e) => e._id) };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const onLeaveFilter: Record<string, unknown> = {
    status: 'approved',
    startDate: { $lte: today },
    endDate: { $gte: today },
  };
  if (role === 'manager') {
    const deptEmployees = await Employee.find({ department: departmentId }, '_id').lean();
    onLeaveFilter.employeeId = { $in: deptEmployees.map((e) => e._id) };
  } else if (role === 'employee') {
    // employees only see their own
  }

  const recentHireFilter: Record<string, unknown> = {
    status: { $ne: 'terminated' },
    dateOfJoining: { $gte: thirtyDaysAgo },
  };
  if (role === 'manager') recentHireFilter.department = departmentId;

  const [totalEmployees, activeEmployees, pendingLeaves, totalDepartments, onLeaveToday, recentHires] = await Promise.all([
    Employee.countDocuments(empFilter),
    Employee.countDocuments({ ...empFilter, status: 'active' }),
    LeaveRequest.countDocuments(leaveFilter),
    Department.countDocuments(),
    LeaveRequest.countDocuments(onLeaveFilter),
    Employee.countDocuments(recentHireFilter),
  ]);

  let recentActivity: unknown;
  if (role === 'admin') {
    recentActivity = await AuditLog.find()
      .sort({ timestamp: -1 })
      .limit(5)
      .lean();
  } else {
    const leaveHistFilter: Record<string, unknown> = {};
    if (role === 'manager') {
      const deptEmployees = await Employee.find({ department: departmentId }, '_id').lean();
      leaveHistFilter.employeeId = { $in: deptEmployees.map((e) => e._id) };
    } else {
      leaveHistFilter.employeeId = req.user.employeeId;
    }
    recentActivity = await LeaveRequest.find(leaveHistFilter)
      .populate('employeeId', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
  }

  return { totalEmployees, activeEmployees, pendingLeaves, totalDepartments, onLeaveToday, recentHires, recentActivity };
}
