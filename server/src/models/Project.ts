import { Schema, model, Document, Types } from 'mongoose';

export interface IProject extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  emoji: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    emoji: { type: String, default: '📁' },
    color: { type: String, default: 'from-brand to-brand-soft' },
  },
  { timestamps: true },
);

ProjectSchema.index({ userId: 1 });

export const Project = model<IProject>('Project', ProjectSchema);
