import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { MongoMemoryServer } from 'mongodb-memory-server';

import authRouter from './routes/auth.js';
import employeesRouter from './routes/employees.js';
import departmentsRouter from './routes/departments.js';
import leavesRouter from './routes/leaves.js';
import payrollRouter from './routes/payroll.js';
import attendanceRouter from './routes/attendance.js';
import adminRouter from './routes/admin.js';
import dbRouter from './routes/db.js';

import User from './models/User.js';
import DepartmentModel from './models/Department.js';
import LeaveRequestModel from './models/LeaveRequest.js';
import PayrollModel from './models/Payroll.js';
import AttendanceModel from './models/Attendance.js';
import AuditLog from './models/AuditLog.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/departments', departmentsRouter);
app.use('/api/leaves', leavesRouter);
app.use('/api/payroll', payrollRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/admin', adminRouter);
app.use('/api/db', dbRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' 
  });
});

// Database Connection & Server Startup
const startServer = async () => {
  try {
    let mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/access-control';
    try {
      console.log(`Attempting connection to MongoDB at: ${mongoUri}...`);
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
      console.log('Connected to local/configured MongoDB successfully.');
    } catch (err) {
      console.log('Local MongoDB connection failed. Launching in-memory MongoDB server...');
      const mongoServer = await MongoMemoryServer.create();
      mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
      console.log('Connected to in-memory MongoDB successfully.');
    }

    // Seed data if database is empty
    await seedDatabase();

    app.listen(PORT, () => {
      console.log(`Backend server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

const seedDatabase = async () => {
  const userCount = await User.countDocuments();
  if (userCount > 0) {
    console.log('Database already has data. Skipping seed.');
    return;
  }

  console.log('Database is empty. Seeding initial EMS data...');

  // Create hash passwords (8 characters or more)
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const userPasswordHash = await bcrypt.hash('user1234', 10);

  // Helper to generate default permissions based on role (mirrors auth.ts logic)
  const getDefaultPermissions = (role: 'Admin' | 'Manager' | 'User') => {
    switch (role) {
      case 'Admin':
        return [
          { action: 'read:employees', scope: 'global' as const },
          { action: 'create:employees', scope: 'global' as const },
          { action: 'edit:employees', scope: 'global' as const },
          { action: 'delete:employees', scope: 'global' as const },
          { action: 'read:departments', scope: 'global' as const },
          { action: 'write:departments', scope: 'global' as const },
          { action: 'read:leaves', scope: 'global' as const },
          { action: 'approve:leaves', scope: 'global' as const },
          { action: 'read:payroll', scope: 'global' as const },
          { action: 'read:attendance', scope: 'global' as const },
          { action: 'read:audit-logs', scope: 'global' as const },
        ];
      case 'Manager':
        return [
          { action: 'read:employees', scope: 'team' as const },
          { action: 'edit:employees', scope: 'team' as const },
          { action: 'read:leaves', scope: 'team' as const },
          { action: 'create:leaves', scope: 'self' as const },
          { action: 'approve:leaves', scope: 'team' as const },
          { action: 'read:payroll', scope: 'team' as const },
          { action: 'read:attendance', scope: 'team' as const },
        ];
      case 'User':
      default:
        return [
          { action: 'read:employees', scope: 'self' as const },
          { action: 'edit:employees', scope: 'self' as const },
          { action: 'read:leaves', scope: 'self' as const },
          { action: 'create:leaves', scope: 'self' as const },
          { action: 'read:payroll', scope: 'self' as const },
          { action: 'read:attendance', scope: 'self' as const },
        ];
    }
  };

  // 1. Create Admins and Managers first to establish managerId links
  const admin = new User({
    name: 'HR Admin',
    email: 'admin@example.com',
    passwordHash: adminPasswordHash,
    phone: '123-456-7890',
    department: 'HR',
    designation: 'HR Director',
    employeeId: 'EMP-100000',
    dateOfJoining: new Date('2024-01-15'),
    employmentType: 'full-time',
    status: 'active',
    role: 'Admin',
    permissions: getDefaultPermissions('Admin'),
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
    dateOfJoining: new Date('2024-03-20'),
    employmentType: 'full-time',
    status: 'active',
    role: 'Manager',
    permissions: getDefaultPermissions('Manager'),
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
    dateOfJoining: new Date('2024-06-01'),
    employmentType: 'full-time',
    status: 'active',
    role: 'Manager',
    permissions: getDefaultPermissions('Manager'),
    leaveBalances: { sick: 12, casual: 15, earned: 20 },
    managerId: admin._id
  });
  await managerHR.save();

  // 2. Create Departments linking managers
  const engDept = new DepartmentModel({
    name: 'Engineering',
    managerId: managerEng._id,
    description: 'Product Development, Software Engineering & Systems Operations'
  });
  const hrDept = new DepartmentModel({
    name: 'HR',
    managerId: managerHR._id,
    description: 'Human Resources, Talent Acquisition & Employee Relations'
  });
  const mktDept = new DepartmentModel({
    name: 'Marketing',
    description: 'Brand Management, Social Media & Digital Marketing Campaigns'
  });
  await engDept.save();
  await hrDept.save();
  await mktDept.save();

  // 3. Create Employees
  const bob = new User({
    name: 'Bob Developer',
    email: 'bob_developer@example.com',
    passwordHash: userPasswordHash,
    phone: '456-789-0123',
    department: 'Engineering',
    designation: 'Senior Developer',
    employeeId: 'EMP-100003',
    dateOfJoining: new Date('2024-09-10'),
    employmentType: 'full-time',
    status: 'active',
    role: 'User',
    permissions: getDefaultPermissions('User'),
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
    dateOfJoining: new Date('2025-01-10'),
    employmentType: 'full-time',
    status: 'active',
    role: 'User',
    permissions: getDefaultPermissions('User'),
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
    designation: 'Marketing Manager',
    employeeId: 'EMP-100005',
    dateOfJoining: new Date('2024-11-01'),
    employmentType: 'full-time',
    status: 'active',
    role: 'User',
    permissions: getDefaultPermissions('User'),
    leaveBalances: { sick: 8, casual: 10, earned: 18 },
    managerId: admin._id
  });
  await david.save();

  const emily = new User({
    name: 'Emily Staff',
    email: 'emily_hr@example.com',
    passwordHash: userPasswordHash,
    phone: '789-012-3456',
    department: 'HR',
    designation: 'HR Coordinator',
    employeeId: 'EMP-100006',
    dateOfJoining: new Date('2025-02-15'),
    employmentType: 'part-time',
    status: 'active',
    role: 'User',
    permissions: getDefaultPermissions('User'),
    leaveBalances: { sick: 12, casual: 15, earned: 20 },
    managerId: managerHR._id
  });
  await emily.save();

  const frank = new User({
    name: 'Frank Contractor',
    email: 'frank_contractor@example.com',
    passwordHash: userPasswordHash,
    phone: '890-123-4567',
    department: 'Engineering',
    designation: 'Contract Devops Specialist',
    employeeId: 'EMP-100007',
    dateOfJoining: new Date('2025-04-01'),
    employmentType: 'contract',
    status: 'active',
    role: 'User',
    permissions: getDefaultPermissions('User'),
    leaveBalances: { sick: 5, casual: 5, earned: 5 },
    managerId: managerEng._id
  });
  await frank.save();

  console.log('EMS users and departments seeded successfully.');

  // 4. Seed Leave Requests
  const leaves = [
    new LeaveRequestModel({
      employeeId: bob._id,
      employeeEmail: bob.email,
      type: 'sick',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-06-03'),
      reason: 'Recovering from severe seasonal flu',
      status: 'approved',
      approvedBy: managerEng._id
    }),
    new LeaveRequestModel({
      employeeId: bob._id,
      employeeEmail: bob.email,
      type: 'casual',
      startDate: new Date('2026-06-24'),
      endDate: new Date('2026-06-25'),
      reason: 'Attending personal family function',
      status: 'pending'
    }),
    new LeaveRequestModel({
      employeeId: charlie._id,
      employeeEmail: charlie.email,
      type: 'earned',
      startDate: new Date('2026-07-05'),
      endDate: new Date('2026-07-09'),
      reason: 'Summer vacation trip with family',
      status: 'approved',
      approvedBy: managerEng._id
    }),
    new LeaveRequestModel({
      employeeId: david._id,
      employeeEmail: david.email,
      type: 'casual',
      startDate: new Date('2026-06-20'),
      endDate: new Date('2026-06-20'),
      reason: 'Urgent home maintenance services',
      status: 'pending'
    }),
    new LeaveRequestModel({
      employeeId: emily._id,
      employeeEmail: emily.email,
      type: 'sick',
      startDate: new Date('2026-05-12'),
      endDate: new Date('2026-05-13'),
      reason: 'Doctor prescribed rest due to migraine',
      status: 'rejected',
      approvedBy: managerHR._id
    })
  ];
  await LeaveRequestModel.insertMany(leaves);
  console.log('EMS leave requests seeded.');

  // 5. Seed Payrolls (June 2026 period)
  const payrolls = [
    new PayrollModel({
      employeeId: admin._id,
      employeeEmail: admin.email,
      baseSalary: 12000,
      bonuses: 1000,
      deductions: 500,
      netPay: 12500,
      payPeriod: 'June 2026'
    }),
    new PayrollModel({
      employeeId: managerEng._id,
      employeeEmail: managerEng.email,
      baseSalary: 10000,
      bonuses: 800,
      deductions: 400,
      netPay: 10400,
      payPeriod: 'June 2026'
    }),
    new PayrollModel({
      employeeId: managerHR._id,
      employeeEmail: managerHR.email,
      baseSalary: 9000,
      bonuses: 700,
      deductions: 350,
      netPay: 9350,
      payPeriod: 'June 2026'
    }),
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
      employeeId: charlie._id,
      employeeEmail: charlie.email,
      baseSalary: 6000,
      bonuses: 300,
      deductions: 200,
      netPay: 6100,
      payPeriod: 'June 2026'
    }),
    new PayrollModel({
      employeeId: david._id,
      employeeEmail: david.email,
      baseSalary: 7500,
      bonuses: 400,
      deductions: 250,
      netPay: 7650,
      payPeriod: 'June 2026'
    }),
    new PayrollModel({
      employeeId: emily._id,
      employeeEmail: emily.email,
      baseSalary: 4500,
      bonuses: 200,
      deductions: 150,
      netPay: 4550,
      payPeriod: 'June 2026'
    }),
    new PayrollModel({
      employeeId: frank._id,
      employeeEmail: frank.email,
      baseSalary: 7000,
      bonuses: 0,
      deductions: 100,
      netPay: 6900,
      payPeriod: 'June 2026'
    })
  ];
  await PayrollModel.insertMany(payrolls);
  console.log('EMS payroll slips seeded.');

  // 6. Seed Attendance logs for past 3 days: June 15, 16, 17
  const attendanceLogs: any[] = [];
  const employees = [admin, managerEng, managerHR, bob, charlie, david, emily, frank];
  const dates = [
    new Date('2026-06-15'),
    new Date('2026-06-16'),
    new Date('2026-06-17')
  ];

  for (const emp of employees) {
    for (const d of dates) {
      // Bob is absent on June 15
      if (emp.email === 'bob_developer@example.com' && d.getDate() === 15) {
        attendanceLogs.push({
          employeeId: emp._id,
          employeeEmail: emp.email,
          date: d,
          status: 'absent'
        });
      } else {
        attendanceLogs.push({
          employeeId: emp._id,
          employeeEmail: emp.email,
          date: d,
          checkIn: '09:00 AM',
          checkOut: '05:00 PM',
          status: emp.employmentType === 'part-time' ? 'half-day' : 'present'
        });
      }
    }
  }
  await AttendanceModel.insertMany(attendanceLogs);
  console.log('EMS attendance logs seeded.');

  // Seed initial audit log for system startup
  const startupLog = new AuditLog({
    timestamp: new Date(),
    action: 'system_seed',
    resource: 'system',
    status: 'success',
    details: { message: 'Database initialized and seeded with complete Access Control & EMS structures.' }
  });
  await startupLog.save();
  console.log('Database initial seed complete.');
};

startServer();
