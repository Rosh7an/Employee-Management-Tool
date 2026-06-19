import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IPayroll {
  employeeId: mongoose.Types.ObjectId;
  payPeriod: string;
  base: number;
  bonuses: number;
  deductions: number;
  netPay: number;
  currency: string;
  createdAt: Date;
}

export interface IPayrollDocument extends IPayroll, Document {}

const payrollSchema = new Schema<IPayrollDocument>(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    payPeriod: { type: String, required: true, trim: true },
    base: { type: Number, required: true },
    bonuses: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    netPay: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
  },
  { timestamps: true }
);

const Payroll: Model<IPayrollDocument> =
  mongoose.models.Payroll ||
  mongoose.model<IPayrollDocument>('Payroll', payrollSchema);

export default Payroll;
