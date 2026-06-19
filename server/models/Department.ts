import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IDepartment {
  name: string; // Engineering, Marketing, HR, etc.
  managerId?: mongoose.Types.ObjectId; // Assigned manager (User/Employee)
  description?: string;
}

export interface IDepartmentDocument extends IDepartment, Document {}

const departmentSchema = new Schema<IDepartmentDocument>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  managerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  description: {
    type: String,
    trim: true,
  }
}, {
  timestamps: true,
});

const DepartmentModel: Model<IDepartmentDocument> = mongoose.models.Department || mongoose.model<IDepartmentDocument>('Department', departmentSchema);
export default DepartmentModel;
