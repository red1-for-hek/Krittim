import { Schema, model, Document, Types } from 'mongoose';

export interface IMessage extends Document {
  _id: Types.ObjectId;
  chatId: Types.ObjectId;
  role: 'user' | 'assistant';
  content: string;
  modelId?: string;
  reasoningMode?: string;
  attachments: { name: string; size: number; type: string; url?: string }[];
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    modelId: String,
    reasoningMode: String,
    attachments: [{ name: String, size: Number, type: String, url: String }],
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

MessageSchema.index({ chatId: 1, createdAt: 1 });

export const Message = model<IMessage>('Message', MessageSchema);
