import 'dotenv/config';
import app from './app.js';
import { connectDB } from './lib/db.js';

const PORT = Number(process.env.PORT ?? 4000);

connectDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => console.log(`[server] Krittim API running on :${PORT}`));
});
