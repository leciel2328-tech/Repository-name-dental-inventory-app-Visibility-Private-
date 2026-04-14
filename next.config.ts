import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PrismaをNode.jsネイティブモジュールとして扱う設定
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
