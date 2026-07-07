import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite", "pg", "pg-native", "drizzle-orm", "pdf-parse", "three"],
  turbopack: { root: __dirname },
  allowedDevOrigins: ["*.space-z.ai", "*.chatglm.cn", "localhost:3000", "127.0.0.1:3000", "*"],
  experimental: { optimizePackageImports: ["lucide-react", "motion", "lenis"] },
  compress: true,
  images: { formats: ["image/avif", "image/webp"], minimumCacheTTL: 60 },
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-XSS-Protection", value: "1; mode=block" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    }];
  },
};

export default nextConfig;
