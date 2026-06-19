import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IPermission {
  action: string;
  scope: 'self' | 'team' | 'global';
  startTime?: Date;
  expiryTime?: Date;
  revoked?: boolean;
}

export interface ILeaveBalances {
  sick: number;
  casual: number;
  earned: number;
}

export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  phone?: string;
  department: string; // Engineering, Marketing, HR, etc.
  designation: string; // Software Engineer, HR Manager, etc.
  employeeId: string; // Unique employee ID
  dateOfJoining: Date;
  employmentType: 'full-time' | 'part-time' | 'contract';
  status: 'active' | 'on-leave' | 'terminated';
  managerId?: mongoose.Types.ObjectId; // Reports to
  profilePhoto?: string;
  role: 'Admin' | 'Manager' | 'User'; // Maps to HR Admin, Manager, Employee in UI
  permissions: IPermission[]; // Preserved for compatibility/extensions
  leaveBalances: ILeaveBalances;
}

export interface IUserDocument extends IUser, Document {
  hasActivePermission(action: string): { allowed: boolean; scope?: 'self' | 'team' | 'global'; reason?: string };
}

const permissionSchema = new Schema<IPermission>({
  action: {
    type: String,
    required: true,
  },
  scope: {
    type: String,
    enum: ['self', 'team', 'global'],
    default: 'self',
  },
  startTime: {
    type: Date,
  },
  expiryTime: {
    type: Date,
  },
  revoked: {
    type: Boolean,
    default: false,
  }
}, { _id: false });

const userSchema = new Schema<IUserDocument>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'],
  },
  passwordHash: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  department: {
    type: String,
    required: true,
    trim: true,
  },
  designation: {
    type: String,
    required: true,
    trim: true,
  },
  employeeId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  dateOfJoining: {
    type: Date,
    required: true,
    default: Date.now,
  },
  employmentType: {
    type: String,
    enum: ['full-time', 'part-time', 'contract'],
    default: 'full-time',
  },
  status: {
    type: String,
    enum: ['active', 'on-leave', 'terminated'],
    default: 'active',
  },
  managerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  profilePhoto: {
    type: String,
  },
  role: {
    type: String,
    enum: ['Admin', 'Manager', 'User'],
    default: 'User',
  },
  permissions: [permissionSchema],
  leaveBalances: {
    sick: { type: Number, default: 12 },
    casual: { type: Number, default: 15 },
    earned: { type: Number, default: 20 }
  }
}, {
  timestamps: true,
});

// Helper method to check if a specific action is allowed and resolve its scope
userSchema.methods.hasActivePermission = function(this: IUserDocument, action: string) {
  if (this.status === 'terminated') {
    return { allowed: false, reason: 'Employee is terminated' };
  }

  // HR Admin (Admin) bypasses all restrictions and has global scope
  if (this.role === 'Admin') {
    return { allowed: true, scope: 'global' };
  }

  // Manager Scopes
  if (this.role === 'Manager') {
    if (action === 'read:employees' || action === 'edit:employees') {
      return { allowed: true, scope: 'team' };
    }
    if (action === 'read:leaves' || action === 'approve:leaves') {
      return { allowed: true, scope: 'team' };
    }
    if (action === 'create:leaves') {
      return { allowed: true, scope: 'self' };
    }
    if (action === 'read:payroll' || action === 'read:attendance') {
      return { allowed: true, scope: 'team' };
    }
    if (action === 'read:audit-logs') {
      return { allowed: false, reason: 'Only HR Admins can view audit logs' };
    }
    return { allowed: false, reason: 'Only HR Admin can modify employee list or departments' };
  }

  // Regular Employee (User) Scopes
  if (this.role === 'User') {
    if (action === 'read:employees' || action === 'edit:employees') {
      return { allowed: true, scope: 'self' };
    }
    if (action === 'read:leaves' || action === 'create:leaves') {
      return { allowed: true, scope: 'self' };
    }
    if (action === 'read:payroll' || action === 'read:attendance') {
      return { allowed: true, scope: 'self' };
    }
    return { allowed: false, reason: 'Insufficient privileges' };
  }

  return { allowed: false, reason: 'Invalid role configuration' };
};

const User: Model<IUserDocument> = mongoose.models.User || mongoose.model<IUserDocument>('User', userSchema);
export default User;
