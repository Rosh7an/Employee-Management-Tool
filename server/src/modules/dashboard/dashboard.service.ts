import Employee from '../../models/Employee';
import Department from '../../models/Department';
import LeaveRequest from '../../models/LeaveRequest';
import AuditLog from '../../models/AuditLog';
import { Request } from 'express';

export async function getStats(req: Request) {
  const { role, departmentId, employeeId } = req.user;

  // Headcount filters — employee sees own dept, manager sees dept, admin sees all
  const empFilter: Record<string, unknown> = { status: { $ne: 'terminated' } };
  if (role === 'manager' || role === 'employee') empFilter.department = departmentId;

  // Pending leave — employee sees only own, manager sees dept, admin sees all
  const leaveFilter: Record<string, unknown> = { status: 'pending' };
  if (role === 'employee') {
    leaveFilter.employeeId = employeeId;
  } else if (role === 'manager') {
    const deptEmployees = await Employee.find({ department: departmentId }, '_id').lean();
    leaveFilter.employeeId = { $in: deptEmployees.map((e) => e._id) };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // On-leave today — employee sees only self, manager sees dept, admin sees all
  const onLeaveFilter: Record<string, unknown> = {
    status: 'approved',
    startDate: { $lte: today },
    endDate: { $gte: today },
  };
  if (role === 'employee') {
    onLeaveFilter.employeeId = employeeId;
  } else if (role === 'manager') {
    const deptEmployees = await Employee.find({ department: departmentId }, '_id').lean();
    onLeaveFilter.employeeId = { $in: deptEmployees.map((e) => e._id) };
  }

  const recentHireFilter: Record<string, unknown> = {
    status: { $ne: 'terminated' },
    dateOfJoining: { $gte: thirtyDaysAgo },
  };
  if (role === 'manager' || role === 'employee') recentHireFilter.department = departmentId;

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
      leaveHistFilter.employeeId = employeeId;
    }
    recentActivity = await LeaveRequest.find(leaveHistFilter)
      .populate('employeeId', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
  }

  return { totalEmployees, activeEmployees, pendingLeaves, totalDepartments, onLeaveToday, recentHires, recentActivity };
}
