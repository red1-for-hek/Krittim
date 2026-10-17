import { Schema, model, Document, Types } from 'mongoose';

export interface IChat extends Document {
  _id: Types.ObjectId;
  slug: string;
  userId: Types.ObjectId;
  title: string;
  modelId: string;
  reasoningMode: string;
  projectId?: Types.ObjectId;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ChatSchema = new Schema<IChat>(
  {
    slug: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: 'New Chat', trim: true },
    modelId: { type: String, default: 's1_neon' },
    reasoningMode: { type: String, default: 'auto' },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
    pinned: { type: Boolean, default: false },
  },
  { timestamps: true },
);

ChatSchema.index({ userId: 1, updatedAt: -1 });
ChatSchema.index({ slug: 1 }, { unique: true });

export const Chat = model<IChat>('Chat', ChatSchema);
