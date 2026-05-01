import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable production source maps to save memory
  productionBrowserSourceMaps: false,

  // Evict idle pages from memory faster in dev
  onDemandEntries: {
    maxInactiveAge: 15 * 1000, // 15s instead of default 60s
    pagesBufferLength: 10,     // 10 pages instead of default 20
  },
};

export default nextConfig;
