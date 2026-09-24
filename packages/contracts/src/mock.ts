import type { DashboardPayload, MarketCode, PeriodKey, ProjectSlug } from "./schemas";
import { buildPeriodWindow, dashboardPayloadSchema } from "./schemas";
import { MARKETS, findBrand, isPilotProject, type BrandSlug } from "./taxonomy";
import { aggregatePortfolio, type BrandAnalytics, type BrandEditorialActivity, type PortfolioFilters, type PortfolioPayload } from "./portfolio";
import { REPORT_CHAPTERS, buildReportArchive, type ReportArchive, type ReportArchiveEntry, type ReportFilters } from "./reports";

type Filters = { project: ProjectSlug | "all"; market: MarketCode | "all"; period: PeriodKey };

const coverage = (label: string, ratio = 0.98, quality: "completa" | "parcial" | "insuficiente" = "completa") => ({
  ratio,
  label,
  quality,
  asOf: "2026-08-30",
});

const evidence = (id: string, label: string, value: string, source: "ga4" | "gsc" | "semrush" | "geo" | "crux" | "pagespeed" | "crawl", href: string) => ({
  id,
  label,
  value,
  source,
  href,
  observedAt: "2026-08-30",
});

const baseInsights: DashboardPayload["executiveInsights"] = [
  {
    id: "ins-noken-nonbrand",
    project: "noken",
    title: "Noken recupera demanda non-branded en Reino Unido",
    executiveSummary: "Los clics no vinculados a marca crecen un 18,4% y explican dos tercios del avance orgánico del periodo.",
    technicalExplanation: "El crecimiento se concentra en categorías de grifería y baño, con mejora simultánea de posición y CTR. La persistencia en dos cortes reduce la probabilidad de ruido.",
    category: "resultado",
    impact: 5,
    urgency: 3,
    confidence: "alta",
    confidenceReason: "Coinciden GSC, GA4 y el set estable de SEMrush durante dos sincronizaciones.",
    affectedSegments: ["UK", "non-branded", "categoría", "mobile"],
    causeType: "hipotesis",
    cause: "La mejora coincide con la actualización de las categorías, pero no hay experimento causal.",
    recommendation: "Extender el patrón editorial a las cinco categorías con mayor gap de cobertura.",
    suggestedOwner: "Contenido SEO",
    successCriterion: "+12% de clics non-branded y CTR dentro de ±1 pp de la curva esperada en 8 semanas.",
    status: "aprobado",
    selectedForExecutive: true,
    evidence: [
      evidence("ev-1", "Clics non-branded UK", "+18,4%", "gsc", "/queries/noken-taps-uk"),
      evidence("ev-2", "Sesiones orgánicas de categoría", "+14,1%", "ga4", "/projects/noken?chapter=negocio"),
    ],
    updatedAt: "2026-08-31",
  },
  {
    id: "ins-p-index",
    project: "porcelanosa",
    title: "Cobertura indexable incompleta en colecciones de Francia",
    executiveSummary: "146 URLs de colección con demanda quedan fuera de sitemap o apuntan a canonical no indexable.",
    technicalExplanation: "El cruce de crawl, sitemap y GSC detecta 98 ausencias y 48 canonicals incoherentes. El 72% pertenece a dos templates.",
    category: "riesgo",
    impact: 5,
    urgency: 5,
    confidence: "alta",
    confidenceReason: "Evidencia directa en crawl aprobado y comprobación de una muestra en Search Console.",
    affectedSegments: ["FR", "producto/colección", "indexación"],
    causeType: "demostrada",
    cause: "Reglas divergentes entre el generador de sitemap y el canonical del template de colección.",
    recommendation: "Unificar la fuente de URL canónica y regenerar sitemap; validar una muestra antes del despliegue completo.",
    suggestedOwner: "Plataforma web",
    successCriterion: "100% de la muestra devuelve canonical autorreferente e inclusión en sitemap; caída a <5 URLs afectadas.",
    status: "aprobado",
    selectedForExecutive: true,
    evidence: [
      evidence("ev-3", "URLs afectadas", "146", "crawl", "/issues/porcelanosa-fr-canonical"),
      evidence("ev-4", "Impresiones en riesgo", "83.420", "gsc", "/projects/porcelanosa?chapter=tecnica"),
    ],
    updatedAt: "2026-08-31",
  },
  {
    id: "ins-p-ctr",
    project: "porcelanosa",
    title: "Quick win de CTR en búsquedas comerciales de España",
    executiveSummary: "32 consultas en posiciones 2–6 rinden 2,7 puntos por debajo de su CTR esperado.",
    technicalExplanation: "La oportunidad excluye marca, volúmenes bajos y SERP con local pack dominante. Son 214.000 impresiones con titles poco diferenciados.",
    category: "oportunidad",
    impact: 4,
    urgency: 3,
    confidence: "media",
    confidenceReason: "El gap es estable, aunque la curva propia aún dispone de nueve meses de histórico.",
    affectedSegments: ["ES", "comercial", "non-branded", "desktop"],
    causeType: "hipotesis",
    cause: "Titles homogéneos y poca alineación con el modificador de intención observado.",
    recommendation: "Probar tres familias de title en categorías, empezando por salones y pavimentos.",
    suggestedOwner: "SEO + Contenido",
    successCriterion: "+1,5 pp de CTR sin pérdida de posición media durante 28 días.",
    status: "aprobado",
    selectedForExecutive: true,
    evidence: [evidence("ev-5", "Impresiones elegibles", "214.000", "gsc", "/queries/porcelanosa-ctr-es")],
    updatedAt: "2026-08-29",
  },
  {
    id: "ins-geo",
    project: null,
    title: "La citación GEO mejora, pero depende de fuentes de terceros",
    executiveSummary: "La presencia en asistentes sube 5,8 puntos; solo el 34% de las citas ganadas enlaza a dominios propios.",
    technicalExplanation: "La ganancia aparece en Gemini y Perplexity para prompts informacionales. ChatGPT permanece estable. Las fuentes más citadas son medios sectoriales.",
    category: "diagnostico",
    impact: 3,
    urgency: 2,
    confidence: "media",
    confidenceReason: "Set estable de 300 ejecuciones semanales; la variabilidad entre respuestas continúa siendo alta.",
    affectedSegments: ["Tier 1", "informacional", "Gemini", "Perplexity"],
    causeType: "no_determinada",
    cause: "No hay evidencia suficiente para atribuir el cambio a una publicación concreta.",
    recommendation: "Reforzar páginas fuente y relaciones editoriales en los clusters donde terceros concentran la citación.",
    suggestedOwner: "Contenido + PR",
    successCriterion: "≥45% de citas ganadas hacia dominios propios durante cuatro semanas.",
    status: "aprobado",
    selectedForExecutive: true,
    evidence: [evidence("ev-6", "Share de citación", "38,6%", "geo", "/insights/ins-geo")],
    updatedAt: "2026-08-30",
  },
  {
    id: "ins-data",
    project: "noken",
    title: "PageSpeed de Estados Unidos llega con cobertura parcial",
    executiveSummary: "Dos de las ocho URLs representativas agotaron el tiempo de ejecución; se mantiene el último snapshot válido.",
    technicalExplanation: "Los datos CrUX de campo sí están completos. No se mezclan resultados de laboratorio con fechas distintas en el score.",
    category: "calidad",
    impact: 2,
    urgency: 2,
    confidence: "alta",
    confidenceReason: "El estado procede directamente del registro de sincronización.",
    affectedSegments: ["US", "PageSpeed", "producto"],
    causeType: "demostrada",
    cause: "Timeout del proveedor en dos ejecuciones consecutivas.",
    recommendation: "Reintentar las dos URLs en el siguiente job y revisar peso de terceros si vuelve a ocurrir.",
    suggestedOwner: "SEO técnico",
    successCriterion: "8/8 URLs procesadas en la siguiente sincronización.",
    status: "aprobado",
    selectedForExecutive: true,
    evidence: [evidence("ev-7", "Cobertura PageSpeed US", "75%", "pagespeed", "/data")],
    updatedAt: "2026-08-30",
  },
];

const baseActions: DashboardPayload["actions"] = [
  { id: "act-1", project: "porcelanosa", title: "Corregir canonical y sitemap de colecciones FR", status: "en_curso", impact: 5, confidence: 5, effort: 2, urgency: 5, owner: "Plataforma web", dueDate: "2026-09-11", successCriterion: "<5 URLs afectadas", sourceInsightId: "ins-p-index" },
  { id: "act-2", project: "porcelanosa", title: "Test de titles en categorías ES", status: "planificada", impact: 4, confidence: 3, effort: 2, urgency: 3, owner: "SEO + Contenido", dueDate: "2026-09-18", successCriterion: "+1,5 pp CTR", sourceInsightId: "ins-p-ctr" },
  { id: "act-3", project: "noken", title: "Replicar patrón editorial en cinco categorías UK", status: "en_curso", impact: 4, confidence: 4, effort: 3, urgency: 3, owner: "Contenido SEO", dueDate: "2026-09-25", successCriterion: "+12% clics non-brand", sourceInsightId: "ins-noken-nonbrand" },
  { id: "act-4", project: "noken", title: "Reprocesar muestra PageSpeed US", status: "propuesta", impact: 2, confidence: 5, effort: 1, urgency: 2, owner: "SEO técnico", dueDate: null, successCriterion: "8/8 URLs", sourceInsightId: "ins-data" },
];

function makeSeries(seed: number, slope: number, amplitude: number) {
  const points: DashboardPayload["series"][string] = [];
  for (let i = 0; i < 28; i += 1) {
    const date = new Date(Date.UTC(2026, 7, 3 + i));
    const value = Math.round(seed + i * slope + Math.sin(i / 2.4) * amplitude + (i % 7 === 5 ? -amplitude * 0.7 : 0));
    points.push({
      date: date.toISOString().slice(0, 10),
      value,
      previousYear: Math.round(value * 0.91),
      lowerBand: Math.round(value * 0.83),
      upperBand: Math.round(value * 1.14),
    });
  }
  return points;
}

/** Las siete fuentes de la portada, con su etiqueta visible. */
const SOURCE_STATUS_KEYS = [
  { key: "ga4" as const, label: "Google Analytics 4" },
  { key: "gsc" as const, label: "Search Console" },
  { key: "semrush" as const, label: "SEMrush" },
  { key: "geo" as const, label: "GEO" },
  { key: "crux" as const, label: "CrUX" },
  { key: "pagespeed" as const, label: "PageSpeed" },
  { key: "crawl" as const, label: "Crawl aprobado" },
];

/**
 * Portada de una marca que todavía no se mide (D-033).
 *
 * No devuelve ceros: un cero es una medición que dio cero, y aquí no hay
 * medición. Devuelve las colecciones vacías y las fuentes en `no_configurado`,
 * que es el estado que el contrato ya tenía previsto para esto. La pantalla lo
 * lee y explica qué falta, en vez de dibujar un panel de métricas en blanco.
 */
function unmeasuredDashboard(filters: Filters): DashboardPayload {
  const brand = findBrand(filters.project);
  const note = !brand
    ? "Marca sin serie analítica en V2."
    : brand.pilot
      ? `${brand.name} se mide con GA4 y Search Console reales (origen live); el conector sintético no la simula.`
      : `${brand.name} se incorpora en la ola ${brand.wave} de la expansión.`;
  return dashboardPayloadSchema.parse({
    generatedAt: "2026-09-02T08:15:00.000Z",
    mode: "synthetic",
    window: buildPeriodWindow(filters.period, "2026-08-30"),
    filters,
    metrics: [],
    projects: [],
    markets: [],
    executiveInsights: [],
    /* GEO se mide por proyecto y mercado: sin proyecto medido no hay ejecuciones
       que contar, y `totalPrompts: 0` es lo único cierto que se puede decir. */
    geo: { citationShare: 0, previousCitationShare: 0, citedPrompts: 0, totalPrompts: 0, aiSessions: 0, aiConversions: 0, leadingAssistant: "—", topCitedDomain: "—" },
    actions: [],
    sources: SOURCE_STATUS_KEYS.map((source) => ({
      source: source.key,
      label: source.label,
      status: "no_configurado" as const,
      lastValidSnapshot: null,
      cutoff: null,
      coverage: 0,
      note,
    })),
    series: {},
    annotations: [],
    technicalIssues: [],
    opportunities: [],
    queryOpportunities: [],
    reports: [],
  });
}

export function getMockDashboard(filters: Filters = { project: "all", market: "all", period: "28d" }): DashboardPayload {
  /**
   * El reparto del piloto. Antes esta línea era
   * `filters.project === "porcelanosa" ? 0.64 : 0.36`, y con solo dos marcas
   * elegibles funcionaba. Al abrir la selección a las ocho (D-033) ese `else`
   * habría repartido un 36% de la serie del piloto a Krion o a Gamadecor:
   * cifras inventadas para marcas que nadie mide, indistinguibles de las
   * reales. Una marca sin piloto no escala el dato del piloto: no tiene dato.
   */
  if (filters.project !== "all" && !isPilotProject(filters.project)) return unmeasuredDashboard(filters);
  /* Xtone entra en el piloto con dato real (D-036), pero el conector sintético
     solo sabe simular Porcelanosa y Noken. Sin esta línea caería en el `else`
     del reparto y recibiría el 36% de la serie de Noken: el fallo de D-033 con
     otra marca. En modo sintético, una marca que no simula no tiene dato. */
  if (filters.project !== "all" && !(filters.project in PILOT_MIX)) return unmeasuredDashboard(filters);
  const projectFactor = filters.project === "all" ? 1 : filters.project === "porcelanosa" ? 0.64 : 0.36;
  const marketFactor = filters.market === "all" ? 1 : ({ ES: 0.38, UK: 0.2, US: 0.18, FR: 0.14, DE: 0.1 } as const)[filters.market];
  const periodFactor = ({ "28d": 1, "90d": 3.08, "180d": 5.95, "12m": 11.7, "24m": 22.3 } as const)[filters.period];
  const factor = projectFactor * marketFactor * periodFactor;
  const scale = (value: number) => Math.round(value * factor);
  const sourceCoverage = coverage(filters.market === "all" ? "5/5 mercados" : `Mercado ${filters.market}`);

  const projects: DashboardPayload["projects"] = [
    { slug: "porcelanosa", name: "Porcelanosa", domain: "porcelanosa.com", attention: "actuar", score: 72.8, businessScore: 79, visibilityScore: 76, technicalScore: 60, delta: -1.4, primaryRisk: "Canonicals FR", primaryOpportunity: "CTR comercial ES" },
    { slug: "noken", name: "Noken", domain: "noken.com", attention: "observar", score: 78.4, businessScore: 82, visibilityScore: 80, technicalScore: 72, delta: 3.2, primaryRisk: "CWV móvil US", primaryOpportunity: "Demanda UK" },
  ].filter((project) => filters.project === "all" || project.slug === filters.project) as DashboardPayload["projects"];

  const payload: DashboardPayload = {
    generatedAt: "2026-09-02T08:15:00.000Z",
    mode: "synthetic",
    // El corte del dato es el de la cobertura declarada, no la fecha de generación.
    window: buildPeriodWindow(filters.period, "2026-08-30"),
    filters,
    metrics: [
      { key: "organic_sessions", label: "Sesiones orgánicas", value: scale(184320), unit: "number", previous: scale(173110), previousYear: scale(161900), target: scale(190000), trend: "up", goodDirection: "up", coverage: sourceCoverage },
      { key: "macro_conversions", label: "Macroconversiones", value: scale(2964), unit: "number", previous: scale(2818), previousYear: scale(2450), target: scale(3200), trend: "up", goodDirection: "up", coverage: sourceCoverage },
      { key: "organic_clicks", label: "Clics orgánicos", value: scale(226480), unit: "number", previous: scale(218100), previousYear: scale(204120), target: scale(240000), trend: "up", goodDirection: "up", coverage: coverage("GSC hasta D-3", 0.99) },
      { key: "nonbrand_share", label: "Cuota non-branded", value: 63.8, unit: "percent", previous: 61.2, previousYear: 58.9, target: 66, trend: "up", goodDirection: "up", coverage: coverage("96% clasificado", 0.96) },
      { key: "visibility", label: "Visibilidad / SOV", value: 41.6, unit: "percent", previous: 40.1, previousYear: 36.7, target: 45, trend: "up", goodDirection: "up", coverage: coverage("Set estable v3", 1) },
      { key: "technical_health", label: "Salud técnica", value: 66.9, unit: "score", previous: 69.2, previousYear: 64.8, target: 85, trend: "down", goodDirection: "up", coverage: coverage("Último crawl aprobado", 0.94, "parcial") },
    ],
    projects,
    markets: [
      { code: "ES", name: "España", sessions: scale(70042), clicks: scale(85780), conversions: scale(1294), change: 6.2, visibility: 48.1, attention: "estable" },
      { code: "UK", name: "Reino Unido", sessions: scale(36864), clicks: scale(46610), conversions: scale(533), change: 14.8, visibility: 43.7, attention: "estable" },
      { code: "US", name: "Estados Unidos", sessions: scale(33178), clicks: scale(40766), conversions: scale(391), change: -4.6, visibility: 35.2, attention: "observar" },
      { code: "FR", name: "Francia", sessions: scale(25805), clicks: scale(31707), conversions: scale(418), change: -8.9, visibility: 37.4, attention: "actuar" },
      { code: "DE", name: "Alemania", sessions: scale(18432), clicks: scale(21617), conversions: scale(328), change: 2.1, visibility: 39.8, attention: "observar" },
    ].filter((market) => filters.market === "all" || market.code === filters.market) as DashboardPayload["markets"],
    executiveInsights: baseInsights.filter((insight) => filters.project === "all" || insight.project === null || insight.project === filters.project).slice(0, 5),
    geo: { citationShare: 38.6, previousCitationShare: 32.8, citedPrompts: 579, totalPrompts: 1500, aiSessions: scale(2140), aiConversions: scale(38), leadingAssistant: "Gemini", topCitedDomain: "archdaily.com" },
    actions: baseActions.filter((action) => filters.project === "all" || action.project === filters.project),
    sources: [
      { source: "ga4", label: "Google Analytics 4", status: "correcto", lastValidSnapshot: "2026-08-31T05:10:00.000Z", cutoff: "2026-08-30", coverage: 1, note: "Reprocesado móvil de 7 días completado" },
      { source: "gsc", label: "Search Console", status: "correcto", lastValidSnapshot: "2026-08-31T05:42:00.000Z", cutoff: "2026-08-30", coverage: 0.99, note: "D-3 aplicado" },
      { source: "semrush", label: "SEMrush", status: "correcto", lastValidSnapshot: "2026-08-29T06:00:00.000Z", cutoff: "2026-08-29", coverage: 1, note: "Set estable v3" },
      { source: "geo", label: "GEO", status: "correcto", lastValidSnapshot: "2026-08-30T07:30:00.000Z", cutoff: "2026-08-30", coverage: 1, note: "1.500 ejecuciones del piloto" },
      { source: "crux", label: "CrUX", status: "correcto", lastValidSnapshot: "2026-08-29T07:00:00.000Z", cutoff: "2026-08-29", coverage: 0.92, note: "Datos de campo disponibles en 23 templates" },
      { source: "pagespeed", label: "PageSpeed", status: "parcial", lastValidSnapshot: "2026-08-29T08:20:00.000Z", cutoff: "2026-08-29", coverage: 0.88, note: "2 URLs US mantienen snapshot anterior" },
      { source: "crawl", label: "Crawl aprobado", status: "correcto", lastValidSnapshot: "2026-08-28T16:25:00.000Z", cutoff: "2026-08-28", coverage: 0.94, note: "Paquete local firmado v4" },
    ],
    series: {
      organic_sessions: makeSeries(Math.round(5700 * projectFactor * marketFactor), 17, 420 * projectFactor * marketFactor),
      organic_clicks: makeSeries(Math.round(7100 * projectFactor * marketFactor), 24, 510 * projectFactor * marketFactor),
      macro_conversions: makeSeries(Math.round(82 * projectFactor * marketFactor), 0.8, 14 * projectFactor * marketFactor),
    },
    annotations: [
      { id: "ann-1", date: "2026-08-09", label: "Actualización categorías Noken UK", type: "publicacion" },
      { id: "ann-2", date: "2026-08-16", label: "Incidencia canonical FR", type: "incidencia" },
      { id: "ann-3", date: "2026-08-24", label: "Core update conocido", type: "update" },
    ],
    technicalIssues: [
      { id: "porcelanosa-fr-canonical", project: "porcelanosa", title: "Canonical no indexable o ausente en sitemap", category: "Indexabilidad", severity: "critica", affectedUrls: 146, trafficAtRisk: 83420, persistenceRuns: 3, template: "Colección", effort: "medio", priorityScore: 96, sampleUrl: "https://www.porcelanosa.com/fr/collection/exemple" },
      { id: "noken-us-cwv", project: "noken", title: "LCP móvil por encima de 2,5 s", category: "Core Web Vitals", severity: "alta", affectedUrls: 82, trafficAtRisk: 22400, persistenceRuns: 5, template: "Producto", effort: "alto", priorityScore: 71, sampleUrl: "https://www.noken.com/us/products/example" },
      { id: "p-hreflang", project: "porcelanosa", title: "Hreflang sin reciprocidad", category: "Internacional", severity: "media", affectedUrls: 38, trafficAtRisk: 9100, persistenceRuns: 2, template: "Editorial", effort: "bajo", priorityScore: 58, sampleUrl: "https://www.porcelanosa.com/trends/example" },
      { id: "n-orphans", project: "noken", title: "Páginas de colección huérfanas", category: "Enlazado", severity: "media", affectedUrls: 24, trafficAtRisk: 4800, persistenceRuns: 4, template: "Colección", effort: "medio", priorityScore: 46, sampleUrl: "https://www.noken.com/collections/example" },
    ].filter((issue) => filters.project === "all" || issue.project === filters.project) as DashboardPayload["technicalIssues"],
    opportunities: [
      { id: "page-1", project: "porcelanosa", url: "/pavimentos/salon", title: "Pavimentos para salón", type: "categoria", status: "actualizado", clicks: 8420, impressions: 114200, position: 3.4, ctr: 7.4, expectedCtr: 10.1, conversions: 118, opportunityScore: 92 },
      { id: "page-2", project: "porcelanosa", url: "/tendencias/banos-pequenos", title: "Ideas para baños pequeños", type: "editorial", status: "decay", clicks: 3910, impressions: 82800, position: 5.1, ctr: 4.7, expectedCtr: 6.3, conversions: 32, opportunityScore: 78 },
      { id: "page-3", project: "noken", url: "/uk/taps/basin", title: "Basin taps", type: "categoria", status: "actualizado", clicks: 6240, impressions: 69800, position: 3.2, ctr: 8.9, expectedCtr: 10.5, conversions: 74, opportunityScore: 84 },
      { id: "page-4", project: "noken", url: "/us/collections/forma", title: "Forma collection", type: "producto_coleccion", status: "consolidar", clicks: 1740, impressions: 41500, position: 6.4, ctr: 4.2, expectedCtr: 5.0, conversions: 21, opportunityScore: 66 },
    ].filter((page) => filters.project === "all" || page.project === filters.project) as DashboardPayload["opportunities"],
    queryOpportunities: [],
    reports: [
      { id: "report-2026-08", project: null, title: "Cierre ejecutivo · Agosto 2026", type: "mensual", period: "1–31 agosto 2026", version: 1, status: "publicado", author: "María SEO", reviewer: "Carlos Digital", publishedAt: "2026-09-01", executiveSummary: "Crecimiento orgánico sostenido con una incidencia técnica prioritaria en Francia.", blocks: 18 },
      { id: "report-noken-q2", project: "noken", title: "Noken · Revisión profunda Q2", type: "trimestral", period: "abril–junio 2026", version: 2, status: "publicado", author: "Carlos Digital", reviewer: "María SEO", publishedAt: "2026-07-08", executiveSummary: "La expansión non-branded valida el nuevo mapa de categorías en UK.", blocks: 34 },
      { id: "report-canonical", project: "porcelanosa", title: "Especial · Canonicals y sitemap FR", type: "especial", period: "agosto 2026", version: 1, status: "aprobado", author: "María SEO", reviewer: "Lucía Web", publishedAt: null, executiveSummary: "Diagnóstico y plan de verificación para la incidencia de colecciones.", blocks: 12 },
    ].filter((report) => filters.project === "all" || report.project === null || report.project === filters.project) as DashboardPayload["reports"],
  };

  return dashboardPayloadSchema.parse(payload);
}

// ---------------------------------------------------------------------------
// Conector sintético de la visión transversal (P2.2)
// ---------------------------------------------------------------------------

/**
 * Reparto de mercado y ritmo de cambio del piloto. Son los mismos valores que
 * usa la portada de proyecto, para que las dos superficies no se contradigan.
 * `change` es la variación frente al periodo anterior y `yoy` frente al año
 * anterior, en porcentaje.
 */
const MARKET_MIX = {
  ES: { share: 0.38, change: 6.2, yoy: 11.4, visibility: 48.1 },
  UK: { share: 0.2, change: 14.8, yoy: 22.6, visibility: 43.7 },
  US: { share: 0.18, change: -4.6, yoy: 3.2, visibility: 35.2 },
  FR: { share: 0.14, change: -8.9, yoy: -12.5, visibility: 37.4 },
  DE: { share: 0.1, change: 2.1, yoy: 8.8, visibility: 39.8 },
} as const satisfies Record<MarketCode, { share: number; change: number; yoy: number; visibility: number }>;

/**
 * Peso de cada marca del piloto sobre el total del grupo medido y su ritmo
 * propio. `paceOffset`/`yoyOffset` desplazan en puntos porcentuales el cambio de
 * cada mercado para esa marca: sin ellos las dos marcas se moverían exactamente
 * igual y la comparación entre marcas no diría nada. El signo reproduce la
 * historia que ya cuentan los insights del piloto: Noken crece en demanda
 * non-branded y Porcelanosa arrastra la incidencia de Francia.
 */
const PILOT_MIX = {
  porcelanosa: { weight: 0.64, visibilityOffset: 0, attention: "actuar", paceOffset: -2.4, yoyOffset: -1.6 },
  noken: { weight: 0.36, visibilityOffset: -3.4, attention: "observar", paceOffset: 4.1, yoyOffset: 7.8 },
} as const;

const GROUP_SESSIONS_28D = 184320;
const CLICKS_PER_SESSION = 226480 / GROUP_SESSIONS_28D;
const CONVERSIONS_PER_SESSION = 2964 / GROUP_SESSIONS_28D;

/** Objetivo del periodo: interanual más el crecimiento planificado por KPI. */
const PLAN_UPLIFT = { sessions: 1.12, clicks: 1.1, conversions: 1.18 } as const;

const PERIOD_FACTOR = { "28d": 1, "90d": 3.08, "180d": 5.95, "12m": 11.7, "24m": 22.3 } as const;

/**
 * Serie sintética por marca y mercado. Las cifras de la marca se derivan de sus
 * filas de mercado (no al revés), así que la suma por mercados y el total de la
 * marca coinciden siempre, con cualquier filtro.
 */
function mockBrandAnalytics(slug: keyof typeof PILOT_MIX, filters: PortfolioFilters): BrandAnalytics {
  const brand = PILOT_MIX[slug];
  const periodFactor = PERIOD_FACTOR[filters.period];
  const codes = (filters.market === "all" ? (Object.keys(MARKET_MIX) as MarketCode[]) : [filters.market]);

  const markets = codes.map((code) => {
    const mix = MARKET_MIX[code];
    const sessions = Math.round(GROUP_SESSIONS_28D * brand.weight * mix.share * periodFactor);
    return {
      code,
      name: MARKETS.find((market) => market.code === code)?.name ?? code,
      sessions,
      clicks: Math.round(sessions * CLICKS_PER_SESSION),
      conversions: Math.round(sessions * CONVERSIONS_PER_SESSION),
      previousSessions: Math.round(sessions / (1 + (mix.change + brand.paceOffset) / 100)),
      previousYearSessions: Math.round(sessions / (1 + (mix.yoy + brand.yoyOffset) / 100)),
      visibility: Math.round((mix.visibility + brand.visibilityOffset) * 10) / 10,
      contributingBrands: 1,
    };
  });

  const sum = (key: "sessions" | "clicks" | "conversions" | "previousSessions" | "previousYearSessions") =>
    markets.reduce((total, market) => total + market[key], 0);
  const sessions = sum("sessions");
  const previousSessions = sum("previousSessions");
  const previousYearSessions = sum("previousYearSessions");

  return {
    sessions,
    clicks: sum("clicks"),
    conversions: sum("conversions"),
    previousSessions,
    previousYearSessions,
    // El conector sintético asume clics y conversiones por sesión constantes en
    // el tiempo. La suposición vive aquí, en el generador, y no en la
    // agregación: `aggregatePortfolio` solo suma lo que recibe.
    previousClicks: Math.round(previousSessions * CLICKS_PER_SESSION),
    previousYearClicks: Math.round(previousYearSessions * CLICKS_PER_SESSION),
    previousConversions: Math.round(previousSessions * CONVERSIONS_PER_SESSION),
    previousYearConversions: Math.round(previousYearSessions * CONVERSIONS_PER_SESSION),
    targetSessions: Math.round(previousYearSessions * PLAN_UPLIFT.sessions),
    targetClicks: Math.round(previousYearSessions * CLICKS_PER_SESSION * PLAN_UPLIFT.clicks),
    targetConversions: Math.round(previousYearSessions * CONVERSIONS_PER_SESSION * PLAN_UPLIFT.conversions),
    visibility: sessions === 0 ? 0 : Math.round((markets.reduce((total, market) => total + market.visibility * market.sessions, 0) / sessions) * 10) / 10,
    attention: brand.attention,
    coverage: coverage(filters.market === "all" ? "5/5 mercados Tier 1" : `Mercado ${filters.market}`),
    markets,
  };
}

const isPilotSlug = (slug: BrandSlug): slug is keyof typeof PILOT_MIX => slug in PILOT_MIX;

/**
 * Visión transversal sintética. La actividad editorial **no** se genera aquí:
 * llega como argumento porque es dato real importado de V1 y cubre las ocho
 * marcas, mientras la analítica solo cubre el piloto.
 */
export function getMockPortfolio(
  filters: PortfolioFilters,
  editorial: Record<BrandSlug, BrandEditorialActivity>,
  options: { planningYear?: number; generatedAt?: string } = {},
): PortfolioPayload {
  return aggregatePortfolio({
    generatedAt: options.generatedAt ?? "2026-09-02T08:15:00.000Z",
    mode: "synthetic",
    filters,
    editorialPlanningYear: options.planningYear ?? 2026,
    rows: filters.brands.map((slug) => ({
      slug,
      analytics: isPilotSlug(slug) ? mockBrandAnalytics(slug, filters) : null,
      editorial: editorial[slug],
    })),
  });
}

// ---------------------------------------------------------------------------
// Archivo histórico de informes (P2.3)
// ---------------------------------------------------------------------------

/**
 * Capítulos que un informe incluye hoy. No son los deseables: son los que ya
 * tienen superficie en V2 (`publicado` o `parcial` en `REPORT_CHAPTERS`). Un
 * informe no puede declarar un capítulo que el producto todavía no sabe rendir.
 */
const AVAILABLE_CHAPTERS = REPORT_CHAPTERS.filter((chapter) => chapter.state !== "pendiente").map((chapter) => chapter.key);

const version = (
  version: number,
  status: DashboardPayload["reports"][number]["status"],
  author: string,
  reviewer: string | null,
  publishedAt: string | null,
  changeNote: string | null,
) => ({ version, status, author, reviewer, publishedAt, changeNote });

/**
 * Archivo histórico sintético. Extiende los tres informes de la portada con
 * cierres anteriores para que el archivo sea navegable de verdad: sin varios
 * periodos y varios años, «archivo histórico» sería una palabra sin superficie.
 *
 * Las cadenas de versiones no son decorativas: `report-2026-06` tiene fe de
 * erratas y `report-noken-q2` una segunda versión con revisor distinto, que es
 * exactamente el caso que obliga a no reescribir una versión publicada.
 */
export function getMockReportArchive(filters: ReportFilters = { project: "all", type: "all", status: "all", year: "all" }): ReportArchive {
  const entries: ReportArchiveEntry[] = [
    {
      id: "report-2026-08", project: null, title: "Cierre ejecutivo · Agosto 2026", type: "mensual", period: "1–31 agosto 2026",
      version: 1, status: "publicado", author: "María SEO", reviewer: "Carlos Digital", publishedAt: "2026-09-01",
      executiveSummary: "Crecimiento orgánico sostenido con una incidencia técnica prioritaria en Francia.", blocks: 18, year: 2026,
      chapters: [...AVAILABLE_CHAPTERS],
      versions: [version(1, "publicado", "María SEO", "Carlos Digital", "2026-09-01", null)],
    },
    {
      id: "report-canonical", project: "porcelanosa", title: "Especial · Canonicals y sitemap FR", type: "especial", period: "agosto 2026",
      version: 1, status: "aprobado", author: "María SEO", reviewer: "Lucía Web", publishedAt: null,
      executiveSummary: "Diagnóstico y plan de verificación para la incidencia de colecciones.", blocks: 12, year: 2026,
      chapters: ["resumen", "salud-tecnica", "plan-accion", "metodologia"],
      versions: [version(1, "aprobado", "María SEO", "Lucía Web", null, null)],
    },
    {
      id: "report-2026-07", project: null, title: "Cierre ejecutivo · Julio 2026", type: "mensual", period: "1–31 julio 2026",
      version: 1, status: "publicado", author: "María SEO", reviewer: "Carlos Digital", publishedAt: "2026-08-03",
      executiveSummary: "Primer mes con el calendario editorial general de las ocho marcas en marcha.", blocks: 17, year: 2026,
      chapters: ["resumen", "mercados", "programacion-editorial", "plan-accion", "metodologia"],
      versions: [version(1, "publicado", "María SEO", "Carlos Digital", "2026-08-03", null)],
    },
    {
      id: "report-2026-06", project: null, title: "Cierre ejecutivo · Junio 2026", type: "mensual", period: "1–30 junio 2026",
      version: 2, status: "publicado", author: "María SEO", reviewer: "Carlos Digital", publishedAt: "2026-07-06",
      executiveSummary: "Cierre de primer semestre. La v2 corrige el recuento de macroconversiones de Noken US.",
      blocks: 16, year: 2026,
      chapters: ["resumen", "mercados", "plan-accion", "metodologia"],
      versions: [
        version(1, "publicado", "María SEO", "Carlos Digital", "2026-07-02", null),
        version(2, "publicado", "María SEO", "Carlos Digital", "2026-07-06", "Fe de erratas: las macroconversiones de Noken US duplicaban el evento de contacto. Se corrige el capítulo de resumen; el resto del informe no cambia."),
      ],
    },
    {
      id: "report-noken-q2", project: "noken", title: "Noken · Revisión profunda Q2", type: "trimestral", period: "abril–junio 2026",
      version: 2, status: "publicado", author: "Carlos Digital", reviewer: "María SEO", publishedAt: "2026-07-08",
      executiveSummary: "La expansión non-branded valida el nuevo mapa de categorías en UK.", blocks: 34, year: 2026,
      chapters: ["resumen", "mercados", "busquedas", "contenidos", "plan-accion", "metodologia"],
      versions: [
        version(1, "publicado", "Carlos Digital", "Lucía Web", "2026-07-07", null),
        version(2, "publicado", "Carlos Digital", "María SEO", "2026-07-08", "Revisión firmada por la responsable SEO tras ampliar el apartado de mercados."),
      ],
    },
    {
      id: "report-porcelanosa-q1", project: "porcelanosa", title: "Porcelanosa · Revisión profunda Q1", type: "trimestral", period: "enero–marzo 2026",
      version: 1, status: "publicado", author: "María SEO", reviewer: "Carlos Digital", publishedAt: "2026-04-09",
      executiveSummary: "Primer trimestre medido con el criterio de cobertura declarada en cada indicador.", blocks: 31, year: 2026,
      chapters: ["resumen", "mercados", "plan-accion", "metodologia"],
      versions: [version(1, "publicado", "María SEO", "Carlos Digital", "2026-04-09", null)],
    },
    {
      id: "report-2025-cierre", project: null, title: "Cierre anual · 2025", type: "especial", period: "enero–diciembre 2025",
      version: 1, status: "publicado", author: "Carlos Digital", reviewer: "María SEO", publishedAt: "2026-01-22",
      executiveSummary: "Línea base del grupo antes de la migración a V2. Se conserva como referencia, no se reedita.",
      blocks: 26, year: 2025,
      chapters: ["resumen", "mercados", "metodologia"],
      versions: [version(1, "publicado", "Carlos Digital", "María SEO", "2026-01-22", null)],
    },
  ];

  return buildReportArchive({ generatedAt: "2026-09-02T08:15:00.000Z", mode: "synthetic", filters, entries });
}
