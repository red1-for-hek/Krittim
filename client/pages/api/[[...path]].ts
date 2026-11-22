import fs from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { NextApiRequest, NextApiResponse } from 'next';

type ServerApp = (req: IncomingMessage, res: ServerResponse) => unknown;
type ConnectDbFn = () => Promise<void>;

interface LoadedBackend {
  app: ServerApp;
  connectDB: ConnectDbFn;
}

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

let cachedBackend: LoadedBackend | null | undefined;
let dbPromise: Promise<void> | undefined;

function resolveServerDistDir(): string | null {
  const candidates = [
    path.resolve(process.cwd(), '..', 'server', 'dist'),
    path.resolve(process.cwd(), 'server', 'dist'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'app.js')) && fs.existsSync(path.join(dir, 'lib', 'db.js'))) {
      return dir;
    }
  }
  return null;
}

function getBackend(): LoadedBackend | null {
  if (cachedBackend !== undefined) return cachedBackend;
  const distDir = resolveServerDistDir();
  if (!distDir) {
    cachedBackend = null;
    return null;
  }
  const appPath = path.join(distDir, 'app.js');
  const dbPath = path.join(distDir, 'lib', 'db.js');
  const runtimeRequire = createRequire(appPath);
  const appMod = runtimeRequire(appPath) as { default?: ServerApp };
  const dbMod = runtimeRequire(dbPath) as { connectDB?: ConnectDbFn };
  if (typeof appMod.default !== 'function' || typeof dbMod.connectDB !== 'function') {
    cachedBackend = null;
    return null;
  }
  cachedBackend = { app: appMod.default, connectDB: dbMod.connectDB };
  return cachedBackend;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const backend = getBackend();
  if (!backend) {
    res.status(503).json({ error: 'Backend server not bundled; configure NEXT_PUBLIC_API_URL.' });
    return;
  }
  dbPromise ??= backend.connectDB();
  await dbPromise;
  return backend.app(req, res);
}
