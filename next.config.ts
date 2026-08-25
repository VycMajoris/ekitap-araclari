import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['192.168.1.105', 'localhost', '127.0.0.1'],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
