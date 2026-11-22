import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { defaultSettings, memId, memoryStore } from './memoryStore.js';

let connected = false;
let attempted = false;

export function isDbConnected(): boolean {
  return connected && mongoose.connection.readyState === 1;
}

export async function connectDB(): Promise<void> {
  if (isDbConnected()) return;
  if (attempted && !process.env.MONGODB_URI) return;
  attempted = true;

  mongoose.set('bufferCommands', false);
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('[db] MONGODB_URI is not set — using in-memory fallback');
    await seedDemoUserMemory();
    return;
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    connected = true;
    console.log('[db] MongoDB connected');

    const demoEmail = process.env.DEMO_USER_EMAIL?.trim().toLowerCase();
    const demoPassword = process.env.DEMO_USER_PASSWORD;
    if (demoEmail && demoPassword) {
      const passwordHash = await bcrypt.hash(demoPassword, 12);
      await User.updateOne(
        { email: demoEmail },
        {
          $setOnInsert: {
            name: process.env.DEMO_USER_NAME ?? 'Krittim Demo User',
            email: demoEmail,
            passwordHash,
            provider: 'email',
            plan: 'pro',
          },
        },
        { upsert: true },
      );
      console.log(`[db] Demo user ready: ${demoEmail}`);
    }
  } catch (err) {
    connected = false;
    console.warn('[db] MongoDB not connected — using in-memory fallback:', err instanceof Error ? err.message : err);
    await seedDemoUserMemory();
  }
}

async function seedDemoUserMemory(): Promise<void> {
  const demoEmail = process.env.DEMO_USER_EMAIL?.trim().toLowerCase();
  const demoPassword = process.env.DEMO_USER_PASSWORD;
  if (!demoEmail || !demoPassword) return;

  const existing = [...memoryStore.users.values()].find((u) => u.email === demoEmail);
  if (existing) return;

  const id = memId();
  const passwordHash = await bcrypt.hash(demoPassword, 10);
  const now = new Date();
  memoryStore.users.set(id, {
    _id: id,
    name: process.env.DEMO_USER_NAME ?? 'Krittim Demo User',
    email: demoEmail,
    passwordHash,
    provider: 'email',
    plan: 'pro',
    settings: defaultSettings(),
    createdAt: now,
    updatedAt: now,
  });
}
