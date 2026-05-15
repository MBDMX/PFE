import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: '/static/:path*',
        destination: 'http://localhost:5000/static/:path*',
      },
    ];
  },
};

export default nextConfig;
