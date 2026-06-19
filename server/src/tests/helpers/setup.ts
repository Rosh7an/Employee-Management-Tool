import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../../models/User';
import Employee from '../../models/Employee';
import Department from '../../models/Department';
import { env } from '../../config/env';

let mongoServer: MongoMemoryServer;

export async function startDB() {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
}

export async function stopDB() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mongoServer.stop();
}

export async function clearDB() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

export interface TestUsers {
  adminToken: string;
  managerToken: string;
  employeeToken: string;
  adminEmployeeId: string;
  managerEmployeeId: string;
  employeeRecordId: string;
  departmentId: string;
  otherDepartmentId: string;
}

export async function seedTestUsers(): Promise<TestUsers> {
  const hash = await bcrypt.hash('Password@123', 10);

  const [dept, otherDept] = await Department.insertMany([
    { name: 'Engineering' },
    { name: 'Marketing' },
  ]);

  const adminEmp = await Employee.create({
    employeeId: 'EMP-T001',
    name: 'Admin User',
    email: 'admin@test.com',
    designation: 'HR Admin',
    department: null,
    status: 'active',
    dateOfJoining: new Date(),
  });

  const managerEmp = await Employee.create({
    employeeId: 'EMP-T002',
    name: 'Manager User',
    email: 'manager@test.com',
    designation: 'Engineering Lead',
    department: dept._id,
    status: 'active',
    dateOfJoining: new Date(),
  });

  const regularEmp = await Employee.create({
    employeeId: 'EMP-T003',
    name: 'Regular Employee',
    email: 'employee@test.com',
    designation: 'Developer',
    department: dept._id,
    managerId: managerEmp._id,
    status: 'active',
    dateOfJoining: new Date(),
  });

  const adminUser = await User.create({
    name: 'Admin User',
    email: 'admin@test.com',
    passwordHash: hash,
    role: 'admin',
    employeeId: adminEmp._id,
  });

  const managerUser = await User.create({
    name: 'Manager User',
    email: 'manager@test.com',
    passwordHash: hash,
    role: 'manager',
    employeeId: managerEmp._id,
  });

  const employeeUser = await User.create({
    name: 'Regular Employee',
    email: 'employee@test.com',
    passwordHash: hash,
    role: 'employee',
    employeeId: regularEmp._id,
  });

  const makeToken = (user: any, emp: any) =>
    jwt.sign(
      {
        userId: user._id.toString(),
        role: user.role,
        employeeId: emp._id.toString(),
        departmentId: emp.department ? emp.department.toString() : null,
        isDirector: user.isDirector ?? false,
      },
      env.JWT_SECRET,
      { expiresIn: '10y' }  // long-lived so fake-timer shifts don't invalidate them
    );

  return {
    adminToken: makeToken(adminUser, adminEmp),
    managerToken: makeToken(managerUser, managerEmp),
    employeeToken: makeToken(employeeUser, regularEmp),
    adminEmployeeId: adminEmp._id.toString(),
    managerEmployeeId: managerEmp._id.toString(),
    employeeRecordId: regularEmp._id.toString(),
    departmentId: dept._id.toString(),
    otherDepartmentId: otherDept._id.toString(),
  };
}

