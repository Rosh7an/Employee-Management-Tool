import mongoose, { Document, Schema, Model } from 'mongoose';
import { Role } from '../config/constants';

export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  employeeId: mongoose.Types.ObjectId | null;
  isDirector?: boolean;
  createdAt: Date;
}

export interface IUserDocument extends IUser, Document {}

const userSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'manager', 'employee'],
      default: 'employee',
    },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    isDirector: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const User: Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>('User', userSchema);

export default User;
