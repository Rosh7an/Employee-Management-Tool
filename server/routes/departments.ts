import express, { Response } from 'express';
import DepartmentModel from '../models/Department.js';
import { authenticateToken, requirePermission, AuthenticatedRequest } from '../middleware/auth.js';
import { logSecurityEvent } from '../utils/auditLogger.js';

const router = express.Router();

router.use(authenticateToken);

// GET / - Read departments listing (available to all roles)
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const departments = await DepartmentModel.find()
      .populate('managerId', 'name email employeeId')
      .sort({ name: 1 });
    res.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST / - Create a new department (Admin only)
router.post('/', requirePermission('write:departments'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, managerId, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Department name is required' });
    }

    const existingDept = await DepartmentModel.findOne({ name: name.trim() });
    if (existingDept) {
      return res.status(400).json({ message: 'Department name already exists' });
    }

    const dept = new DepartmentModel({
      name: name.trim(),
      managerId: managerId || undefined,
      description: description || '',
    });

    await dept.save();

    await logSecurityEvent({
      action: 'department_create',
      resource: 'departments',
      resourceId: dept._id.toString(),
      status: 'success',
      details: { name, managerId },
      req: req as any,
    });

    res.status(201).json(dept);
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /:id - Edit department details (Admin only)
router.put('/:id', requirePermission('write:departments'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, managerId, description } = req.body;

    const dept = await DepartmentModel.findById(id);
    if (!dept) {
      return res.status(404).json({ message: 'Department not found' });
    }

    if (name) dept.name = name.trim();
    if (managerId !== undefined) dept.managerId = managerId || undefined;
    if (description !== undefined) dept.description = description;

    await dept.save();

    await logSecurityEvent({
      action: 'department_edit',
      resource: 'departments',
      resourceId: id,
      status: 'success',
      details: { name, managerId },
      req: req as any,
    });

    res.json(dept);
  } catch (error) {
    console.error('Error editing department:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /:id - Delete department (Admin only)
router.delete('/:id', requirePermission('write:departments'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const dept = await DepartmentModel.findById(id);
    if (!dept) {
      return res.status(404).json({ message: 'Department not found' });
    }

    await DepartmentModel.findByIdAndDelete(id);

    await logSecurityEvent({
      action: 'department_delete',
      resource: 'departments',
      resourceId: id,
      status: 'success',
      details: { name: dept.name },
      req: req as any,
    });

    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
