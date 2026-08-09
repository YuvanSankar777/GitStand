import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so builds ignore any stray lockfile above this dir.
  turbopack: { root: __dirname },
  // Keep Prisma's engine out of the bundler so route handlers load it natively.
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
};

export default nextConfig;
