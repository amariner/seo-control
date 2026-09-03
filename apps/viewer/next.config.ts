import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: "standalone",
  serverExternalPackages: ["postgres"],
  experimental: {
    optimizePackageImports: ["lucide-react", "echarts"],
  },
  async redirects() {
    // Compatibilidad con rutas críticas de V1 (P1.3). Next conserva la query string.
    return [
      { source: "/conjunto/plan-editorial", destination: "/editorial/calendario", permanent: true },
      { source: "/editorial", destination: "/editorial/calendario", permanent: false },
    ];
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "same-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Content-Security-Policy", value: "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
        { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      ],
    }];
  },
};

export default nextConfig;
