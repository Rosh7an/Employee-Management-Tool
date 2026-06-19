import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IAttendance {
  employeeId: mongoose.Types.ObjectId;
  date: Date;
  checkIn: string | null;
  checkOut: string | null;
  status: 'present' | 'absent' | 'half-day';
}

export interface IAttendanceDocument extends IAttendance, Document {}

const attendanceSchema = new Schema<IAttendanceDocument>(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    date: { type: Date, required: true },
    checkIn: { type: String, default: null },
    checkOut: { type: String, default: null },
    status: {
      type: String,
      enum: ['present', 'absent', 'half-day'],
      required: true,
    },
  },
  { timestamps: true }
);

const Attendance: Model<IAttendanceDocument> =
  mongoose.models.Attendance ||
  mongoose.model<IAttendanceDocument>('Attendance', attendanceSchema);

export default Attendance;
