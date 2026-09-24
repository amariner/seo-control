import { resolve } from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  /* `standalone` es para el contenedor propio; en Vercel el adaptador necesita
     el trazado estándar y falla si se le cambia la salida. */
  output: process.env.VERCEL ? undefined : "standalone",
  /* Monorepo: el trazado de ficheros parte de la raíz para incluir los paquetes
     del workspace. La curación editorial se lee de disco en tiempo de ejecución
     y el trazado estático no la ve, así que se declara (ver curation-store.ts). */
  outputFileTracingRoot: resolve(process.cwd(), "../.."),
  outputFileTracingIncludes: { "/**": ["../../packages/editorial/data/curation/**"] },
  serverExternalPackages: ["postgres"],
  experimental: {
    optimizePackageImports: ["lucide-react", "echarts"],
  },
  async redirects() {
    /**
     * Compatibilidad con rutas críticas de V1 (P1.3, P2.2, P2.3). Next conserva
     * la query string original.
     *
     * Las dos últimas apuntan a la superficie más cercana que existe hoy, no a
     * su equivalente real, que llega en P6 y P8. Por eso arrastran `?from=` y el
     * destino lo declara en pantalla: `apps/viewer/lib/legacy-routes.ts` es la
     * fuente de esa correspondencia y una prueba falla si divergen de aquí.
     */
    return [
      { source: "/conjunto/plan-editorial", destination: "/editorial/calendario", permanent: true },
      { source: "/conjunto", destination: "/portfolio", permanent: true },
      { source: "/tracking/pilar-contenidos", destination: "/editorial/backlog?from=pilar-contenidos", permanent: true },
      { source: "/insights/llm", destination: "/insights?from=insights-llm", permanent: true },
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
