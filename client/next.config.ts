import type { NextConfig } from "next";

import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  serverExternalPackages: ["mongoose", "express", "helmet", "cors", "express-rate-limit", "bcryptjs", "jsonwebtoken"],
  allowedDevOrigins: ["*.e2b.app", "*.vercel.app", "*.run.app"],
  turbopack: {
    root: path.resolve(__dirname, ".."),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
