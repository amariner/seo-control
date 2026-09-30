import type { BrandReport, SiteAuditSummary } from "@seo/contracts";
import type { EditorialPlanRow } from "@seo/editorial-ui";
import { change, listOf, nf, pathOf, pct, signed } from "./format";
import { analysePages } from "./page-analysis";

/**
 * Acciones del proyecto (D-075, D-088): cada apartado propone acciones con
 * prioridad y motivo (la cifra que la justifica), calculadas con reglas y
 * umbrales de este fichero, nunca con IA.
 *
 * - `reportPlanActions`: las reglas del plan de acción del informe (D-075).
 *   Los informes congelados se vuelven a pintar con ellas y las
 *   puntualizaciones del equipo nombran sus filas: no se cambian sin revisar
 *   esas versiones.
 * - `projectActionReview`: el repaso de la pestaña «Acciones» del visor. Suma
 *   a las del informe reglas propias de cada apartado y un hallazgo por
 *   apartado, también cuando no hay nada que hacer. Informes no tiene bloque.
 */

export type Priority = "urgente" | "alta" | "media" | "baja";
export const PRIORITY_ORDER: Record<Priority, number> = { urgente: 0, alta: 1, media: 2, baja: 3 };
export const PRIORITY_LABEL: Record<Priority, string> = { urgente: "Urgente", alta: "Alta", media: "Media", baja: "Baja" };

/** Pestañas del proyecto en el visor, en su orden. */
export type ActionTab = "resumen" | "busquedas" | "paginas" | "mercados" | "migracion" | "editorial" | "estado" | "informes";
export const ACTION_TABS: Array<{ key: ActionTab; label: string }> = [
  { key: "resumen", label: "Resumen" },
  { key: "busquedas", label: "Keywords" },
  { key: "paginas", label: "Páginas" },
  { key: "mercados", label: "Mercados" },
  { key: "migracion", label: "Migración" },
  { key: "editorial", label: "Plan editorial" },
  { key: "estado", label: "Estado del sitio" },
  { key: "informes", label: "Informes" },
];

export type ProjectAction = {
  priority: Priority;
  title: string;
  why: string;
  area: string;
  /** Apartado del que sale y donde está el detalle. */
  tab: ActionTab;
  /** Fuente de la cifra del motivo. */
  source: string;
  /** Forma parte del plan de acción del informe del periodo. */
  inReport: boolean;
};

export type ActionInput = {
  report: BrandReport;
  pieces: EditorialPlanRow[];
  audit: SiteAuditSummary | null;
  rootLabel?: string;
  /** Día de referencia (YYYY-MM-DD). */
  today: string;
};

/** Tarea concreta por incidencia del crawl: el verbo es lo que hay que hacer. */
export const TASKS: Record<string, string> = {
  http_4xx: "Redirigir con 301 o recuperar las URL que dan error 4xx",
  http_5xx: "Revisar con sistemas los errores de servidor",
  redirect_internal:
    "Apuntar los enlaces internos al destino final, sin redirección",
  noindex: "Confirmar si el noindex es intencionado; si no, quitarlo",
  canonical_other:
    "Revisar que el canonical apunte a la versión que debe posicionar",
  canonical_missing: "Añadir canonical autorreferente",
  sitemap_non_indexable: "Sacar del sitemap las URL no indexables",
  not_in_sitemap: "Incluir en el sitemap las páginas indexables que faltan",
  title_missing: "Escribir el title de las páginas que no lo tienen",
  title_duplicate: "Diferenciar los titles duplicados",
  title_too_long: "Acortar titles a menos de 60 caracteres",
  title_too_short: "Completar titles demasiado cortos con la keyword",
  description_missing: "Redactar meta descriptions que vendan el clic",
  description_duplicate: "Diferenciar las meta descriptions duplicadas",
  description_too_long: "Acortar descriptions a menos de 160 caracteres",
  description_too_short: "Ampliar descriptions demasiado cortas",
  h1_missing: "Añadir un H1 con el tema de la página",
  h1_multiple: "Dejar un único H1 por página",
  thin_content: "Ampliar el contenido de las páginas con poco texto",
  img_missing_alt: "Añadir texto alternativo a las imágenes",
  broken_links: "Corregir los enlaces internos que apuntan a errores",
  links_to_redirects: "Actualizar enlaces internos que pasan por redirecciones",
  lang_missing: "Declarar el idioma con el atributo lang",
  hreflang_missing: "Enlazar las versiones de idioma con hreflang",
  hreflang_no_xdefault: "Añadir hreflang x-default",
  hreflang_no_self: "Incluir la propia URL en el grupo hreflang",
  slow_response: "Comprobar el tiempo de respuesta del servidor (medido en local, orientativo)",
  html_heavy: "Aligerar el HTML de las páginas más pesadas",
};
export const SEVERITY_ORDER = { critica: 0, alta: 1, media: 2, baja: 3 } as const;

const STEP_AREA = {
  tecnico: { label: "Técnico", priority: "alta", tab: "migracion" },
  medicion: { label: "Medición", priority: "alta", tab: "resumen" },
  contenido: { label: "Contenido", priority: "media", tab: "busquedas" },
  editorial: { label: "Editorial", priority: "media", tab: "editorial" },
} as const satisfies Record<BrandReport["nextSteps"][number]["area"], { label: string; priority: Priority; tab: ActionTab }>;
const STEP_SOURCE = { tecnico: "Search Console y comprobación de redirecciones", medicion: "GA4", contenido: "Search Console", editorial: "Plan editorial y Search Console" } as const;

const crawlDate = (audit: SiteAuditSummary) =>
  new Date(audit.completedAt).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Madrid" });
const urls = (n: number) => `${nf(n)} ${n === 1 ? "URL" : "URLs"}`;

/** Mercados con al menos 50 visitas antes y su variación. */
export function marketMoves(report: BrandReport) {
  return [...report.markets]
    .sort((a, b) => b.sessions - a.sessions)
    .filter((item) => item.previous >= 50)
    .map((item) => ({ name: item.name, diff: change(item.sessions, item.previous)!, sessions: item.sessions }));
}

/** Estado del plan editorial en el periodo del informe. */
export function editorialState(report: BrandReport, pieces: EditorialPlanRow[], today: string) {
  const w = report.window;
  const inPeriod = (date: string | null) => Boolean(date && date >= w.start && date <= w.end);
  const published = pieces.filter((piece) => piece.statusKey === "publicado" && inPeriod(piece.publicationDate)).sort((a, b) => a.publicationDate!.localeCompare(b.publicationDate!));
  const next = pieces
    .filter((piece) => piece.publicationDate && piece.publicationDate >= today && piece.statusKey !== "publicado" && piece.statusKey !== "descartado")
    .sort((a, b) => a.publicationDate!.localeCompare(b.publicationDate!))
    .slice(0, 6);
  const doing = pieces.filter((piece) => ["aceptado", "redactando", "revision", "programado"].includes(piece.statusKey)).length;
  const pending = pieces.filter((piece) => ["backlog", "desconocido"].includes(piece.statusKey)).length;
  return { published, next, doing, pending };
}

/** Incidencias del crawl con URL afectadas, por severidad; las urgentes o altas aparte. */
export function crawlTasks(audit: SiteAuditSummary) {
  const tasks = audit.issues
    .filter((issue) => issue.affected > 0)
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.affected - a.affected)
    .slice(0, 7);
  return { tasks, urgent: tasks.filter((task) => task.severity === "critica" || task.severity === "alta") };
}

/**
 * Plan de acción del informe (D-075), en el orden en que lo arma el informe:
 * próximos pasos del repositorio y, después, Páginas, Mercados, Plan
 * editorial y Estado del sitio.
 */
export function reportPlanActions({ report, pieces, audit, rootLabel, today }: ActionInput): ProjectAction[] {
  const actions: ProjectAction[] = report.nextSteps.map((step) => ({
    priority: STEP_AREA[step.area].priority,
    title: step.title,
    why: step.why,
    area: STEP_AREA[step.area].label,
    tab: STEP_AREA[step.area].tab,
    source: STEP_SOURCE[step.area],
    inReport: true,
  }));
  const ga4 = report.sources.some((source) => source.source === "ga4" && source.ok);

  const pages = analysePages(report, rootLabel);
  if (pages.available && pages.variantGroups >= 10)
    actions.push({
      priority: "media",
      title: "Unificar las rutas servidas en varias URLs con 301 y canonical",
      why: `${nf(pages.variantGroups)} rutas aparecen en Google con y sin barra final, mayúsculas o parámetros; ${nf(pages.variantClicks)} clics caen en variantes secundarias.`,
      area: "Técnico",
      tab: "paginas",
      source: "Search Console",
      inReport: true,
    });

  // Caídas de más de la mitad: no es demanda, es la web (idioma, hreflang, redirecciones).
  // Con un mercado filtrado, el reparto es contexto: no entra en el plan.
  if (ga4 && report.markets.length && report.market === "all") {
    const collapsed = marketMoves(report)
      .filter((item) => item.diff <= -50)
      .sort((a, b) => a.diff - b.diff)
      .map((item) => item.name);
    if (collapsed.length)
      actions.push({
        priority: "alta",
        title: `Revisar ${listOf(collapsed)}: carpeta de idioma, hreflang y redirecciones`,
        why: `${collapsed.length === 1 ? "Cae" : "Caen"} más de un 50 % en visitas SEO frente al ${report.window.previousLabel}; una caída así no se explica por la demanda.`,
        area: "Mercados",
        tab: "mercados",
        source: "GA4",
        inReport: true,
      });
  }

  if (pieces.length) {
    const { published, next, doing, pending } = editorialState(report, pieces, today);
    if (published.length === 0 && doing + pending > 0)
      actions.push({
        priority: "media",
        title: "Fijar una cadencia mínima de publicación",
        why: `Ninguna pieza publicada en el periodo, con ${nf(doing)} en marcha y ${nf(pending)} por empezar.`,
        area: "Editorial",
        tab: "editorial",
        source: "Plan editorial",
        inReport: true,
      });
    if (next.length === 0 && pending > 0)
      actions.push({
        priority: "baja",
        title: "Dar fecha a las piezas por empezar",
        why: `${nf(pending)} ${pending === 1 ? "pieza sin fecha no entra" : "piezas sin fecha no entran"} en el calendario.`,
        area: "Editorial",
        tab: "editorial",
        source: "Plan editorial",
        inReport: true,
      });
  }

  // En el plan, una sola fila para el crawl: el detalle por tarea ya está en
  // su apartado y no debe desplazar acciones de más alcance.
  if (audit) {
    const { urgent } = crawlTasks(audit);
    const crawled = crawlDate(audit);
    const source = `Crawl del ${crawled}`;
    if (urgent.length === 1)
      actions.push({
        priority: urgent[0]!.severity === "critica" ? "urgente" : "alta",
        title: TASKS[urgent[0]!.id] ?? urgent[0]!.label,
        why: `${urls(urgent[0]!.affected)} en el crawl del ${crawled}${urgent[0]!.sample[0] ? `, p. ej. ${urgent[0]!.sample[0]}` : ""}.`,
        area: "Técnico",
        tab: "estado",
        source,
        inReport: true,
      });
    else if (urgent.length > 1)
      actions.push({
        priority: urgent.some((task) => task.severity === "critica") ? "urgente" : "alta",
        title: `Resolver las ${nf(urgent.length)} incidencias urgentes o altas del crawl`,
        why: `${listOf(urgent.map((task) => `${task.label} (${urls(task.affected)})`))} en el crawl del ${crawled}; tareas y ejemplos en «Estado del sitio».`,
        area: "Técnico",
        tab: "estado",
        source,
        inReport: true,
      });
  }
  return actions;
}

/* ---------------------------------------------------------------------------
 * Repaso de la pestaña «Acciones» (D-088)
 * ------------------------------------------------------------------------- */

/** Páginas con clics fuera de los sitemaps, calculadas en el visor (D-087). */
export type SitemapGap = { pages: number; clicks: number; share: number; folders: string[] };

export type ReviewInput = ActionInput & { sitemapGap?: SitemapGap | null };

export type ReviewSection = {
  tab: ActionTab;
  label: string;
  /** Qué dice hoy el apartado, con su cifra; `null` si no hay datos. */
  finding: string | null;
  actions: ProjectAction[];
};

export const REVIEW_THRESHOLDS = {
  /** Caída de clics sin marca que pide revisar keywords. */
  nonBrandDrop: -10,
  /** Caída de visitas de un mercado que pide vigilarlo (por debajo de −50 ya es alta). */
  marketWatch: -30,
  /** Páginas con clics fuera de los sitemaps para proponer incluirlas; alta desde este % de clics. */
  sitemapGapPages: 10,
  sitemapGapHighShare: 10,
  /** Keywords con CTR por debajo del esperado en top 3. */
  lowCtrKeywords: 3,
  /** Días desde el último crawl publicado para proponer repetirlo. */
  staleCrawlDays: 45,
} as const;

const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

export function projectActionReview(input: ReviewInput): ReviewSection[] {
  const { report, pieces, audit, rootLabel, today, sitemapGap } = input;
  const T = REVIEW_THRESHOLDS;
  const prev = report.window.previousLabel;
  const plan = reportPlanActions(input);
  const extra: ProjectAction[] = [];
  const findings: Partial<Record<ActionTab, string | null>> = {};
  const kpi = (key: BrandReport["kpis"][number]["key"]) => report.kpis.find((item) => item.key === key);

  // Resumen: fuentes caídas y la cifra principal.
  for (const source of report.sources.filter((item) => !item.ok))
    extra.push({
      priority: "urgente",
      title: `Restablecer la lectura de ${source.source === "ga4" ? "Google Analytics" : "Search Console"}`,
      why: `Sin esa fuente, los apartados que dependen de ella salen vacíos o incompletos. ${source.note}`.trim(),
      area: "Medición",
      tab: "resumen",
      source: "Estado de las fuentes",
      inReport: false,
    });
  const clicks = kpi("clicks");
  const sessions = kpi("search_sessions");
  const lead = clicks?.value != null ? clicks : sessions;
  if (lead && lead.value !== null) {
    const diff = change(lead.value, lead.previous);
    findings.resumen = `${nf(lead.value)} ${lead === clicks ? "clics en Google" : "visitas SEO"}${diff === null ? "" : ` (${signed(diff)} frente al ${prev})`}.`;
  } else findings.resumen = null;

  // Keywords: caída sin marca y CTR bajo en top 3.
  const nonBrand = report.searchTotals?.nonBrand.clicks;
  const nonBrandDiff = nonBrand ? change(nonBrand.value, nonBrand.previous) : null;
  if (nonBrandDiff !== null && nonBrandDiff <= T.nonBrandDrop && report.keywordsDown.length) {
    const top = report.keywordsDown.slice(0, 3);
    extra.push({
      priority: "alta",
      title: `Recuperar las keywords sin marca que pierden clics: ${listOf(top.map((item) => `«${item.query}»`))}`,
      why: `Los clics sin marca ${signed(nonBrandDiff)} frente al ${prev}; esas tres pasan de ${nf(top.reduce((sum, item) => sum + item.before, 0))} a ${nf(top.reduce((sum, item) => sum + item.now, 0))} clics.`,
      area: "Contenido",
      tab: "busquedas",
      source: "Search Console",
      inReport: false,
    });
  }
  const lowCtr = report.opportunities.filter((item) => item.kind === "ctr");
  if (lowCtr.length >= T.lowCtrKeywords)
    extra.push({
      priority: "media",
      title: `Reescribir title y description de ${nf(lowCtr.length)} keywords en top 3 con CTR bajo`,
      why: `Están en las tres primeras posiciones pero reciben menos clics de los esperados: hasta ${nf(lowCtr.reduce((sum, item) => sum + item.potentialClicks, 0))} clics más, p. ej. «${lowCtr[0]!.query}».`,
      area: "Contenido",
      tab: "busquedas",
      source: "Search Console",
      inReport: false,
    });
  findings.busquedas = nonBrand && nonBrand.value !== null
    ? `${nf(nonBrand.value)} clics sin marca${nonBrandDiff === null ? "" : ` (${signed(nonBrandDiff)})`} y ${nf(report.opportunities.length)} oportunidades detectadas.`
    : null;

  // Páginas: URLs que pierden y páginas con clics fuera de los sitemaps.
  const pages = analysePages(report, rootLabel);
  if (pages.available) {
    if (pages.netClicks < 0 && report.contentDown.length) {
      const top = report.contentDown.slice(0, 3);
      extra.push({
        priority: "media",
        title: "Revisar las URL que más clics pierden",
        why: `${nf(pages.losing)} URLs pierden clics frente a ${nf(pages.gaining)} que ganan (${signed(pages.netClicks, 0, "")} clics netos); primero ${listOf(top.map((item) => `${pathOf(item.page)} (${nf(item.before)} → ${nf(item.now)})`))}.`,
        area: "Contenido",
        tab: "paginas",
        source: "Search Console",
        inReport: false,
      });
    }
    findings.paginas = `${nf(pages.visible)} URLs en Google y ${nf(pages.withClicks)} con clics; ganan ${nf(pages.gaining)} y pierden ${nf(pages.losing)}.`;
  } else findings.paginas = null;
  if (sitemapGap && sitemapGap.pages >= T.sitemapGapPages)
    extra.push({
      priority: sitemapGap.share >= T.sitemapGapHighShare ? "alta" : "media",
      title: `Incluir en los sitemaps las ${nf(sitemapGap.pages)} páginas con clics que no declaran`,
      why: `Reciben ${nf(sitemapGap.clicks)} clics (${pct(sitemapGap.share)} de la muestra) y ningún sitemap las declara${sitemapGap.folders.length ? `; sobre todo ${listOf(sitemapGap.folders.map((folder) => `/${folder}/`))}` : ""}.`,
      area: "Técnico",
      tab: "paginas",
      source: "Sitemaps del crawl y Search Console",
      inReport: false,
    });

  // Mercados: caídas entre −30 % y −50 % (las mayores ya están en el plan).
  const ga4 = report.sources.some((source) => source.source === "ga4" && source.ok);
  if (ga4 && report.markets.length) {
    const moves = marketMoves(report);
    const total = report.markets.reduce((sum, item) => sum + item.sessions, 0);
    const top = [...report.markets].sort((a, b) => b.sessions - a.sessions)[0]!;
    if (report.market === "all") {
      const watch = moves.filter((item) => item.diff <= T.marketWatch && item.diff > -50).sort((a, b) => a.diff - b.diff);
      if (watch.length)
        extra.push({
          priority: "media",
          title: `Vigilar ${listOf(watch.map((item) => item.name))}`,
          why: `${listOf(watch.map((item) => `${item.name} ${signed(item.diff, 0)}`))} en visitas SEO frente al ${prev}.`,
          area: "Mercados",
          tab: "mercados",
          source: "GA4",
          inReport: false,
        });
    }
    findings.mercados = `${top.name} aporta el ${pct(total ? (top.sessions / total) * 100 : null)} de las visitas SEO; ${nf(moves.filter((item) => item.diff < 0).length)} de ${nf(moves.length)} mercados caen.`;
  } else findings.mercados = null;

  // Migración: las acciones vienen de los próximos pasos del repositorio.
  const migration = report.migration;
  findings.migracion = migration
    ? `${nf(migration.lostUrls)} URLs antiguas pierden más del 80 % de sus clics; ${nf(migration.checked)} revisadas.`
    : null;

  // Plan editorial.
  if (pieces.length) {
    const { published, next, doing, pending } = editorialState(report, pieces, today);
    findings.editorial = `${nf(published.length)} ${published.length === 1 ? "pieza publicada" : "piezas publicadas"} en el periodo, ${nf(doing)} en marcha, ${nf(pending)} por empezar y ${nf(next.length)} con fecha próxima.`;
  } else findings.editorial = null;

  // Estado del sitio: sin crawl, crawl antiguo y on-page de severidad media.
  if (!audit)
    extra.push({
      priority: "media",
      title: "Lanzar y publicar un primer crawl",
      why: "Sin crawl publicado no hay estado técnico del sitio: errores, indexabilidad ni sitemaps.",
      area: "Técnico",
      tab: "estado",
      source: "Crawls publicados",
      inReport: false,
    });
  else {
    const { tasks, urgent } = crawlTasks(audit);
    const age = daysBetween(audit.completedAt.slice(0, 10), today);
    if (age >= T.staleCrawlDays)
      extra.push({
        priority: "baja",
        title: "Repetir el crawl",
        why: `El último publicado es del ${crawlDate(audit)} (hace ${nf(age)} días): puede no reflejar el sitio actual.`,
        area: "Técnico",
        tab: "estado",
        source: `Crawl del ${crawlDate(audit)}`,
        inReport: false,
      });
    // Las dos incidencias medias con más URL: on-page, después de lo urgente.
    for (const task of tasks.filter((item) => item.severity === "media").slice(0, 2))
      extra.push({
        priority: "baja",
        title: TASKS[task.id] ?? task.label,
        why: `${task.label}: ${urls(task.affected)} en el crawl del ${crawlDate(audit)}${task.sample[0] ? `, p. ej. ${task.sample[0]}` : ""}.`,
        area: "Técnico",
        tab: "estado",
        source: `Crawl del ${crawlDate(audit)}`,
        inReport: false,
      });
    findings.estado = `${nf(audit.totals.crawled)} URLs principales rastreadas: ${nf(audit.totals.indexable)} indexables y ${nf(urgent.length)} ${urgent.length === 1 ? "tarea urgente o alta" : "tareas urgentes o altas"}.`;
  }

  const all = [...plan, ...extra];
  // Informes no tiene bloque: recopila los demás apartados, no propone acciones propias.
  return ACTION_TABS.filter((tab) => tab.key !== "informes" && (tab.key !== "migracion" || migration)).map((tab) => ({
    tab: tab.key,
    label: tab.label,
    finding: findings[tab.key] ?? null,
    actions: all
      .map((action, index) => ({ action, index }))
      .filter(({ action }) => action.tab === tab.key)
      .sort((a, b) => PRIORITY_ORDER[a.action.priority] - PRIORITY_ORDER[b.action.priority] || a.index - b.index)
      .map(({ action }) => action),
  }));
}
