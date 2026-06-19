import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IMilestone {
  title: string;
  description?: string;
  targetDate: Date;
  status: 'not-started' | 'in-progress' | 'achieved';
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
export interface IMilestoneDocument extends IMilestone, Document {}

const milestoneSchema = new Schema<IMilestoneDocument>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    targetDate: { type: Date, required: true },
    status: { type: String, enum: ['not-started', 'in-progress', 'achieved'], default: 'not-started' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

const Milestone: Model<IMilestoneDocument> = mongoose.models.Milestone || mongoose.model<IMilestoneDocument>('Milestone', milestoneSchema);
export default Milestone;
