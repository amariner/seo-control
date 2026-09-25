import type { MetadataRoute } from "next";
import { AI_AGENTS } from "@/lib/crawlers";

/**
 * El visor es privado (D-048): nada se rastrea. Además de la regla general, se
 * nombra cada agente de IA porque algunos solo respetan reglas explícitas.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", disallow: "/" },
      { userAgent: [...AI_AGENTS], disallow: "/" },
    ],
  };
}
