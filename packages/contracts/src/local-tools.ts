import { z } from "zod";

/**
 * Catálogo de herramientas e importadores locales (P2.3).
 *
 * V1 tenía utilidades que nunca fueron pantalla de producto —un crawler, un
 * generador de snapshots, cuatro endpoints de desarrollo— y que aun así hacían
 * trabajo real. El riesgo de una migración es perderlas sin decidirlo: nadie las
 * echa de menos hasta que hacen falta.
 *
 * Este catálogo obliga a decidir. Cada herramienta declara qué era en V1, qué se
 * puede usar **hoy** en V2, con qué se ejecuta, qué la bloquea si está bloqueada
 * y en qué fase llega si no está. Los orígenes de V1 y sus fases proceden del
 * inventario auditado en P2.1 (`docs/continuity/v1-migration-inventory.json`),
 * no de la memoria: una prueba comprueba que ninguna herramienta apunta a un
 * origen inventado.
 *
 * `disponible` significa ejecutable ahora mismo en local, no «existe el plan».
 */

export const localToolStateSchema = z.enum(["disponible", "bloqueada", "pendiente", "retirada-propuesta"]);

export const localToolSchema = z.object({
  key: z.string(),
  label: z.string(),
  /** Qué resuelve, en una frase, para quien tiene que decidir si la usa. */
  purpose: z.string(),
  /** Ruta o endpoint de V1 del que procede. `null` si nace en V2. */
  v1Origin: z.string().nullable(),
  state: localToolStateSchema,
  /** Comando o ruta con la que se ejecuta hoy. Obligatorio en `disponible`. */
  entryPoint: z.string().nullable(),
  /** Qué impide usarla. Obligatorio en `bloqueada`. */
  blocker: z.string().nullable(),
  /** Fase en que estará disponible. `null` si ya lo está. */
  phase: z.string().nullable(),
  note: z.string(),
});

export type LocalTool = z.infer<typeof localToolSchema>;
export type LocalToolState = z.infer<typeof localToolStateSchema>;

export const LOCAL_TOOLS = [
  {
    key: "editorial-import",
    label: "Importación editorial de V1",
    purpose: "Trae los cuatro snapshots editoriales de V1 al dataset normalizado, con hash y sin pérdida silenciosa.",
    v1Origin: "/conjunto/plan-editorial",
    state: "disponible",
    entryPoint: "pnpm editorial:import",
    blocker: null,
    phase: null,
    note: "Idempotente por huella de entradas: sin cambios en los ficheros de origen no reescribe nada, y con --force reescribe a propósito. Recuentos de control verificados (39 eventos, 115 backlog, 146 plan, 34 huecos, 68 propuestas).",
  },
  {
    key: "editorial-curation",
    label: "Curación editorial",
    purpose: "Crear y editar piezas, programarlas, asignar owner/autor/revisor y vincularlas con insight, acción, query, página o informe.",
    v1Origin: "/conjunto/plan-editorial",
    state: "disponible",
    entryPoint: "/editorial (workbench)",
    blocker: null,
    phase: null,
    note: "Único punto de escritura del sistema; cada cambio queda versionado con autor y nota. El visor no tiene ninguna ruta de escritura y hay pruebas que lo fijan.",
  },
  {
    key: "disk-preflight",
    label: "Preflight de disco",
    purpose: "Comprobar si el equipo puede sostener un crawl antes de lanzarlo.",
    v1Origin: null,
    state: "disponible",
    entryPoint: "/api/preflight (workbench)",
    blocker: null,
    phase: null,
    note: "Nace en V2. Exige 50 GiB libres para habilitar crawls de hasta 50.000 URLs; es lo que hoy mantiene el crawler bloqueado en vez de dejarlo fallar a mitad.",
  },
  {
    key: "migration-report",
    label: "Informe del inventario de migración",
    purpose: "Renderizar y validar el inventario de capacidades de V1 y sus contratos de reconciliación.",
    v1Origin: null,
    state: "disponible",
    entryPoint: "pnpm migration:report · pnpm migration:check",
    blocker: null,
    phase: null,
    note: "Nace en V2 (P2.1). `migration:check` falla si el Markdown diverge del JSON, si falta una ruta de paridad, si una fase de destino no existe o si una retirada llega sin alternativa.",
  },
  {
    key: "crawl",
    label: "Crawler local",
    purpose: "Rastrear un sitio con límite, robots y sitemap, y producir el snapshot técnico que alimenta la salud del sitio.",
    v1Origin: "/optimizacion/crawl",
    state: "bloqueada",
    entryPoint: null,
    blocker: "El preflight mide ~6,2 GiB libres y se exigen 50 GiB. La interfaz y los importadores sí se pueden validar; el rastreo no se lanza.",
    phase: "P5",
    note: "En V2 vive en el workbench sobre `packages/local-data` (DuckDB/Parquet) y publica un paquete firmado, no el crawl entero.",
  },
  {
    key: "site-health",
    label: "Auditoría de salud técnica",
    purpose: "Inventario de incidencias con severidad, histórico, movimientos y comparación entre crawls.",
    v1Origin: "/optimizacion/estado-del-sitio",
    state: "pendiente",
    entryPoint: null,
    blocker: null,
    phase: "P5",
    note: "El score de V1 no se copia: se recalibra, así que lo que se reconcilia es el inventario de issues —el dato— y no la puntuación —la opinión— (P2.1).",
  },
  {
    key: "task-generation",
    label: "Generación de tareas desde evidencia",
    purpose: "Derivar tareas de crawl, sitemap, GSC e inbound links, con severidad y enlace a la evidencia.",
    v1Origin: "/vision-general/tareas",
    state: "pendiente",
    entryPoint: null,
    blocker: null,
    phase: "P4",
    note: "Lo que se conserva es la generación. El estado que V1 guardaba en `localStorage` es no comparable y no se migra: nunca salió del navegador de cada persona.",
  },
  {
    key: "url-keywords",
    label: "Keywords que ya posiciona una URL",
    purpose: "Para cada URL de reedición del plan, las keywords que ya rankea, combinando GSC y los CSV de SEMrush de Krion y Gamadecor.",
    v1Origin: "/api/url-keywords.json",
    state: "pendiente",
    entryPoint: null,
    blocker: null,
    phase: "P6",
    note: "Clasificada `retain` en P2.1 y comprometida como evidencia de la ficha de pieza editorial: responde la pregunta que abre toda reedición. No tenía UI en V1, y eso no la hacía prescindible.",
  },
  {
    key: "overlap-build",
    label: "Generador de snapshots de solapamiento",
    purpose: "Construir los snapshots del conjunto: cinco marcas desde GSC (query × página, 12 meses) más Krion y Gamadecor desde SEMrush.",
    v1Origin: "/api/canibalizaciones-build.json",
    state: "pendiente",
    entryPoint: null,
    blocker: null,
    phase: "P6",
    note: "Era el generador de `conjunto.json` y `sites-overview.json` de V1. En V2 pasa al workbench, porque escribe.",
  },
  {
    key: "trendbook-report",
    label: "Rendimiento del Trendbook",
    purpose: "Clics e impresiones de 12 meses de los posts del Trendbook, separando el español de sus traducciones.",
    v1Origin: "/api/trendbook-report.json",
    state: "pendiente",
    entryPoint: null,
    blocker: null,
    phase: "P6",
    note: "Se fusiona con la exploración de queries en el rendimiento por cluster de contenido.",
  },
  {
    key: "trendbook-query",
    label: "Exploración de queries por expresión regular",
    purpose: "Encontrar los posts que rankean por queries que casan una expresión regular.",
    v1Origin: "/api/trendbook-query.json",
    state: "pendiente",
    entryPoint: null,
    blocker: null,
    phase: "P3",
    note: "Depende del almacén GSC propio: sin él no hay sobre qué filtrar.",
  },
  {
    key: "cita-tienda-funnel",
    label: "Embudo de cita en tienda",
    purpose: "Flujo GA4 desde la home hasta /cita-tienda/, y su versión filtrada a España sobre cinco eventos concretos.",
    v1Origin: "/api/cita-tienda-flow.json",
    state: "retirada-propuesta",
    entryPoint: null,
    blocker: "Retirada propuesta sin aprobar: la decisión es del responsable, no del equipo de desarrollo.",
    phase: "P4",
    note: "Dos endpoints de desarrollo sin UI. Alternativa registrada: la convención de informes adicionales (D-014) para repetirlo cuando haga falta, y los embudos configurables por evento y mercado de P4 para hacerlo genérico. P2 no cierra mientras la retirada siga en `proposed`.",
  },
] as const satisfies ReadonlyArray<LocalTool>;

export const LOCAL_TOOL_STATE_LABELS: Record<LocalToolState, string> = {
  disponible: "Disponible ahora",
  bloqueada: "Bloqueada",
  pendiente: "Pendiente de fase",
  "retirada-propuesta": "Retirada propuesta",
};

/** Reparto por estado. Es el resumen honesto de qué se puede usar hoy. */
export function localToolSummary(tools: ReadonlyArray<LocalTool> = LOCAL_TOOLS) {
  return {
    total: tools.length,
    disponibles: tools.filter((tool) => tool.state === "disponible").length,
    bloqueadas: tools.filter((tool) => tool.state === "bloqueada").length,
    pendientes: tools.filter((tool) => tool.state === "pendiente").length,
    retiradasPropuestas: tools.filter((tool) => tool.state === "retirada-propuesta").length,
    /** Herramientas heredadas de V1, frente a las que nacen en V2. */
    deV1: tools.filter((tool) => tool.v1Origin !== null).length,
  };
}

/** Agrupa por estado en el orden en que se leen: primero lo usable. */
export function localToolsByState(tools: ReadonlyArray<LocalTool> = LOCAL_TOOLS) {
  const order: LocalToolState[] = ["disponible", "bloqueada", "pendiente", "retirada-propuesta"];
  return order.map((state) => ({ state, label: LOCAL_TOOL_STATE_LABELS[state], tools: tools.filter((tool) => tool.state === state) }));
}
