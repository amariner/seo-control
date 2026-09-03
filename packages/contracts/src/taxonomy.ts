export const PILOT_PROJECTS = [
  { slug: "porcelanosa", name: "Porcelanosa", domain: "porcelanosa.com", wave: 0 },
  { slug: "noken", name: "Noken", domain: "noken.com", wave: 0 },
] as const;

export const EXPANSION_PROJECTS = [
  { slug: "ecommerce", name: "Porcelanosa Ecommerce", wave: 1 },
  { slug: "butech", name: "Butech", wave: 1 },
  { slug: "antic-colonial", name: "L'Antic Colonial", wave: 2 },
  { slug: "krion", name: "Krion", wave: 2 },
  { slug: "xtone", name: "XTONE", wave: 3 },
  { slug: "gamadecor", name: "Gamadecor", wave: 3 },
] as const;

export const MARKETS = [
  { code: "ES", name: "España" },
  { code: "UK", name: "Reino Unido" },
  { code: "US", name: "Estados Unidos" },
  { code: "FR", name: "Francia" },
  { code: "DE", name: "Alemania" },
] as const;

export const PERIODS = [
  { key: "28d", label: "Últimos 28 días" },
  { key: "90d", label: "Últimos 90 días" },
  { key: "180d", label: "Últimos 180 días" },
  { key: "12m", label: "Últimos 12 meses" },
  { key: "24m", label: "Últimos 24 meses" },
] as const;

export const PROJECT_CHAPTERS = [
  { key: "resumen", label: "Resumen" },
  { key: "negocio", label: "Negocio" },
  { key: "demanda", label: "Demanda y visibilidad" },
  { key: "contenido", label: "Contenido" },
  { key: "tecnica", label: "Técnica" },
  { key: "mercados", label: "Mercados" },
  { key: "geo", label: "GEO" },
  { key: "cronologia", label: "Cronología e informes" },
] as const;
