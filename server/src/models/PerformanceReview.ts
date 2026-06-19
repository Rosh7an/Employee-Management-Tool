import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IPerformanceReview {
  employeeId: mongoose.Types.ObjectId;
  reviewerId: mongoose.Types.ObjectId;
  period: string;
  rating: 1 | 2 | 3 | 4 | 5;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPerformanceReviewDocument extends IPerformanceReview, Document {}

const performanceReviewSchema = new Schema<IPerformanceReviewDocument>(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    reviewerId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    period: { type: String, required: true, trim: true },
    rating: {
      type: Number,
      enum: [1, 2, 3, 4, 5],
      required: true,
    },
    notes: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const PerformanceReview: Model<IPerformanceReviewDocument> =
  mongoose.models.PerformanceReview ||
  mongoose.model<IPerformanceReviewDocument>(
    'PerformanceReview',
    performanceReviewSchema
  );

export default PerformanceReview;
