import express, { Response } from 'express';
import User from '../models/User.js';
import { authenticateToken, requirePermission, AuthenticatedRequest } from '../middleware/auth.js';
import { logSecurityEvent } from '../utils/auditLogger.js';

const router = express.Router();

router.use(authenticateToken);

// GET / - Scoped employee query list
router.get('/', requirePermission('read:employees'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const scope = req.permissionScope;
    let query: any = {};

    if (scope === 'self') {
      query = { _id: req.user!._id };
    } else if (scope === 'team') {
      query = { department: req.user!.department };
    } // 'global' returns all

    const employees = await User.find(query)
      .select('-passwordHash')
      .populate('managerId', 'name email employeeId')
      .sort({ name: 1 });

    res.json({ employees, scope });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /:id - Retrieve detailed employee profile
router.get('/:id', requirePermission('read:employees'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const employee = await User.findById(id).select('-passwordHash');
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const scope = req.permissionScope;

    if (scope === 'self' && employee._id.toString() !== req.user!._id.toString()) {
      await logSecurityEvent({
        action: 'denied:view_employee_self',
        resource: 'employees',
        resourceId: id,
        status: 'denied',
        details: { reason: 'Employees are restricted to view their own profile only' },
        req: req as any,
      });
      return res.status(403).json({ message: 'Access denied. You can only view your own profile.' });
    }

    if (scope === 'team' && employee.department !== req.user!.department) {
      await logSecurityEvent({
        action: 'denied:view_employee_team',
        resource: 'employees',
        resourceId: id,
        status: 'denied',
        details: { reason: `Manager restricted to team department '${req.user!.department}'` },
        req: req as any,
      });
      return res.status(403).json({ message: `Access denied. You can only view profiles within your department (${req.user!.department}).` });
    }

    res.json(employee);
  } catch (error) {
    console.error('Error fetching employee details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST / - Create a new employee profile (HR Admin only)
router.post('/', requirePermission('create:employees'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, email, phone, department, designation, employeeId, employmentType, role, password, managerId } = req.body;

    if (!name || !email || !department || !designation || !employeeId || !password) {
      return res.status(400).json({ message: 'Missing required employee fields' });
    }

    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email address already in use' });
    }

    const existingId = await User.findOne({ employeeId: employeeId.trim() });
    if (existingId) {
      return res.status(400).json({ message: 'Employee ID already exists' });
    }

    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.default.hash(password, 10);

    const employee = new User({
      name,
      email: email.toLowerCase(),
      phone: phone || '',
      department,
      designation,
      employeeId,
      passwordHash,
      dateOfJoining: new Date(),
      employmentType: employmentType || 'full-time',
      status: 'active',
      role: role || 'User',
      managerId: managerId || undefined,
    });

    await employee.save();

    await logSecurityEvent({
      action: 'employee_create',
      resource: 'employees',
      resourceId: employee._id.toString(),
      targetEmployeeId: employee._id,
      status: 'success',
      details: { name, email, department, designation },
      req: req as any,
    });

    res.status(201).json(employee);
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /:id - Scoped update to employee records
router.put('/:id', requirePermission('edit:employees'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const employee = await User.findById(id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee profile not found' });
    }

    const scope = req.permissionScope;

    // 1. Employee self-edit check (Phone only)
    if (scope === 'self') {
      if (employee._id.toString() !== req.user!._id.toString()) {
        return res.status(403).json({ message: 'Access denied. You can only edit your own details.' });
      }
      
      const { phone } = req.body;
      employee.phone = phone || '';
      await employee.save();

      await logSecurityEvent({
        action: 'employee_self_edit',
        resource: 'employees',
        resourceId: id,
        targetEmployeeId: employee._id,
        status: 'success',
        details: { phone },
        req: req as any,
      });

      return res.json(employee);
    }

    // 2. Manager team-edit check (Status active/on-leave only)
    if (scope === 'team') {
      if (employee.department !== req.user!.department) {
        return res.status(403).json({ message: 'Access denied. Managers can only update status for their own team.' });
      }

      const { status } = req.body;
      if (status && ['active', 'on-leave'].includes(status)) {
        employee.status = status;
      } else if (status === 'terminated') {
        return res.status(403).json({ message: 'Access denied. Managers cannot terminate employees.' });
      }
      
      await employee.save();

      await logSecurityEvent({
        action: 'employee_manager_edit',
        resource: 'employees',
        resourceId: id,
        targetEmployeeId: employee._id,
        status: 'success',
        details: { status },
        req: req as any,
      });

      return res.json(employee);
    }

    // 3. HR Admin Full access edit
    if (scope === 'global') {
      const { name, phone, department, designation, employmentType, status, role, managerId } = req.body;

      if (name) employee.name = name;
      if (phone !== undefined) employee.phone = phone;
      if (department) employee.department = department;
      if (designation) employee.designation = designation;
      if (employmentType) employee.employmentType = employmentType;
      if (status) employee.status = status;
      if (role) employee.role = role;
      if (managerId !== undefined) employee.managerId = managerId || undefined;

      await employee.save();

      await logSecurityEvent({
        action: 'employee_admin_edit',
        resource: 'employees',
        resourceId: id,
        targetEmployeeId: employee._id,
        status: 'success',
        details: { name, department, designation, status, role },
        req: req as any,
      });

      return res.json(employee);
    }

    res.status(403).json({ message: 'Access denied.' });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /:id - Terminate / Delete employee profile (HR Admin only)
router.delete('/:id', requirePermission('delete:employees'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const employee = await User.findById(id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee profile not found' });
    }

    // Admins only
    await User.findByIdAndDelete(id);

    await logSecurityEvent({
      action: 'employee_delete',
      resource: 'employees',
      resourceId: id,
      targetEmployeeId: employee._id,
      status: 'success',
      details: { name: employee.name, email: employee.email },
      req: req as any,
    });

    res.json({ message: 'Employee profile deleted successfully' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
