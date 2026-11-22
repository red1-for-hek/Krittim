import type { IncomingMessage, ServerResponse } from 'node:http';
import app from '../src/app.js';
import { connectDB } from '../src/lib/db.js';

let databaseConnection: Promise<void> | undefined;

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  databaseConnection ??= connectDB();
  await databaseConnection;
  app(req as unknown as Parameters<typeof app>[0], res as unknown as Parameters<typeof app>[1]);
}
