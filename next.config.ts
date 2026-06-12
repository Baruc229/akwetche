import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.5.0.2"],
  serverExternalPackages: ["@prisma/adapter-neon", "@neondatabase/serverless", "@prisma/adapter-pg", "pg"],
};

export default nextConfig;
