import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ISalary {
  base: number;
  currency: string;
}

export interface IEmployee {
  employeeId: string;
  name: string;
  email: string;
  phone?: string;
  department: mongoose.Types.ObjectId | null;
  designation: string;
  managerId: mongoose.Types.ObjectId | null;
  employmentType: 'full-time' | 'part-time' | 'contract';
  status: 'active' | 'on-leave' | 'terminated';
  dateOfJoining: Date;
  salary: ISalary;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEmployeeDocument extends IEmployee, Document {}

const employeeSchema = new Schema<IEmployeeDocument>(
  {
    employeeId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    phone: { type: String, trim: true },
    department: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
    designation: { type: String, required: true, trim: true },
    managerId: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
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
    dateOfJoining: { type: Date, required: true, default: Date.now },
    salary: {
      base: { type: Number, default: 0 },
      currency: { type: String, default: 'USD' },
    },
  },
  { timestamps: true }
);

employeeSchema.pre('validate', async function (done) {
  if (this.isNew && !this.employeeId) {
    const EmployeeModel = mongoose.model('Employee');
    const last = await EmployeeModel.findOne().sort({ createdAt: -1 }).lean() as { employeeId?: string } | null;
    if (last?.employeeId) {
      const lastNum = parseInt(last.employeeId.replace(/^EMP-0*/, ''), 10);
      const seq = isNaN(lastNum) ? 1 : lastNum + 1;
      this.employeeId = `EMP-${String(seq).padStart(5, '0')}`;
    } else {
      this.employeeId = 'EMP-00001';
    }
  }
  done();
});

const Employee: Model<IEmployeeDocument> =
  mongoose.models.Employee ||
  mongoose.model<IEmployeeDocument>('Employee', employeeSchema);

export default Employee;
