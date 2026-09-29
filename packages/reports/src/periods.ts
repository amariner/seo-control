/**
 * Periodos de los informes (D-076). Un informe se identifica por marca y
 * periodo cerrado: un trimestre (`2026-Q2`) o un mes (`2026-08`). El mismo
 * identificador sirve para la versión congelada (snapshot) y para las
 * puntualizaciones del equipo, así que tiene que poder deducirse de las
 * fechas de una ventana del informe.
 */

export type ReportPeriodKind = "quarter" | "month";
export type ReportPeriod = {
  id: string;
  kind: ReportPeriodKind;
  start: string;
  end: string;
  label: string;
};

const QUARTER = /^(\d{4})-Q([1-4])$/;
const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

const iso = (time: number) => new Date(time).toISOString().slice(0, 10);
const MONTH_NAMES = new Intl.DateTimeFormat("es-ES", { month: "long", timeZone: "UTC" });

export function parsePeriod(id: string): ReportPeriod | null {
  const quarter = QUARTER.exec(id);
  if (quarter) {
    const year = Number(quarter[1]);
    const q = Number(quarter[2]);
    return {
      id,
      kind: "quarter",
      start: iso(Date.UTC(year, (q - 1) * 3, 1)),
      end: iso(Date.UTC(year, q * 3, 0)),
      label: `${q}.º trimestre ${year}`,
    };
  }
  const month = MONTH.exec(id);
  if (month) {
    const year = Number(month[1]);
    const m = Number(month[2]);
    const name = MONTH_NAMES.format(new Date(Date.UTC(year, m - 1, 1)));
    return {
      id,
      kind: "month",
      start: iso(Date.UTC(year, m - 1, 1)),
      end: iso(Date.UTC(year, m, 0)),
      label: `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`,
    };
  }
  return null;
}

/** Identificador del periodo si la ventana coincide exactamente con un trimestre o un mes. */
export function periodIdOf(start: string, end: string): string | null {
  const [year, month] = start.split("-");
  if (!year || !month || !start.endsWith("-01")) return null;
  const monthId = `${year}-${month}`;
  if (parsePeriod(monthId)?.end === end) return monthId;
  const q = Math.floor((Number(month) - 1) / 3) + 1;
  const quarter = parsePeriod(`${year}-Q${q}`);
  return quarter && quarter.start === start && quarter.end === end ? quarter.id : null;
}

/**
 * Últimos `count` trimestres cerrados respecto a `today`, del más reciente al
 * más antiguo. Un trimestre está cerrado cuando su último día ya ha pasado.
 */
export function closedQuarters(today: string, count = 4): ReportPeriod[] {
  const [y, m] = today.split("-").map(Number) as [number, number];
  let year = y;
  let q = Math.floor((m - 1) / 3); // trimestre en curso, base 0 → el anterior en base 1
  const out: ReportPeriod[] = [];
  while (out.length < count) {
    if (q === 0) {
      year -= 1;
      q = 4;
    }
    out.push(parsePeriod(`${year}-Q${q}`)!);
    q -= 1;
  }
  return out;
}

/** Mes cerrado anterior a `today`. */
export function lastClosedMonth(today: string): ReportPeriod {
  const [y, m] = today.split("-").map(Number) as [number, number];
  const year = m === 1 ? y - 1 : y;
  const month = m === 1 ? 12 : m - 1;
  return parsePeriod(`${year}-${String(month).padStart(2, "0")}`)!;
}

/** Parámetros de la ficha y del informe del visor para abrir este periodo. */
export function periodSearch(period: ReportPeriod): Record<string, string> {
  return { range: "custom", from: period.start, to: period.end, periodo: period.id };
}
