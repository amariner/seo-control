import {
  EDITORIAL_BRANDS,
  EDITORIAL_SCHEMA_VERSION,
  MONTH_NAMES_ES,
  editorialDatasetSchema,
  type EditorialBrandRef,
  type EditorialBrandSlug,
  type EditorialCalendarEvent,
  type EditorialDataset,
  type EditorialImportReport,
  type EditorialPiece,
  type EditorialPieceType,
  type EditorialSlot,
  type EditorialSourceArchive,
  type EditorialSourceKey,
  type EditorialStatus,
  type EditorialThemeBlock,
} from "@seo/contracts";

/**
 * Normalización pura de los cuatro snapshots editoriales V1 (D-006).
 *
 * No toca el sistema de ficheros: recibe los textos crudos y una función de
 * hash, y devuelve el dataset validado más un informe de importación. Así la
 * misma lógica puede ejecutarse en Node (importador) y en pruebas sin efectos.
 */

export type Sha256 = (input: string) => string;

export type RawSource = {
  key: EditorialSourceKey;
  fileName: string;
  text: string;
};

export type NormalizeOptions = {
  sha256: Sha256;
  importedAt: string;
  /** Recuentos de control de D-006. Un desajuste no aborta, pero se marca en el informe. */
  expectedCounts?: Partial<Record<EditorialSourceKey, number>>;
};

export const V1_EXPECTED_COUNTS: Record<EditorialSourceKey, number> = {
  "calendario-2026": 39,
  "conjunto-backlog": 115,
  conjunto: 146,
  "conjunto-propuestas": 34,
};

export const V1_EXPECTED_PROPOSALS = 68;

type V1Row = {
  estado?: unknown;
  fechaRedaccion?: unknown;
  fechaPublicacion?: unknown;
  tipo?: unknown;
  marca?: unknown;
  pais?: unknown;
  mesEstimado?: unknown;
  tematica?: unknown;
  subtematica?: unknown;
  keywordPrincipal?: unknown;
  titulo?: unknown;
  url?: unknown;
  notas?: unknown;
};

type V1Proposal = {
  subtema?: unknown;
  keywordPrincipal?: unknown;
  searchVolume?: unknown;
  titulos?: unknown;
  angulo?: unknown;
  formato?: unknown;
  tipo?: unknown;
  url?: unknown;
};

type V1Slot = V1Row & { slot?: unknown; propuestas?: unknown };

type V1Calendar = {
  months?: Array<{ year?: unknown; month?: unknown; events?: Array<{ type?: unknown; brand?: unknown; num?: unknown; label?: unknown; day?: unknown }> }>;
  themes?: Array<{ month?: unknown; mesNombre?: unknown; tematica?: unknown; subtemas?: unknown }>;
};

const str = (value: unknown) => (typeof value === "string" ? value : value === null || value === undefined ? "" : String(value));
const clean = (value: unknown) => str(value).replace(/\s+/g, " ").trim();
const orNull = (value: string) => (value.length ? value : null);

/** Normaliza saltos de línea y forma Unicode sin alterar el contenido del brief. */
export function normalizeBriefText(text: string) {
  return text.replace(/\r\n?/g, "\n").normalize("NFC").replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n").trim();
}

const BRAND_ALIASES: Array<{ match: RegExp; slug: EditorialBrandSlug }> = [
  { match: /^porcelanosa\b/i, slug: "porcelanosa" },
  { match: /^porce\b/i, slug: "porcelanosa" },
  { match: /^noken\b/i, slug: "noken" },
  { match: /^e-?comm?erce\b/i, slug: "ecommerce" },
  { match: /^(store|tienda)\b/i, slug: "ecommerce" },
  { match: /^butech\b/i, slug: "butech" },
  { match: /^(l\W)?antic\s*colonial\b/i, slug: "antic-colonial" },
  { match: /^krion\b/i, slug: "krion" },
  { match: /^x-?tone\b/i, slug: "xtone" },
  { match: /^gamadecor\b/i, slug: "gamadecor" },
  { match: /^gd$/i, slug: "gamadecor" },
];

/** Separadores admitidos entre marca y línea: guion, guion largo, punto medio, barra vertical o barra. */
const BRAND_LINE_SEPARATOR = /\s+[-–—·|/]\s+/;

export function normalizeBrand(literalInput: unknown): EditorialBrandRef {
  const literal = clean(literalInput);
  if (!literal) return { slug: null, line: null, literal };
  const [head, ...rest] = literal.split(BRAND_LINE_SEPARATOR);
  const alias = BRAND_ALIASES.find((entry) => entry.match.test(head ?? literal));
  const line = rest.length ? clean(rest.join(" / ")) : null;
  return { slug: alias?.slug ?? null, line: line && line.length ? line : null, literal };
}

export function normalizeStatus(literalInput: unknown): EditorialStatus {
  const literal = clean(literalInput).toLocaleLowerCase("es");
  if (!literal) return "desconocido";
  if (literal.startsWith("backlog")) return "backlog";
  if (literal.startsWith("acept")) return "aceptado";
  if (literal.startsWith("redact")) return "redactando";
  if (literal.startsWith("revis")) return "revision";
  if (literal.startsWith("program")) return "programado";
  if (literal.startsWith("public")) return "publicado";
  if (literal.startsWith("descart")) return "descartado";
  return "desconocido";
}

export function normalizePieceType(literalInput: unknown): EditorialPieceType {
  const literal = clean(literalInput).toLocaleLowerCase("es");
  if (!literal) return "sin_tipo";
  if (literal.startsWith("migrar y")) return "migrar_y_reeditar";
  if (literal.startsWith("migrar")) return "migrar";
  if (literal.startsWith("nuevo")) return "nuevo";
  if (literal.startsWith("reedic")) return "reedicion";
  if (literal.startsWith("importar de trendbook") || literal.startsWith("importar trendbook")) return "importar_trendbook";
  if (literal.startsWith("refrescar")) return "refrescar_store";
  if (literal.startsWith("auto")) return "auto_gsc";
  return "otro";
}

const MARKETS = ["ES", "UK", "US", "FR", "DE"] as const;
type Market = (typeof MARKETS)[number];

export function normalizeMarket(literalInput: unknown): Market | null {
  const literal = clean(literalInput).toUpperCase();
  if ((MARKETS as ReadonlyArray<string>).includes(literal)) return literal as Market;
  if (literal === "GB" || literal === "EN" || literal === "EN_GB") return "UK";
  if (literal === "ESP" || literal === "SPAIN") return "ES";
  return null;
}

export function languageForMarket(market: Market | null): "es" | "en" | "fr" | "de" | null {
  if (market === "ES") return "es";
  if (market === "UK" || market === "US") return "en";
  if (market === "FR") return "fr";
  if (market === "DE") return "de";
  return null;
}

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * Convierte fechas V1 a ISO. Acepta `dd/mm/yyyy` (formato dominante), `yyyy-mm-dd`
 * y `m/d/yyyy` (formato de hoja de cálculo detectado en el plan histórico). Esta
 * última regla es explícita: el plan contiene `6/12/2026` y `6/18/2026`, donde el
 * segundo valor solo puede ser día, por lo que un separador `/` con año al final
 * y primer valor <= 12 y segundo > 12 se interpreta como mes/día.
 */
export function normalizeDate(literalInput: unknown, warnings: string[], field: string): string | null {
  const literal = clean(literalInput);
  if (!literal) return null;
  let match = literal.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const [, y, m, d] = match;
    return validDate(Number(y), Number(m), Number(d), literal, warnings, field);
  }
  match = literal.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, a, b, y] = match;
    const first = Number(a);
    const second = Number(b);
    if (first <= 12 && second > 12) {
      warnings.push(`${field}: "${literal}" interpretado como m/d/aaaa (formato de hoja de cálculo).`);
      return validDate(Number(y), first, second, literal, warnings, field);
    }
    if (a && a.length === 1) warnings.push(`${field}: "${literal}" sin ceros a la izquierda; interpretado como d/m/aaaa.`);
    return validDate(Number(y), second, first, literal, warnings, field);
  }
  warnings.push(`${field}: formato de fecha no reconocido "${literal}".`);
  return null;
}

function validDate(year: number, month: number, day: number, literal: string, warnings: string[], field: string) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    warnings.push(`${field}: fecha imposible "${literal}".`);
    return null;
  }
  return `${year}-${pad(month)}-${pad(day)}`;
}

const MONTH_LOOKUP = new Map(MONTH_NAMES_ES.map((name, index) => [name.toLocaleLowerCase("es"), index] as const).filter(([, index]) => index > 0));

export function normalizeMonth(literalInput: unknown, fallbackDates: Array<string | null>, planningYear: number) {
  const literal = clean(literalInput);
  const isoDate = fallbackDates.find((value) => value);
  if (isoDate) {
    const [y, m] = isoDate.split("-").map(Number);
    return { year: y ?? null, month: m ?? null, yearSource: "date" as const, literal };
  }
  if (!literal) return { year: null, month: null, yearSource: "none" as const, literal };
  const numeric = literal.match(/^(\d{1,2})\b/);
  const named = literal.match(/([a-záéíóúñ]+)\s*(\d{4})?$/i);
  let month: number | null = numeric ? Number(numeric[1]) : null;
  if (!month && named?.[1]) month = MONTH_LOOKUP.get(named[1].toLocaleLowerCase("es")) ?? null;
  if (month && (month < 1 || month > 12)) month = null;
  const explicitYear = named?.[2] ? Number(named[2]) : null;
  if (!month) return { year: null, month: null, yearSource: "none" as const, literal };
  return explicitYear
    ? { year: explicitYear, month, yearSource: "estimate" as const, literal }
    : { year: planningYear, month, yearSource: "calendar" as const, literal };
}

function normalizeUrl(literalInput: unknown, warnings: string[]) {
  const literal = clean(literalInput);
  if (!literal) return null;
  try {
    const url = new URL(literal);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("protocolo");
    return literal;
  } catch {
    warnings.push(`url: valor no reconocido como URL absoluta "${literal.slice(0, 80)}".`);
    return literal;
  }
}

function parseJson(source: RawSource, rejections: EditorialImportReport["rejections"]) {
  try {
    return JSON.parse(source.text) as unknown;
  } catch (error) {
    rejections.push({ source: source.key, sourceIndex: 0, reason: `JSON inválido: ${(error as Error).message}`, excerpt: source.text.slice(0, 80) });
    return null;
  }
}

class IdentityRegistry {
  private readonly seen = new Map<string, number>();
  collisions = 0;
  constructor(private readonly sha256: Sha256) {}
  next(prefix: string, parts: unknown[]) {
    const key = parts.map((part) => clean(part).toLocaleLowerCase("es")).join("");
    const base = `${prefix}-${this.sha256(`${prefix}|${key}`).slice(0, 16)}`;
    const ordinal = (this.seen.get(base) ?? 0) + 1;
    this.seen.set(base, ordinal);
    if (ordinal > 1) this.collisions += 1;
    return { id: ordinal === 1 ? base : `${base}-${ordinal}`, ordinal };
  }
}

const ROW_FIELDS = ["estado", "fechaRedaccion", "fechaPublicacion", "tipo", "marca", "pais", "mesEstimado", "tematica", "subtematica", "keywordPrincipal", "titulo", "url", "notas"] as const;

function emptyFieldStats(rows: V1Row[]) {
  const stats: Record<string, number> = {};
  for (const field of ROW_FIELDS) stats[field] = rows.filter((row) => !clean(row[field])).length;
  return stats;
}

function duplicateStats(rows: V1Row[]) {
  const count = (field: keyof V1Row) => {
    const seen = new Map<string, number>();
    for (const row of rows) {
      const value = clean(row[field]).toLocaleLowerCase("es");
      if (!value) continue;
      seen.set(value, (seen.get(value) ?? 0) + 1);
    }
    return [...seen.values()].filter((value) => value > 1).reduce((total, value) => total + value - 1, 0);
  };
  return { keywords: count("keywordPrincipal"), titles: count("titulo"), urls: count("url") };
}

export function normalizeEditorialSources(sources: RawSource[], options: NormalizeOptions): EditorialDataset {
  const { sha256, importedAt } = options;
  const expected = { ...V1_EXPECTED_COUNTS, ...options.expectedCounts };
  const rejections: EditorialImportReport["rejections"] = [];
  const warnings: string[] = [];
  const archives: EditorialSourceArchive[] = [];
  const identity = new IdentityRegistry(sha256);
  const aliasCounter = new Map<string, { literal: string; slug: EditorialBrandSlug | null; line: string | null; occurrences: number }>();
  const emptyFields: EditorialImportReport["emptyFields"] = {};
  const duplicates: EditorialImportReport["duplicates"] = {};
  const briefs: EditorialImportReport["briefs"] = {};

  const bySource = new Map(sources.map((source) => [source.key, source]));
  const hashes = new Map(sources.map((source) => [source.key, sha256(source.text)]));
  for (const key of Object.keys(V1_EXPECTED_COUNTS) as EditorialSourceKey[]) {
    if (!bySource.has(key)) warnings.push(`Falta la fuente ${key}; el dataset se genera sin ella.`);
  }

  const registerBrand = (ref: EditorialBrandRef) => {
    if (!ref.literal) return;
    const entry = aliasCounter.get(ref.literal) ?? { literal: ref.literal, slug: ref.slug, line: ref.line, occurrences: 0 };
    entry.occurrences += 1;
    aliasCounter.set(ref.literal, entry);
  };

  const finishArchive = (source: RawSource, schema: string, importedCount: number, rejectedCount: number, expectedCount: number) => {
    archives.push({
      key: source.key,
      fileName: source.fileName,
      sha256: hashes.get(source.key)!,
      byteLength: new TextEncoder().encode(source.text).byteLength,
      schema,
      importedAt,
      expectedCount,
      importedCount,
      rejectedCount,
      status: rejectedCount > 0 ? "rejections" : importedCount === expectedCount ? "ok" : "count-mismatch",
    });
  };

  // 1. Calendario: eventos y bloques temáticos.
  const events: EditorialCalendarEvent[] = [];
  const themes: EditorialThemeBlock[] = [];
  let planningYear = new Date(importedAt).getUTCFullYear();
  const calendarSource = bySource.get("calendario-2026");
  if (calendarSource) {
    const parsed = parseJson(calendarSource, rejections) as V1Calendar | null;
    const months = Array.isArray(parsed?.months) ? parsed.months : [];
    const years = months.map((month) => Number(month.year)).filter((year) => Number.isInteger(year));
    if (years.length) planningYear = Math.min(...years);
    let index = 0;
    let rejected = 0;
    for (const month of months) {
      const year = Number(month.year);
      const monthNumber = Number(month.month);
      for (const event of Array.isArray(month.events) ? month.events : []) {
        const sourceIndex = index++;
        const day = Number(event.day);
        const eventWarnings: string[] = [];
        const date = Number.isInteger(day) ? validDate(year, monthNumber, day, `${year}-${monthNumber}-${day}`, eventWarnings, "day") : null;
        if (!date) {
          rejected += 1;
          rejections.push({ source: "calendario-2026", sourceIndex, reason: eventWarnings[0] ?? "Evento sin día válido", excerpt: JSON.stringify(event).slice(0, 80) });
          continue;
        }
        const brand = normalizeBrand(event.brand);
        registerBrand(brand);
        const sequence = orNull(clean(event.num));
        const { id, ordinal } = identity.next("ed-ev", [year, monthNumber, day, brand.literal, sequence, clean(event.type)]);
        events.push({
          id,
          provenance: { source: "calendario-2026", sourceIndex, sourceSha256: hashes.get("calendario-2026")!, importedAt, identityOrdinal: ordinal },
          date,
          year,
          month: monthNumber,
          day,
          typeLiteral: clean(event.type) || "POST",
          brand,
          sequence,
          label: clean(event.label),
          pieceId: null,
        });
      }
    }
    for (const theme of Array.isArray(parsed?.themes) ? parsed.themes : []) {
      const monthNumber = Number(theme.month);
      if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) {
        warnings.push(`Bloque temático con mes inválido: ${JSON.stringify(theme).slice(0, 60)}`);
        continue;
      }
      const monthYear = months.find((month) => Number(month.month) === monthNumber);
      const year = monthYear ? Number(monthYear.year) : planningYear;
      themes.push({
        id: `ed-th-${sha256(`ed-th|${year}|${monthNumber}|${clean(theme.tematica)}`).slice(0, 16)}`,
        year,
        month: monthNumber,
        monthName: clean(theme.mesNombre) || MONTH_NAMES_ES[monthNumber] || "",
        theme: clean(theme.tematica),
        subthemes: Array.isArray(theme.subtemas) ? theme.subtemas.map(clean).filter(Boolean) : [],
      });
    }
    finishArchive(calendarSource, "v1.calendario{months[].events[],themes[]}", events.length, rejected, expected["calendario-2026"]);
  }

  // 2. Backlog y plan histórico: mismas columnas, fuentes distintas (D-006).
  const normalizeRows = (source: RawSource, kind: "backlog" | "plan", prefix: "ed-bk" | "ed-pl") => {
    const parsed = parseJson(source, rejections);
    const rows = Array.isArray(parsed) ? (parsed as V1Row[]) : [];
    if (parsed !== null && !Array.isArray(parsed)) rejections.push({ source: source.key, sourceIndex: 0, reason: "La raíz no es un array", excerpt: source.text.slice(0, 40) });
    const pieces: EditorialPiece[] = [];
    let rejected = 0;
    let totalChars = 0;
    let totalNormalized = 0;
    let briefCount = 0;
    rows.forEach((row, sourceIndex) => {
      if (!row || typeof row !== "object") {
        rejected += 1;
        rejections.push({ source: source.key, sourceIndex, reason: "Fila no es un objeto", excerpt: String(row).slice(0, 40) });
        return;
      }
      const hasContent = ["titulo", "keywordPrincipal", "url", "notas", "marca"].some((field) => clean(row[field as keyof V1Row]));
      if (!hasContent) {
        rejected += 1;
        rejections.push({ source: source.key, sourceIndex, reason: "Fila sin título, keyword, URL, brief ni marca", excerpt: JSON.stringify(row).slice(0, 80) });
        return;
      }
      const rowWarnings: string[] = [];
      const writingDate = normalizeDate(row.fechaRedaccion, rowWarnings, "fechaRedaccion");
      const publicationDate = normalizeDate(row.fechaPublicacion, rowWarnings, "fechaPublicacion");
      const brand = normalizeBrand(row.marca);
      registerBrand(brand);
      const market = normalizeMarket(row.pais);
      if (clean(row.pais) && !market) rowWarnings.push(`pais: mercado no reconocido "${clean(row.pais)}".`);
      const url = normalizeUrl(row.url, rowWarnings);
      const briefText = str(row.notas);
      const normalizedBrief = normalizeBriefText(briefText);
      const brief = briefText.trim().length ? { text: briefText, normalizedLength: normalizedBrief.length, sha256: sha256(normalizedBrief) } : null;
      if (brief) {
        briefCount += 1;
        totalChars += briefText.length;
        totalNormalized += normalizedBrief.length;
      }
      const { id, ordinal } = identity.next(prefix, [brand.literal, row.pais, row.mesEstimado, row.tipo, row.keywordPrincipal, row.titulo, row.url]);
      if (ordinal > 1) rowWarnings.push(`Identidad compartida con otra fila de la misma fuente (ordinal ${ordinal}).`);
      pieces.push({
        id,
        kind,
        provenance: { source: source.key, sourceIndex, sourceSha256: hashes.get(source.key)!, importedAt, identityOrdinal: ordinal },
        status: normalizeStatus(row.estado),
        statusLiteral: clean(row.estado),
        type: normalizePieceType(row.tipo),
        typeLiteral: clean(row.tipo),
        brand,
        market,
        marketLiteral: clean(row.pais),
        language: languageForMarket(market),
        month: normalizeMonth(row.mesEstimado, [publicationDate, writingDate], planningYear),
        writingDate,
        publicationDate,
        warnings: rowWarnings,
        theme: orNull(clean(row.tematica)),
        subtheme: orNull(clean(row.subtematica)),
        keyword: orNull(clean(row.keywordPrincipal)),
        title: orNull(clean(row.titulo)),
        url,
        brief,
        intent: null,
        cluster: null,
        objective: null,
        hypothesis: null,
        impact: null,
        effort: null,
        owner: null,
        author: null,
        reviewer: null,
        dependencies: [],
        successKpi: null,
        measurements: [],
        links: [],
      });
    });
    const objectRows = rows.filter((row) => row && typeof row === "object");
    emptyFields[source.key] = emptyFieldStats(objectRows);
    duplicates[source.key] = duplicateStats(objectRows);
    briefs[source.key] = { count: briefCount, totalChars, totalNormalizedChars: totalNormalized };
    finishArchive(source, "v1.planEditorialRow[13]", pieces.length, rejected, expected[source.key]);
    return pieces;
  };

  const backlogSource = bySource.get("conjunto-backlog");
  const planSource = bySource.get("conjunto");
  const backlog = backlogSource ? normalizeRows(backlogSource, "backlog", "ed-bk") : [];
  const plan = planSource ? normalizeRows(planSource, "plan", "ed-pl") : [];

  // 3. Huecos y propuestas: relación hueco -> propuestas -> selección.
  const slots: EditorialSlot[] = [];
  const proposalsSource = bySource.get("conjunto-propuestas");
  if (proposalsSource) {
    const parsed = parseJson(proposalsSource, rejections);
    const rows = Array.isArray(parsed) ? (parsed as V1Slot[]) : [];
    let rejected = 0;
    let proposalTotal = 0;
    rows.forEach((row, sourceIndex) => {
      if (!row || typeof row !== "object" || !Array.isArray(row.propuestas)) {
        rejected += 1;
        rejections.push({ source: "conjunto-propuestas", sourceIndex, reason: "Hueco sin array de propuestas", excerpt: JSON.stringify(row).slice(0, 80) });
        return;
      }
      const slotWarnings: string[] = [];
      const brand = normalizeBrand(row.marca);
      registerBrand(brand);
      const market = normalizeMarket(row.pais);
      const publicationDate = normalizeDate(row.fechaPublicacion, slotWarnings, "fechaPublicacion");
      const { id, ordinal } = identity.next("ed-sl", [brand.literal, row.pais, row.mesEstimado, row.tematica, row.slot]);
      if (ordinal > 1) slotWarnings.push(`Hueco con la misma marca, mes, temática y literal que otro (ordinal ${ordinal}).`);
      const proposals = (row.propuestas as V1Proposal[]).map((proposal, proposalIndex) => {
        const proposalWarnings: string[] = [];
        const formatLiteral = clean(proposal.formato);
        const format: "rework" | "nuevo" | "otro" = formatLiteral === "rework" ? "rework" : formatLiteral === "nuevo" ? "nuevo" : "otro";
        if (format === "otro" && formatLiteral) slotWarnings.push(`Propuesta ${proposalIndex + 1}: formato desconocido "${formatLiteral}".`);
        const titles = Array.isArray(proposal.titulos) ? proposal.titulos.map(clean).filter(Boolean) : [];
        const volume = typeof proposal.searchVolume === "number" && Number.isFinite(proposal.searchVolume) ? proposal.searchVolume : null;
        const proposalId = identity.next("ed-pr", [id, proposalIndex + 1, proposal.keywordPrincipal, titles[0] ?? ""]);
        proposalTotal += 1;
        const url = normalizeUrl(proposal.url, proposalWarnings);
        slotWarnings.push(...proposalWarnings.map((warning) => `Propuesta ${proposalIndex + 1}: ${warning}`));
        return {
          id: proposalId.id,
          slotId: id,
          ordinal: proposalIndex + 1,
          subtheme: orNull(clean(proposal.subtema)),
          keyword: orNull(clean(proposal.keywordPrincipal)),
          searchVolume: volume,
          titles,
          angle: orNull(clean(proposal.angulo)),
          format,
          formatLiteral,
          type: normalizePieceType(proposal.tipo),
          typeLiteral: clean(proposal.tipo),
          url,
          selected: null,
        };
      });
      slots.push({
        id,
        provenance: { source: "conjunto-propuestas", sourceIndex, sourceSha256: hashes.get("conjunto-propuestas")!, importedAt, identityOrdinal: ordinal },
        status: normalizeStatus(row.estado),
        statusLiteral: clean(row.estado),
        brand,
        market,
        marketLiteral: clean(row.pais),
        month: normalizeMonth(row.mesEstimado, [publicationDate], planningYear),
        publicationDate,
        theme: orNull(clean(row.tematica)),
        slotLiteral: clean(row.slot),
        typeLiteral: clean(row.tipo),
        proposals,
        selectedProposalId: null,
        warnings: slotWarnings,
      });
    });
    if (proposalTotal !== V1_EXPECTED_PROPOSALS) warnings.push(`Propuestas importadas: ${proposalTotal}; se esperaban ${V1_EXPECTED_PROPOSALS}.`);
    const uniqueSlotLiterals = new Set(slots.map((slot) => slot.slotLiteral)).size;
    if (uniqueSlotLiterals !== slots.length) warnings.push(`El literal "slot" no es único: ${uniqueSlotLiterals} valores para ${slots.length} huecos. Se usan IDs derivados, nunca el literal.`);
    finishArchive(proposalsSource, "v1.planEditorialSlot{propuestas[]}", slots.length, rejected, expected["conjunto-propuestas"]);
  }

  // 4. Resumen por marca: las ocho aparecen aunque no tengan eventos.
  const brands = EDITORIAL_BRANDS.map((brand) => ({
    slug: brand.slug,
    name: brand.name,
    code: brand.code,
    pilot: brand.pilot,
    calendarEvents: events.filter((event) => event.brand.slug === brand.slug).length,
    backlogPieces: backlog.filter((piece) => piece.brand.slug === brand.slug).length,
    planPieces: plan.filter((piece) => piece.brand.slug === brand.slug).length,
    slots: slots.filter((slot) => slot.brand.slug === brand.slug).length,
  }));
  const brandsWithoutEvents = brands.filter((brand) => brand.calendarEvents === 0).map((brand) => brand.slug);
  if (brandsWithoutEvents.length) warnings.push(`Marcas sin evento en el calendario: ${brandsWithoutEvents.join(", ")}.`);
  const unresolvedAliases = [...aliasCounter.values()].filter((alias) => !alias.slug);
  if (unresolvedAliases.length) warnings.push(`Alias de marca sin resolver: ${unresolvedAliases.map((alias) => alias.literal).join(", ")}.`);
  for (const archive of archives) {
    if (archive.status !== "ok") warnings.push(`${archive.key}: ${archive.importedCount} importados, ${archive.expectedCount} esperados, ${archive.rejectedCount} rechazados.`);
  }

  const fingerprint = sha256([...hashes.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, hash]) => `${key}:${hash}`).join("\n"));

  const dataset: EditorialDataset = {
    schemaVersion: EDITORIAL_SCHEMA_VERSION,
    generatedAt: importedAt,
    mode: "v1-import",
    planningYear,
    brands,
    calendar: { events, themes },
    backlog,
    plan,
    slots,
    report: {
      schemaVersion: EDITORIAL_SCHEMA_VERSION,
      importedAt,
      inputFingerprint: fingerprint,
      archives,
      rejections,
      warnings,
      brandAliases: [...aliasCounter.values()].sort((a, b) => a.literal.localeCompare(b.literal, "es")),
      brandsWithoutEvents,
      emptyFields,
      duplicates,
      briefs,
      identityCollisions: identity.collisions,
    },
  };
  return editorialDatasetSchema.parse(dataset);
}
