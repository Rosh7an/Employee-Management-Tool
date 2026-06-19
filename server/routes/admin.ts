import express, { Response } from 'express';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import { logSecurityEvent } from '../utils/auditLogger.js';

const router = express.Router();

// Enforce admin privileges on all endpoints in this router
router.use(authenticateToken);
router.use(requireAdmin);

// GET /api/admin/users - List all users
router.get('/users', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await User.find({}, '-passwordHash').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Admin users fetch error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/admin/users/:id/role-permissions - Update role, status, and permissions
router.put('/users/:id/role-permissions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { role, status, permissions } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent changing your own admin role or suspending yourself
    if (user._id.toString() === req.user!._id.toString()) {
      if (status === 'suspended' || role !== 'Admin') {
        return res.status(400).json({ message: 'Administrators cannot suspend themselves or revoke their own Admin role.' });
      }
    }

    if (role && ['Admin', 'Manager', 'User'].includes(role)) {
      user.role = role as 'Admin' | 'Manager' | 'User';
    }

    if (status && ['active', 'suspended'].includes(status)) {
      user.status = status as 'active' | 'suspended';
    }

    if (Array.isArray(permissions)) {
      // Validate permissions format
      const sanitizedPermissions = permissions.map(p => ({
        action: p.action,
        scope: (p.scope || 'self') as 'self' | 'team' | 'global',
        startTime: p.startTime ? new Date(p.startTime) : undefined,
        expiryTime: p.expiryTime ? new Date(p.expiryTime) : undefined,
        revoked: !!p.revoked,
      }));
      user.permissions = sanitizedPermissions;
    }

    await user.save();

    await logSecurityEvent({
      userId: req.user!._id.toString(),
      email: req.user!.email,
      action: 'admin_modify_user',
      resource: 'user',
      resourceId: user._id.toString(),
      status: 'success',
      details: {
        targetEmail: user.email,
        role: user.role,
        status: user.status,
        permissionsCount: user.permissions.length,
      },
      req: req as any,
    });

    res.json({
      message: 'User settings updated successfully',
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        department: user.department,
        status: user.status,
        permissions: user.permissions,
      }
    });
  } catch (error) {
    console.error('Admin user update error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/admin/audit-logs - View audit logs
router.get('/audit-logs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Return the 100 most recent logs (add pagination support if needed)
    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(100);
    res.json(logs);
  } catch (error) {
    console.error('Admin audit logs fetch error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
