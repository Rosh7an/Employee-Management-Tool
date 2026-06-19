import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ILeaveRequest {
  employeeId: mongoose.Types.ObjectId;
  employeeEmail: string;
  type: 'sick' | 'casual' | 'earned';
  startDate: Date;
  endDate: Date;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: mongoose.Types.ObjectId;
}

export interface ILeaveRequestDocument extends ILeaveRequest, Document {}

const leaveRequestSchema = new Schema<ILeaveRequestDocument>({
  employeeId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  employeeEmail: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['sick', 'casual', 'earned'],
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  reason: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  }
}, {
  timestamps: true,
});

const LeaveRequestModel: Model<ILeaveRequestDocument> = mongoose.models.LeaveRequest || mongoose.model<ILeaveRequestDocument>('LeaveRequest', leaveRequestSchema);
export default LeaveRequestModel;
