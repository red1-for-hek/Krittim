import 'dotenv/config';
import app from './app.js';
import { connectDB } from './lib/db.js';

const PORT = process.env.PORT ?? 4000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`[server] Krittim API running on :${PORT}`));
  })
  .catch((err) => {
    console.error('[server] Failed to connect to MongoDB:', err);
    process.exit(1);
  });
