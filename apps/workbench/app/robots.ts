import type { MetadataRoute } from "next";

/* Entorno local de edición: nada se rastrea. */
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}
