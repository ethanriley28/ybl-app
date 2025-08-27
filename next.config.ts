// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Allow deployment even if eslint finds issues
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
