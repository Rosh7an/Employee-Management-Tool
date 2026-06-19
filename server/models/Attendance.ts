import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IAttendance {
  employeeId: mongoose.Types.ObjectId;
  employeeEmail: string;
  date: Date;
  checkIn?: string; // e.g. "09:00 AM"
  checkOut?: string; // e.g. "05:00 PM"
  status: 'present' | 'absent' | 'half-day';
}

export interface IAttendanceDocument extends IAttendance, Document {}

const attendanceSchema = new Schema<IAttendanceDocument>({
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
  date: {
    type: Date,
    required: true,
  },
  checkIn: {
    type: String,
  },
  checkOut: {
    type: String,
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'half-day'],
    required: true,
    default: 'present',
  }
}, {
  timestamps: true,
});

// Compound index to prevent duplicate attendance logs on the same date for an employee
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

const AttendanceModel: Model<IAttendanceDocument> = mongoose.models.Attendance || mongoose.model<IAttendanceDocument>('Attendance', attendanceSchema);
export default AttendanceModel;
