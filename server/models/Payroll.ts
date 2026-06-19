import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IPayroll {
  employeeId: mongoose.Types.ObjectId;
  employeeEmail: string;
  baseSalary: number;
  bonuses: number;
  deductions: number;
  netPay: number;
  payPeriod: string; // e.g. "June 2026"
}

export interface IPayrollDocument extends IPayroll, Document {}

const payrollSchema = new Schema<IPayrollDocument>({
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
  baseSalary: {
    type: Number,
    required: true,
  },
  bonuses: {
    type: Number,
    default: 0,
  },
  deductions: {
    type: Number,
    default: 0,
  },
  netPay: {
    type: Number,
    required: true,
  },
  payPeriod: {
    type: String,
    required: true,
    trim: true,
  }
}, {
  timestamps: true,
});

const PayrollModel: Model<IPayrollDocument> = mongoose.models.Payroll || mongoose.model<IPayrollDocument>('Payroll', payrollSchema);
export default PayrollModel;
