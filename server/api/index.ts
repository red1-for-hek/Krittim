import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../src/app.js';
import { connectDB } from '../src/lib/db.js';

let databaseConnection: Promise<void> | undefined;

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  databaseConnection ??= connectDB();
  await databaseConnection;
  app(req, res);
}
