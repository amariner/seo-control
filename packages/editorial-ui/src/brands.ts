import { EDITORIAL_BRANDS, type EditorialBrandSlug } from "@seo/contracts";

/**
 * Un color distinto por marca en el calendario y el plan general (D-057). Tonos
 * medios con contraste ≥ 4,5:1 sobre blanco; se evitan verde, ámbar y rojo,
 * reservados a los estados.
 */
export const BRAND_COLORS: Record<EditorialBrandSlug, string> = {
  porcelanosa: "#1e3a8a",
  noken: "#7c3aed",
  ecommerce: "#0e7490",
  butech: "#7c5b4a",
  "antic-colonial": "#b4533a",
  krion: "#0369a1",
  xtone: "#475569",
  gamadecor: "#a21caf",
};

export function brandColor(slug: EditorialBrandSlug | null) {
  return slug ? BRAND_COLORS[slug] : "#b5bcb8";
}

export function brandName(slug: EditorialBrandSlug | null, literal: string) {
  return EDITORIAL_BRANDS.find((brand) => brand.slug === slug)?.name ?? literal;
}

export function brandCode(slug: EditorialBrandSlug | null, literal: string) {
  return EDITORIAL_BRANDS.find((brand) => brand.slug === slug)?.code ?? literal.slice(0, 4).toUpperCase();
}

/**
 * Código de dos letras para la rejilla anual, donde una celda de día mide ~40 px.
 * Evita truncar con puntos suspensivos; el nombre completo sigue en `title` y `aria-label`.
 */
const BRAND_SHORT_CODES: Record<EditorialBrandSlug, string> = {
  porcelanosa: "PO",
  noken: "NK",
  ecommerce: "EC",
  butech: "BU",
  "antic-colonial": "AC",
  krion: "KR",
  xtone: "XT",
  gamadecor: "GD",
};

export function brandShortCode(slug: EditorialBrandSlug | null, literal: string) {
  return slug ? BRAND_SHORT_CODES[slug] : literal.slice(0, 2).toUpperCase();
}
