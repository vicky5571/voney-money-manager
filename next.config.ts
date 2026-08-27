import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Performance: reduce serverless bundle via tracing + tree-shake heavy libs
  output: "standalone",
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "zustand", "@supabase/supabase-js"],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
};

export default nextConfig;
