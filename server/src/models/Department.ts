import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IDepartment {
  name: string;
  description?: string;
  managerId: mongoose.Types.ObjectId | null;
  createdAt: Date;
}

export interface IDepartmentDocument extends IDepartment, Document {}

const departmentSchema = new Schema<IDepartmentDocument>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    managerId: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
  },
  { timestamps: true }
);

const Department: Model<IDepartmentDocument> =
  mongoose.models.Department ||
  mongoose.model<IDepartmentDocument>('Department', departmentSchema);

export default Department;
