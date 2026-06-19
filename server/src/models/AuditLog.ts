import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IAuditLog {
  actorId: mongoose.Types.ObjectId;
  actorRole: string;
  action: string;
  targetId: string | null;
  targetModel: string | null;
  diff: Record<string, unknown>;
  ip: string;
  timestamp: Date;
}

export interface IAuditLogDocument extends IAuditLog, Document {}

const auditLogSchema = new Schema<IAuditLogDocument>({
  actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  actorRole: { type: String, required: true },
  action: { type: String, required: true },
  targetId: { type: String, default: null },
  targetModel: { type: String, default: null },
  diff: { type: Schema.Types.Mixed, default: {} },
  ip: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
});

const AuditLog: Model<IAuditLogDocument> =
  mongoose.models.AuditLog ||
  mongoose.model<IAuditLogDocument>('AuditLog', auditLogSchema);

export default AuditLog;
