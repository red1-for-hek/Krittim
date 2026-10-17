import { Schema, model, Document, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash?: string;
  avatarUrl?: string;
  provider: 'google' | 'github' | 'discord' | 'email';
  providerId?: string;
  plan: 'free' | 'pro' | 'enterprise';
  refreshToken?: string;
  settings: {
    theme: 'dark' | 'light' | 'system';
    model: string;
    reasoningMode: string;
    enterToSend: boolean;
    streamResponses: boolean;
    aiMemory: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: String,
    avatarUrl: String,
    provider: { type: String, enum: ['google', 'github', 'discord', 'email'], required: true },
    providerId: String,
    plan: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
    refreshToken: String,
    settings: {
      theme: { type: String, enum: ['dark', 'light', 'system'], default: 'dark' },
      model: { type: String, default: 's1_neon' },
      reasoningMode: { type: String, default: 'auto' },
      enterToSend: { type: Boolean, default: true },
      streamResponses: { type: Boolean, default: true },
      aiMemory: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);

UserSchema.index({ email: 1 });
UserSchema.index({ provider: 1, providerId: 1 });

export const User = model<IUser>('User', UserSchema);
