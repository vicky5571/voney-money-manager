import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone is for self-hosted Docker only; Vercel manages serverless bundling natively
  output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,
  compress: true,
  poweredByHeader: false,
  experimental: {
    staleTimes: {
      dynamic: 300, // Cache dynamic routes in client router for 5 minutes (300s)
      static: 300, // Cache static routes in client router for 5 minutes (300s)
    },
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "zustand",
      "@supabase/supabase-js",
    ],
  },
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://voney-money-manager.vercel.app",
            ].join("; "),
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
