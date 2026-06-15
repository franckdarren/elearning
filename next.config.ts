import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Videos / documents are uploaded via Server Actions. Default is 1mb.
      bodySizeLimit: "100mb",
    },
  },
};

export default nextConfig;
