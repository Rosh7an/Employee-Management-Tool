import express, { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { logSecurityEvent } from '../utils/auditLogger.js';

const router = express.Router();

// Helper to generate default permissions based on role
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

// POST /register
router.post('/register', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password, team, role, name, phone, designation, employmentType, managerId } = req.body;

    if (!email || !password || !team) {
      return res.status(400).json({ message: 'Email, password, and department team are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already registered' });
    }

    const finalRole = (role || 'User') as 'Admin' | 'Manager' | 'User';
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Auto-resolve empty fields for compatibility
    const resolvedName = name || email.split('@')[0].split(/[_.]/).map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
    const resolvedDesignation = designation || (finalRole === 'Admin' ? 'HR Specialist' : finalRole === 'Manager' ? 'Engineering Lead' : 'Software Developer');
    const resolvedEmployeeId = 'EMP-' + Math.floor(100000 + Math.random() * 900000);

    const user = new User({
      name: resolvedName,
      email: email.toLowerCase(),
      passwordHash,
      phone: phone || '',
      department: team,
      designation: resolvedDesignation,
      employeeId: resolvedEmployeeId,
      dateOfJoining: new Date(),
      employmentType: employmentType || 'full-time',
      status: 'active',
      managerId: managerId ? new mongoose.Types.ObjectId(managerId) : undefined,
      role: finalRole,
      permissions: getDefaultPermissions(finalRole)
    });

    await user.save();

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    await logSecurityEvent({
      userId: user._id.toString(),
      email: user.email,
      action: 'employee_register',
      resource: 'employees',
      status: 'success',
      details: { role: finalRole, department: team },
      req: req as any,
    });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        department: user.department,
        designation: user.designation,
        employeeId: user.employeeId,
        dateOfJoining: user.dateOfJoining,
        employmentType: user.employmentType,
        status: user.status,
        managerId: user.managerId,
        role: user.role,
        permissions: user.permissions,
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /login
router.post('/login', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      await logSecurityEvent({
        action: 'employee_login_failed',
        resource: 'employees',
        status: 'denied',
        details: { email, reason: 'Invalid email' },
        req: req as any,
      });
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      await logSecurityEvent({
        userId: user._id.toString(),
        email: user.email,
        action: 'employee_login_failed',
        resource: 'employees',
        status: 'denied',
        details: { reason: 'Incorrect password' },
        req: req as any,
      });
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.status === 'terminated') {
      await logSecurityEvent({
        userId: user._id.toString(),
        email: user.email,
        action: 'employee_login_terminated',
        resource: 'employees',
        status: 'denied',
        details: { reason: 'Account is terminated' },
        req: req as any,
      });
      return res.status(403).json({ message: 'Your account has been terminated' });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    await logSecurityEvent({
      userId: user._id.toString(),
      email: user.email,
      action: 'employee_login_success',
      resource: 'employees',
      status: 'success',
      req: req as any,
    });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        department: user.department,
        designation: user.designation,
        employeeId: user.employeeId,
        dateOfJoining: user.dateOfJoining,
        employmentType: user.employmentType,
        status: user.status,
        managerId: user.managerId,
        role: user.role,
        permissions: user.permissions,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /me
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      department: req.user.department,
      designation: req.user.designation,
      employeeId: req.user.employeeId,
      dateOfJoining: req.user.dateOfJoining,
      employmentType: req.user.employmentType,
      status: req.user.status,
      managerId: req.user.managerId,
      role: req.user.role,
      permissions: req.user.permissions,
    }
  });
});

export default router;
