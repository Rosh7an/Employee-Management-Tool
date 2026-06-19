import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ILeaveRequest {
  employeeId: mongoose.Types.ObjectId;
  type: 'sick' | 'casual' | 'earned';
  startDate: Date;
  endDate: Date;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy: mongoose.Types.ObjectId | null;
  reviewedAt: Date | null;
  createdAt: Date;
}

export interface ILeaveRequestDocument extends ILeaveRequest, Document {}

const leaveRequestSchema = new Schema<ILeaveRequestDocument>(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    type: {
      type: String,
      enum: ['sick', 'casual', 'earned'],
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String, required: false, default: '', trim: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const LeaveRequest: Model<ILeaveRequestDocument> =
  mongoose.models.LeaveRequest ||
  mongoose.model<ILeaveRequestDocument>('LeaveRequest', leaveRequestSchema);

export default LeaveRequest;
