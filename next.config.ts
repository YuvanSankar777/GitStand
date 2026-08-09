import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so builds ignore any stray lockfile above this dir.
  turbopack: { root: __dirname },
};

export default nextConfig;
