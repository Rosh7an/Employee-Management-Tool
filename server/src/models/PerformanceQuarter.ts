import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IPerformanceQuarter {
  period: string;       // e.g. "Q2 2026"
  year: number;
  quarter: 1 | 2 | 3 | 4;
  dueDate: Date;
  status: 'open' | 'locked';
  startedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
export interface IPerformanceQuarterDocument extends IPerformanceQuarter, Document {}

const performanceQuarterSchema = new Schema<IPerformanceQuarterDocument>(
  {
    period: { type: String, required: true, unique: true, trim: true },
    year: { type: Number, required: true },
    quarter: { type: Number, enum: [1, 2, 3, 4], required: true },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ['open', 'locked'], default: 'open' },
    startedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

const PerformanceQuarter: Model<IPerformanceQuarterDocument> = mongoose.models.PerformanceQuarter || mongoose.model<IPerformanceQuarterDocument>('PerformanceQuarter', performanceQuarterSchema);
export default PerformanceQuarter;
