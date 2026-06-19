import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IAuditLog {
  timestamp: Date;
  userId?: mongoose.Types.ObjectId; // Maps to actorId
  actorId?: mongoose.Types.ObjectId; // Reference to Employee who performed action
  actorRole?: string; // e.g. "Admin", "Manager", "User"
  email?: string; // Actor email
  action: string; // e.g. "create_employee", "approve_leave", etc.
  resource: string; // e.g. "employees", "leaves", "departments", etc.
  resourceId?: string; // Standard resource string ID
  targetEmployeeId?: mongoose.Types.ObjectId; // Reference to target employee (if applicable)
  status: 'success' | 'denied' | 'error';
  details?: any;
  ipAddress?: string;
}

export interface IAuditLogDocument extends IAuditLog, Document {}

const auditLogSchema = new Schema<IAuditLogDocument>({
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  actorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  actorRole: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
  },
  action: {
    type: String,
    required: true,
    trim: true,
  },
  resource: {
    type: String,
    required: true,
    trim: true,
  },
  resourceId: {
    type: String,
    trim: true,
  },
  targetEmployeeId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  status: {
    type: String,
    enum: ['success', 'denied', 'error'],
    required: true,
  },
  details: {
    type: Schema.Types.Mixed,
  },
  ipAddress: {
    type: String,
  }
});

const AuditLog: Model<IAuditLogDocument> = mongoose.models.AuditLog || mongoose.model<IAuditLogDocument>('AuditLog', auditLogSchema);
export default AuditLog;
