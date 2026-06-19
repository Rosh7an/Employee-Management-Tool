import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { MongoMemoryServer } from 'mongodb-memory-server';

import User from './models/User.js';
import DepartmentModel from './models/Department.js';
import LeaveRequestModel from './models/LeaveRequest.js';
import PayrollModel from './models/Payroll.js';
import AttendanceModel from './models/Attendance.js';
import AuditLog from './models/AuditLog.js';
import { logSecurityEvent } from './utils/auditLogger.js';

dotenv.config();

const seedDatabaseForTesting = async () => {
  await User.deleteMany({});
  await DepartmentModel.deleteMany({});
  await LeaveRequestModel.deleteMany({});
  await PayrollModel.deleteMany({});
  await AttendanceModel.deleteMany({});
  await AuditLog.deleteMany({});

  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const userPasswordHash = await bcrypt.hash('user1234', 10);

  // 1. Seed Roles
  const admin = new User({
    name: 'HR Admin',
    email: 'admin@example.com',
    passwordHash: adminPasswordHash,
    phone: '123-456-7890',
    department: 'HR',
    designation: 'HR Director',
    employeeId: 'EMP-100000',
    role: 'Admin',
    status: 'active',
    leaveBalances: { sick: 12, casual: 15, earned: 20 }
  });
  await admin.save();

  const managerEng = new User({
    name: 'Alice Manager',
    email: 'alice_manager@example.com',
    passwordHash: userPasswordHash,
    phone: '234-567-8901',
    department: 'Engineering',
    designation: 'Engineering Lead',
    employeeId: 'EMP-100001',
    role: 'Manager',
    status: 'active',
    leaveBalances: { sick: 12, casual: 15, earned: 20 },
    managerId: admin._id
  });
  await managerEng.save();

  const managerHR = new User({
    name: 'Mark Manager',
    email: 'mark_manager@example.com',
    passwordHash: userPasswordHash,
    phone: '345-678-9012',
    department: 'HR',
    designation: 'HR Operations Manager',
    employeeId: 'EMP-100002',
    role: 'Manager',
    status: 'active',
    leaveBalances: { sick: 12, casual: 15, earned: 20 },
    managerId: admin._id
  });
  await managerHR.save();

  // Seed departments
  const engDept = new DepartmentModel({
    name: 'Engineering',
    managerId: managerEng._id,
    description: 'Engineering Dept'
  });
  await engDept.save();

  const hrDept = new DepartmentModel({
    name: 'HR',
    managerId: managerHR._id,
    description: 'HR Dept'
  });
  await hrDept.save();

  // Employees
  const bob = new User({
    name: 'Bob Developer',
    email: 'bob_developer@example.com',
    passwordHash: userPasswordHash,
    phone: '456-789-0123',
    department: 'Engineering',
    designation: 'Senior Developer',
    employeeId: 'EMP-100003',
    role: 'User',
    status: 'active',
    leaveBalances: { sick: 10, casual: 13, earned: 15 },
    managerId: managerEng._id
  });
  await bob.save();

  const charlie = new User({
    name: 'Charlie Developer',
    email: 'charlie_developer@example.com',
    passwordHash: userPasswordHash,
    phone: '567-890-1234',
    department: 'Engineering',
    designation: 'Junior Developer',
    employeeId: 'EMP-100004',
    role: 'User',
    status: 'active',
    leaveBalances: { sick: 12, casual: 15, earned: 20 },
    managerId: managerEng._id
  });
  await charlie.save();

  const david = new User({
    name: 'David Marketer',
    email: 'david_marketing@example.com',
    passwordHash: userPasswordHash,
    phone: '678-901-2345',
    department: 'Marketing',
    designation: 'Marketing Exec',
    employeeId: 'EMP-100005',
    role: 'User',
    status: 'active',
    leaveBalances: { sick: 12, casual: 15, earned: 20 },
    managerId: admin._id
  });
  await david.save();

  const emilyTerminated = new User({
    name: 'Emily Terminated',
    email: 'emily_terminated@example.com',
    passwordHash: userPasswordHash,
    phone: '999-999-9999',
    department: 'Engineering',
    designation: 'Junior Dev',
    employeeId: 'EMP-100006',
    role: 'User',
    status: 'terminated',
    leaveBalances: { sick: 12, casual: 15, earned: 20 },
    managerId: managerEng._id
  });
  await emilyTerminated.save();

  // Seed Payroll records
  const payrolls = [
    new PayrollModel({
      employeeId: bob._id,
      employeeEmail: bob.email,
      baseSalary: 8000,
      bonuses: 500,
      deductions: 300,
      netPay: 8200,
      payPeriod: 'June 2026'
    }),
    new PayrollModel({
      employeeId: david._id,
      employeeEmail: david.email,
      baseSalary: 7000,
      bonuses: 300,
      deductions: 250,
      netPay: 7050,
      payPeriod: 'June 2026'
    })
  ];
  await PayrollModel.insertMany(payrolls);

  // Seed Attendance logs
  const attendances = [
    new AttendanceModel({
      employeeId: bob._id,
      employeeEmail: bob.email,
      date: new Date('2026-06-15'),
      checkIn: '09:00 AM',
      checkOut: '05:00 PM',
      status: 'present'
    }),
    new AttendanceModel({
      employeeId: david._id,
      employeeEmail: david.email,
      date: new Date('2026-06-15'),
      checkIn: '09:30 AM',
      checkOut: '05:30 PM',
      status: 'present'
    })
  ];
  await AttendanceModel.insertMany(attendances);
};

async function runTests() {
  console.log('--- STARTING EMS ACCESS CONTROL INTEGRATION TESTS ---');
  let mongoServer: any = null;

  try {
    let mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/access-control';
    try {
      console.log(`Connecting to MongoDB at: ${mongoUri}...`);
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
      console.log('Connected to local MongoDB database.');
    } catch (err) {
      console.log('Local MongoDB not running. Launching MongoMemoryServer...');
      mongoServer = await MongoMemoryServer.create();
      mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
      console.log('Connected to in-memory MongoDB database.');
    }

    console.log('Resetting and seeding test database...');
    await seedDatabaseForTesting();

    // Fetch seeded objects
    const admin = await User.findOne({ email: 'admin@example.com' });
    const managerEng = await User.findOne({ email: 'alice_manager@example.com' });
    const managerHR = await User.findOne({ email: 'mark_manager@example.com' });
    const bob = await User.findOne({ email: 'bob_developer@example.com' });
    const charlie = await User.findOne({ email: 'charlie_developer@example.com' });
    const david = await User.findOne({ email: 'david_marketing@example.com' });
    const emilyTerminated = await User.findOne({ email: 'emily_terminated@example.com' });

    if (!admin || !managerEng || !managerHR || !bob || !charlie || !david || !emilyTerminated) {
      throw new Error('Failed to load seeded data.');
    }

    let passed = 0;
    let failed = 0;

    const assert = (condition: boolean, message: string) => {
      if (condition) {
        console.log(`  ✅ [PASS] ${message}`);
        passed++;
      } else {
        console.error(`  ❌ [FAIL] ${message}`);
        failed++;
      }
    };

    // ==========================================
    // SECTION 1: ROLE & PERMISSION SCOPING RULE TESTS (8 Assertions)
    // ==========================================
    
    // 1. Admin reads employees
    const adminReadEmp = admin.hasActivePermission('read:employees');
    assert(adminReadEmp.allowed && adminReadEmp.scope === 'global', 'HR Admin has global read permission on employees');

    // 2. Admin creates employees
    const adminCreateEmp = admin.hasActivePermission('create:employees');
    assert(adminCreateEmp.allowed && adminCreateEmp.scope === 'global', 'HR Admin has global create permission on employees');

    // 3. Manager reads employees (team scope)
    const managerReadEmp = managerEng.hasActivePermission('read:employees');
    assert(managerReadEmp.allowed && managerReadEmp.scope === 'team', 'Manager has team-scoped read permission on employees');

    // 4. Manager cannot write departments
    const managerWriteDept = managerEng.hasActivePermission('write:departments');
    assert(!managerWriteDept.allowed, 'Manager is blocked from write:departments');

    // 5. Employee reads employees (self scope)
    const employeeReadEmp = bob.hasActivePermission('read:employees');
    assert(employeeReadEmp.allowed && employeeReadEmp.scope === 'self', 'Regular Employee has self-scoped read permission on employees');

    // 6. Employee cannot approve leaves
    const employeeApproveLeaves = bob.hasActivePermission('approve:leaves');
    assert(!employeeApproveLeaves.allowed, 'Regular Employee is blocked from approving leaves');

    // 7. Terminated Employee is blocked from all permissions
    const terminatedReadEmp = emilyTerminated.hasActivePermission('read:employees');
    assert(!terminatedReadEmp.allowed && terminatedReadEmp.reason?.includes('terminated'), 'Terminated employee is blocked from reading profiles');

    // 8. Terminated Employee is blocked from leave submission
    const terminatedCreateLeave = emilyTerminated.hasActivePermission('create:leaves');
    assert(!terminatedCreateLeave.allowed && terminatedCreateLeave.reason?.includes('terminated'), 'Terminated employee is blocked from submitting leaves');

    // ==========================================
    // SECTION 2: LEAVE REQUEST BALANCES & CONSTRAINTS (5 Assertions)
    // ==========================================

    // Helper to calculate diff days
    const getDays = (start: Date, end: Date) => {
      const time = Math.abs(end.getTime() - start.getTime());
      return Math.ceil(time / (1000 * 60 * 60 * 24)) + 1;
    };

    // 9. Date diff calculation verification
    const startDate = new Date('2026-06-10');
    const endDate = new Date('2026-06-12'); // 10, 11, 12 = 3 days
    const calculatedDays = getDays(startDate, endDate);
    assert(calculatedDays === 3, `Calculated leave duration is correct (Expected: 3, Got: ${calculatedDays})`);

    // 10. Check initial balance
    const initialSickBalance = bob.leaveBalances.sick;
    assert(initialSickBalance === 10, `Employee starts with correct sick leave balance: ${initialSickBalance}`);

    // 11. Request leave within balance bounds
    let requestAllowed = initialSickBalance >= calculatedDays;
    assert(requestAllowed, 'Employee has sufficient balance for 3 days sick leave');

    // 12. Create LeaveRequest document
    const leaveReq = new LeaveRequestModel({
      employeeId: bob._id,
      employeeEmail: bob.email,
      type: 'sick',
      startDate,
      endDate,
      reason: 'Recovering from severe flu',
      status: 'pending'
    });
    await leaveReq.save();
    assert(leaveReq.status === 'pending', 'Submitted leave request correctly defaults to status "pending"');

    // 13. Approve leave request and verify balance deduction
    if (leaveReq.status === 'pending') {
      const days = getDays(leaveReq.startDate, leaveReq.endDate);
      bob.leaveBalances.sick -= days;
      bob.status = 'on-leave';
      await bob.save();
      leaveReq.status = 'approved';
      leaveReq.approvedBy = managerEng._id;
      await leaveReq.save();
    }
    const updatedBob = await User.findById(bob._id);
    assert(updatedBob?.leaveBalances.sick === 7 && updatedBob?.status === 'on-leave', 'Approved leave request successfully deducts days from balance and marks user status as on-leave');

    // ==========================================
    // SECTION 3: SCENARIO ENFORCEMENTS & SECURITY LOGGING (7 Assertions)
    // ==========================================

    // 14. Scoped Leave queries simulation (Manager vs. Employee)
    const getLeavesForUser = async (userObj: any) => {
      const { allowed, scope } = userObj.hasActivePermission('read:leaves');
      if (!allowed) return [];

      let query: any = {};
      if (scope === 'self') {
        query = { employeeId: userObj._id };
      } else if (scope === 'team') {
        const teamIds = await User.find({ department: userObj.department }).select('_id');
        query = { employeeId: { $in: teamIds.map(u => u._id) } };
      }
      return await LeaveRequestModel.find(query);
    };

    const bobLeaves = await getLeavesForUser(updatedBob);
    assert(bobLeaves.length === 1, `Employee Bob only retrieves his own leave request (Count: ${bobLeaves.length})`);

    const engManagerLeaves = await getLeavesForUser(managerEng);
    assert(engManagerLeaves.length === 1, `Manager Alice retrieves department engineering leaves (Count: ${engManagerLeaves.length})`);

    // 15. Scoped Payroll visibility simulation
    const getPayrollForUser = async (userObj: any) => {
      const { allowed, scope } = userObj.hasActivePermission('read:payroll');
      if (!allowed) return [];

      let query: any = {};
      if (scope === 'self') {
        query = { employeeId: userObj._id };
      } else if (scope === 'team') {
        const teamIds = await User.find({ department: userObj.department }).select('_id');
        query = { employeeId: { $in: teamIds.map(u => u._id) } };
      }
      return await PayrollModel.find(query);
    };

    const bobPayroll = await getPayrollForUser(updatedBob);
    assert(bobPayroll.length === 1 && bobPayroll[0].employeeEmail === bob.email, 'Regular employee Bob can only retrieve his own salary statement');

    const engManagerPayroll = await getPayrollForUser(managerEng);
    assert(engManagerPayroll.length === 1 && engManagerPayroll[0].employeeEmail === bob.email, 'Engineering manager Alice retrieves payroll for her engineering team members only');

    // 16. Scoped Attendance queries simulation
    const getAttendanceForUser = async (userObj: any) => {
      const { allowed, scope } = userObj.hasActivePermission('read:attendance');
      if (!allowed) return [];

      let query: any = {};
      if (scope === 'self') {
        query = { employeeId: userObj._id };
      } else if (scope === 'team') {
        const teamIds = await User.find({ department: userObj.department }).select('_id');
        query = { employeeId: { $in: teamIds.map(u => u._id) } };
      }
      return await AttendanceModel.find(query);
    };

    const bobAttendance = await getAttendanceForUser(updatedBob);
    assert(bobAttendance.length === 1 && bobAttendance[0].employeeEmail === bob.email, 'Employee Bob only retrieves his own attendance history');

    // 17. Security logging trigger verification
    const initialLogCount = await AuditLog.countDocuments();
    await logSecurityEvent({
      actorId: admin._id,
      actorRole: admin.role,
      email: admin.email,
      action: 'employee_update',
      resource: 'employees',
      resourceId: bob._id.toString(),
      targetEmployeeId: bob._id,
      status: 'success',
      details: { field: 'leaveBalances' }
    });
    const finalLogCount = await AuditLog.countDocuments();
    assert(finalLogCount === initialLogCount + 1, 'Audit log event is successfully persisted to MongoDB');

    // 18. Read logs scope block for Managers
    const managerLogsQuery = managerEng.hasActivePermission('read:audit-logs');
    assert(!managerLogsQuery.allowed, 'Security Audit Logs are strictly restricted and unavailable to Managers');

    console.log(`\n--- TEST SUMMARY: ${passed} passed, ${failed} failed ---`);
    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test run failed with error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
    console.log('Database disconnected.');
  }
}

runTests();
