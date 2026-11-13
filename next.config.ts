import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Server-side packages that should not be bundled for client
  serverExternalPackages: ["pg", "mongodb", "bcryptjs"]
};

export default nextConfig;
