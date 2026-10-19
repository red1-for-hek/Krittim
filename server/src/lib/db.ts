import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';

let connected = false;

export async function connectDB(): Promise<void> {
  if (connected) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(uri);
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
}
