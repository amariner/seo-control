import { z } from "zod";
import { brandSlugSchema } from "@seo/contracts";
import { nf } from "./format";
import {
  ACTION_TABS,
  meetsTarget,
  reviewActions,
  type ActionMetric,
  type ActionTab,
  type MetricTarget,
  type Priority,
  type ProjectAction,
  type ReviewSection,
} from "./project-actions";

/**
 * Seguimiento de las acciones del proyecto (D-090, H10).
 *
 * Las acciones de la pestaña «Acciones» salen de reglas (D-088) y se
 * recalculan con cada periodo; el seguimiento es lo que el equipo decide
 * sobre ellas: estado, responsable, plazo, nota y aprendizaje. Se guarda por
 * `<marca>:<clave de la regla>`, así que una acción conserva su seguimiento
 * aunque cambie la cifra del título.
 *
 * Al empezar el seguimiento se guarda el **punto de partida**: la cifra de la
 * acción con su corte, ventana, mercado y crawl. `pnpm action:measure` vuelve
 * a calcular esa cifra con datos nuevos y la misma ventana, y el resultado se
 * lee frente al criterio de éxito de la regla. Nunca se extrapola: un
 * resultado con días anteriores a la acción, o sin crawl posterior, se marca
 * como provisional.
 *
 * Lo escribe solo el chat (`pnpm action:track`, `pnpm action:measure`, D-082)
 * en `data/tracking/actions.json`; el visor lo empaqueta en el build y lo
 * muestra de solo lectura. Con Postgres (P3.1) pasará a tabla con la misma
 * forma.
 */

export const trackedActionStatusSchema = z.enum(["planificada", "en_curso", "bloqueada", "completada", "descartada"]);
export type TrackedActionStatus = z.infer<typeof trackedActionStatusSchema>;

export const TRACKED_STATUS_LABEL: Record<TrackedActionStatus, string> = {
  planificada: "Planificada",
  en_curso: "En curso",
  bloqueada: "Bloqueada",
  completada: "Completada",
  descartada: "Descartada",
};

export const isClosedStatus = (status: TrackedActionStatus) => status === "completada" || status === "descartada";

/**
 * Plazo por defecto según la prioridad, en días desde que empieza el
 * seguimiento. Es el SLA de la acción: el equipo puede fijar otra fecha.
 */
export const ACTION_SLA_DAYS: Record<Priority, number> = { urgente: 7, alta: 30, media: 60, baja: 90 };

/** Días de datos posteriores a la acción para dar un resultado de búsqueda por asentado. */
export const SETTLED_DAYS = 28;

const isoDate = z.string().date();
export const actionKeySchema = z.string().regex(/^[a-z]+(:[a-z0-9_-]+)+$/, "Clave de acción no válida");
const metricTargetSchema = z.object({ op: z.enum(["lt", "lte", "gt", "gte", "eq"]), value: z.number() });

/** Una medición de la cifra: el punto de partida o el último resultado. */
export const actionMeasurementSchema = z.object({
  /** `null` si ese día no había dato para calcularla. */
  value: z.number().nullable(),
  /** Último día con dato de GA4 y Search Console. */
  cutoff: isoDate,
  /** Ventana del informe con la que se calculó. */
  window: z.object({ start: isoDate, end: isoDate }),
  range: z.string(),
  market: z.string(),
  /** Crawl publicado que se usó (`completedAt`), si lo había. */
  crawl: z.string().nullable(),
  /** La regla proponía la acción con esos datos. */
  proposed: z.boolean(),
  /** Título y motivo de la acción en esa medición, si la regla la proponía. */
  title: z.string().nullable(),
  why: z.string().nullable(),
  measuredAt: z.string().datetime(),
  measuredBy: z.string(),
});
export type ActionMeasurement = z.infer<typeof actionMeasurementSchema>;

export const trackedActionSchema = z.object({
  brand: brandSlugSchema,
  key: actionKeySchema,
  /** Título, motivo y clasificación de la acción cuando empezó el seguimiento. */
  title: z.string(),
  why: z.string(),
  area: z.string(),
  tab: z.enum(ACTION_TABS.map((tab) => tab.key) as [ActionTab, ...ActionTab[]]),
  priority: z.enum(["urgente", "alta", "media", "baja"]),
  source: z.string(),
  status: trackedActionStatusSchema,
  owner: z.string().trim().min(1).max(80).nullable(),
  due: isoDate,
  /** `sla`: plazo por prioridad; `equipo`: fecha fijada por el equipo. */
  dueSource: z.enum(["sla", "equipo"]),
  note: z.string().trim().max(600).nullable(),
  /** Qué se aprendió al cerrarla: lo que se reutiliza en la próxima. */
  learning: z.string().trim().max(600).nullable(),
  /** La cifra sin su valor: etiqueta, unidad, dirección y dato que la mueve. */
  metric: z
    .object({
      label: z.string(),
      unit: z.enum(["", "%", "días", "sí/no"]),
      better: z.enum(["lower", "higher"]),
      evidence: z.enum(["busqueda", "crawl", "editorial", "fuente"]),
    })
    .nullable(),
  /** Criterio de éxito fijado al empezar; `null` si la acción no tiene cifra. */
  target: metricTargetSchema.nullable(),
  criterion: z.string(),
  baseline: actionMeasurementSchema,
  result: actionMeasurementSchema.nullable(),
  createdAt: z.string().datetime(),
  createdBy: z.string(),
  updatedAt: z.string().datetime(),
  updatedBy: z.string(),
  closedAt: z.string().datetime().nullable(),
  /** Cada cambio con autor y fecha: la decisión queda trazada. */
  history: z.array(z.object({ at: z.string().datetime(), by: z.string(), change: z.string() })),
});
export type TrackedAction = z.infer<typeof trackedActionSchema>;

export const actionTrackingStoreSchema = z.object({
  schemaVersion: z.literal(1),
  updatedAt: z.string(),
  /** Por `<marca>:<clave>`. */
  actions: z.record(z.string(), trackedActionSchema),
});
export type ActionTrackingStore = z.infer<typeof actionTrackingStoreSchema>;

export const emptyActionTracking = (): ActionTrackingStore => ({ schemaVersion: 1, updatedAt: new Date(0).toISOString(), actions: {} });

export const trackedIdOf = (brand: string, key: string) => `${brand}:${key}`;

/** Lectura tolerante: un fichero que ya no cumple el contrato no tumba la página, se avisa. */
export function parseActionTracking(input: unknown): ActionTrackingStore & { invalid: string | null } {
  const parsed = actionTrackingStoreSchema.safeParse(input);
  if (parsed.success) return { ...parsed.data, invalid: null };
  return { ...emptyActionTracking(), invalid: parsed.error.issues.slice(0, 3).map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ") };
}

export const actionsOfBrand = (store: ActionTrackingStore, brand: string) =>
  Object.values(store.actions)
    .filter((action) => action.brand === brand)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

/* ---------------------------------------------------------------------------
 * Fechas
 * ------------------------------------------------------------------------- */

const DAY = 86_400_000;
export const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
const daysFrom = (from: string, to: string) => Math.round((Date.parse(`${to.slice(0, 10)}T00:00:00Z`) - Date.parse(`${from.slice(0, 10)}T00:00:00Z`)) / DAY);

export const shortDate = (value: string) =>
  new Date(`${value.slice(0, 10)}T00:00:00Z`).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/* ---------------------------------------------------------------------------
 * Cifras
 * ------------------------------------------------------------------------- */

export function formatMetricValue(value: number | null, unit: ActionMetric["unit"]): string {
  if (value === null) return "sin dato";
  if (unit === "sí/no") return value ? "sí" : "no";
  // Espacio de no separación: la cifra y su unidad no se parten entre líneas.
  if (unit === "%") return `${value > 0 ? "+" : value < 0 ? "−" : ""}${nf(Math.abs(value), 1)} %`;
  const sign = value < 0 ? "−" : "";
  if (unit === "días") return `${sign}${nf(Math.abs(value))} ${Math.abs(value) === 1 ? "día" : "días"}`;
  return `${sign}${nf(Math.abs(value))}`;
}

/** Objetivo fijado al empezar: el de la regla o, si no tiene, mejorar el punto de partida. */
export function resolveTarget(metric: ActionMetric | null, baseline: number | null): { target: MetricTarget | null; criterion: string } {
  if (!metric) return { target: null, criterion: "Que los datos dejen de proponer la acción" };
  if (metric.target) return { target: metric.target, criterion: metric.criterion ?? metric.label };
  if (baseline === null) return { target: null, criterion: `Mejorar «${metric.label}» respecto al punto de partida` };
  return {
    target: { op: metric.better === "lower" ? "lt" : "gt", value: baseline },
    criterion: `${metric.label}: ${metric.better === "lower" ? "menos" : "más"} que al empezar (${formatMetricValue(baseline, metric.unit)})`,
  };
}

/* ---------------------------------------------------------------------------
 * Altas y cambios
 * ------------------------------------------------------------------------- */

export class ActionTrackingError extends Error {}

export type TrackingChange = {
  status?: TrackedActionStatus;
  /** Cadena vacía: quitar el responsable. */
  owner?: string;
  /** `sla`: volver al plazo por prioridad. */
  due?: string;
  /** Cadena vacía: quitar la nota. */
  note?: string;
  learning?: string;
};

const clean = (value: string | undefined) => (value === undefined ? undefined : value.trim() || null);

function checkDue(due: string | undefined) {
  if (due === undefined || due === "sla") return;
  if (!isoDate.safeParse(due).success) throw new ActionTrackingError(`Plazo no válido: ${due} (usa AAAA-MM-DD o «sla»)`);
}

/**
 * Empieza el seguimiento de una acción que los datos proponen hoy. Guarda su
 * punto de partida y su criterio de éxito; el plazo, si el equipo no lo fija,
 * es el SLA de su prioridad.
 */
export function startTracking({
  brand,
  action,
  baseline,
  change = {},
  author,
  now,
}: {
  brand: string;
  action: ProjectAction;
  baseline: ActionMeasurement;
  change?: TrackingChange;
  author: string;
  now: string;
}): TrackedAction {
  checkDue(change.due);
  const today = now.slice(0, 10);
  const status = change.status ?? "planificada";
  const teamDue = change.due && change.due !== "sla" ? change.due : null;
  const owner = clean(change.owner) ?? null;
  const { target, criterion } = resolveTarget(action.metric, baseline.value);
  const due = teamDue ?? addDays(today, ACTION_SLA_DAYS[action.priority]);
  const summary = [
    TRACKED_STATUS_LABEL[status].toLowerCase(),
    owner ? `responsable ${owner}` : "sin responsable",
    `plazo ${shortDate(due)}${teamDue ? "" : ` (SLA ${action.priority}: ${ACTION_SLA_DAYS[action.priority]} días)`}`,
    action.metric ? `punto de partida ${formatMetricValue(baseline.value, action.metric.unit)}` : null,
  ].filter(Boolean);
  return trackedActionSchema.parse({
    brand,
    key: action.key,
    title: action.title,
    why: action.why,
    area: action.area,
    tab: action.tab,
    priority: action.priority,
    source: action.source,
    status,
    owner,
    due,
    dueSource: teamDue ? "equipo" : "sla",
    note: clean(change.note) ?? null,
    learning: clean(change.learning) ?? null,
    metric: action.metric ? { label: action.metric.label, unit: action.metric.unit, better: action.metric.better, evidence: action.metric.evidence } : null,
    target,
    criterion,
    baseline,
    result: null,
    createdAt: now,
    createdBy: author,
    updatedAt: now,
    updatedBy: author,
    closedAt: isClosedStatus(status) ? now : null,
    history: [{ at: now, by: author, change: `Seguimiento iniciado: ${summary.join(", ")}` }],
  });
}

/**
 * Aplica un cambio del equipo. Devuelve los cambios en palabras; sin cambios,
 * la lista va vacía y no hay nada que guardar.
 */
export function updateTracking(record: TrackedAction, change: TrackingChange, author: string, now: string): { record: TrackedAction; changes: string[] } {
  checkDue(change.due);
  const next: TrackedAction = { ...record };
  const changes: string[] = [];
  if (change.status && change.status !== record.status) {
    next.status = change.status;
    changes.push(`estado ${TRACKED_STATUS_LABEL[record.status].toLowerCase()} → ${TRACKED_STATUS_LABEL[change.status].toLowerCase()}`);
    if (isClosedStatus(change.status) && !record.closedAt) next.closedAt = now;
    if (!isClosedStatus(change.status)) next.closedAt = null;
  }
  const owner = clean(change.owner);
  if (owner !== undefined && owner !== record.owner) {
    next.owner = owner;
    changes.push(owner ? `responsable ${record.owner ?? "—"} → ${owner}` : "sin responsable");
  }
  if (change.due !== undefined) {
    const due = change.due === "sla" ? addDays(record.createdAt.slice(0, 10), ACTION_SLA_DAYS[record.priority]) : change.due;
    const dueSource = change.due === "sla" ? "sla" : "equipo";
    if (due !== record.due || dueSource !== record.dueSource) {
      next.due = due;
      next.dueSource = dueSource;
      changes.push(`plazo ${shortDate(record.due)} → ${shortDate(due)}${dueSource === "sla" ? " (SLA)" : ""}`);
    }
  }
  const note = clean(change.note);
  if (note !== undefined && note !== record.note) {
    next.note = note;
    changes.push(note ? "nota actualizada" : "nota retirada");
  }
  const learning = clean(change.learning);
  if (learning !== undefined && learning !== record.learning) {
    next.learning = learning;
    changes.push(learning ? "aprendizaje anotado" : "aprendizaje retirado");
  }
  if (!changes.length) return { record, changes };
  next.updatedAt = now;
  next.updatedBy = author;
  next.history = [...record.history, { at: now, by: author, change: changes.join("; ") }];
  return { record: trackedActionSchema.parse(next), changes };
}

/* ---------------------------------------------------------------------------
 * Medición
 * ------------------------------------------------------------------------- */

export type MeasurementMeta = Omit<ActionMeasurement, "value" | "proposed" | "title" | "why">;

/**
 * Mide una clave con un repaso ya calculado: si la regla la propone, su cifra
 * y su texto; si no, la cifra calculada aparte (`metricFor`).
 */
export function measureKey(key: string, sections: ReviewSection[], metricFor: (key: string) => ActionMetric | null, meta: MeasurementMeta): ActionMeasurement {
  const action = reviewActions(sections).find((item) => item.key === key) ?? null;
  const metric = action ? action.metric : metricFor(key);
  return actionMeasurementSchema.parse({ ...meta, value: metric?.value ?? null, proposed: Boolean(action), title: action?.title ?? null, why: action?.why ?? null });
}

export type ResultVerdict = "cumplido" | "mejora" | "igual" | "empeora" | "sin-dato";

export const VERDICT_LABEL: Record<ResultVerdict, string> = {
  cumplido: "Cumple el criterio",
  mejora: "Mejora",
  igual: "Sin cambios",
  empeora: "Empeora",
  "sin-dato": "Sin dato",
};

/** Desde cuándo cuenta el efecto: el cierre, si se completó; si no, el inicio del seguimiento. */
const effectSince = (record: TrackedAction) => (record.status === "completada" && record.closedAt ? record.closedAt : record.createdAt);

/**
 * Lectura del último resultado frente al punto de partida y al criterio.
 * `provisional` dice por qué aún no es definitivo: la ventana medida incluye
 * días anteriores a la acción o no hay crawl publicado después.
 */
export function resultOf(record: TrackedAction): { verdict: ResultVerdict; provisional: string | null } | null {
  const result = record.result;
  if (!result) return null;
  let verdict: ResultVerdict;
  if (!record.metric) verdict = result.proposed ? "igual" : "cumplido";
  else if (result.value === null || record.baseline.value === null) verdict = "sin-dato";
  else if (record.target && meetsTarget(result.value, record.target)) verdict = "cumplido";
  else {
    const diff = result.value - record.baseline.value;
    const better = record.metric.better === "lower" ? -diff : diff;
    verdict = better > 0 ? "mejora" : better < 0 ? "empeora" : "igual";
  }
  const since = effectSince(record).slice(0, 10);
  let provisional: string | null = null;
  const evidence = record.metric?.evidence ?? "busqueda";
  if (evidence === "crawl") {
    if (!result.crawl || result.crawl.slice(0, 10) <= since) provisional = "Sin crawl publicado después de la acción: la cifra no cambia hasta repetirlo.";
  } else if (evidence === "busqueda") {
    const before = daysFrom(result.window.start, since);
    const after = daysFrom(since, result.window.end);
    if (after < SETTLED_DAYS) provisional = `Solo ${nf(Math.max(after, 0))} días de datos posteriores a la acción (hacen falta ${SETTLED_DAYS}).`;
    else if (before > 0) provisional = `El periodo medido aún incluye ${nf(before)} días anteriores a la acción.`;
  }
  return { verdict, provisional };
}

/* ---------------------------------------------------------------------------
 * Plazos
 * ------------------------------------------------------------------------- */

export type DueState = { state: "cerrada" | "vencida" | "en-plazo"; days: number | null };

/** Plazo frente a un día: días que quedan (o de retraso) y si está vencida. */
export function dueState(record: Pick<TrackedAction, "status" | "due">, today: string): DueState {
  if (isClosedStatus(record.status)) return { state: "cerrada", days: null };
  const days = daysFrom(today, record.due);
  return { state: days < 0 ? "vencida" : "en-plazo", days };
}

export function dueText(record: Pick<TrackedAction, "status" | "due" | "dueSource">, today: string): string {
  const { state, days } = dueState(record, today);
  if (state === "cerrada") return `plazo ${shortDate(record.due)}`;
  const when = days === 0 ? "vence hoy" : state === "vencida" ? `vencida hace ${nf(-days!)} ${days === -1 ? "día" : "días"}` : `quedan ${nf(days!)} ${days === 1 ? "día" : "días"}`;
  return `plazo ${shortDate(record.due)}${record.dueSource === "sla" ? " (SLA)" : ""} · ${when}`;
}

/** Resumen de una bandeja: el estado del trabajo, no una decoración. */
export function trackingSummary(records: TrackedAction[], today: string) {
  const open = records.filter((record) => !isClosedStatus(record.status));
  return {
    total: records.length,
    open: open.length,
    overdue: open.filter((record) => dueState(record, today).state === "vencida").length,
    blocked: open.filter((record) => record.status === "bloqueada").length,
    unassigned: open.filter((record) => !record.owner).length,
    completed: records.filter((record) => record.status === "completada").length,
    met: records.filter((record) => resultOf(record)?.verdict === "cumplido").length,
  };
}

/**
 * Cruza el repaso del periodo con el seguimiento de la marca: cada acción
 * propuesta con su seguimiento (o `null`) y, aparte, las que el equipo sigue
 * y que los datos de este periodo ya no proponen.
 */
export function withTracking(sections: ReviewSection[], records: TrackedAction[]) {
  const byKey = new Map(records.map((record) => [record.key, record]));
  const proposed = new Set(reviewActions(sections).map((action) => action.key));
  return {
    tracked: Object.fromEntries(reviewActions(sections).flatMap((action) => (byKey.has(action.key) ? [[action.key, byKey.get(action.key)!]] : []))) as Record<string, TrackedAction>,
    elsewhere: records.filter((record) => !proposed.has(record.key)),
  };
}
