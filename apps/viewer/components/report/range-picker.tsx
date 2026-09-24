"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  CalendarRange,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
} from "lucide-react";
import {
  REPORT_MIN_DATE,
  REPORT_PRESETS,
  presetRange,
  reportWindowParams,
  resolveReportWindow,
  type ReportPreset,
  type ReportWindow,
} from "@seo/contracts";
import { useReportNavigation } from "./report-navigation";

/**
 * Selector de periodo del informe (D-037, D-038).
 *
 * Tres decisiones en un solo panel, como en Analytics:
 * 1. **El periodo**: un atajo (ventanas móviles o de calendario) o un rango
 *    libre elegido en el calendario de dos meses o escribiendo las fechas.
 * 2. **La comparación**: el periodo anterior de igual duración o uno elegido a
 *    mano —por ejemplo, las semanas antes de una migración—. Siempre con la
 *    misma duración: el inicio se elige y el fin se deduce.
 * 3. **El año pasado**: misma fecha o mismo día de la semana (52 semanas antes),
 *    para no comparar un lunes con un sábado.
 *
 * La vista previa del resumen usa `resolveReportWindow`, la misma función que
 * el servidor: lo que el panel promete es exactamente lo que se va a calcular.
 * Todo acaba en la URL, así que el enlace compartido abre la misma vista.
 */

type Draft = {
  preset: ReportPreset;
  start: string;
  end: string;
  compare: "anterior" | "custom";
  cfrom: string;
  yoy: "fecha" | "semana";
};

const DAY = 86_400_000;
const parse = (date: string) => Date.parse(`${date}T00:00:00Z`);
const iso = (time: number) => new Date(time).toISOString().slice(0, 10);
const addDays = (date: string, days: number) => iso(parse(date) + days * DAY);
const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];
const fmt = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
const fmtRange = (start: string, end: string) => `${fmt(start)} – ${fmt(end)}`;
const monthKey = (date: string) => date.slice(0, 7);
const shiftMonth = (month: string, delta: number) => {
  const [y, m] = month.split("-").map(Number) as [number, number];
  return iso(Date.UTC(y, m - 1 + delta, 1)).slice(0, 7);
};

function draftOf(range: ReportWindow): Draft {
  return {
    preset: range.preset,
    start: range.start,
    end: range.end,
    compare: range.compare,
    cfrom: range.previousStart,
    yoy: range.yearAlign,
  };
}

function preview(draft: Draft, cutoff: string) {
  return resolveReportWindow(
    {
      range: draft.preset,
      from: draft.start,
      to: draft.end,
      cmp: draft.compare,
      cfrom: draft.cfrom,
      yoy: draft.yoy,
    },
    cutoff,
  );
}

export function RangePicker({
  applied,
  cutoff,
  gscFloor,
  marketSlot,
  compact = false,
}: {
  applied: ReportWindow;
  cutoff: string;
  gscFloor: string;
  marketSlot?: ReactNode;
  compact?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const navigation = useReportNavigation();
  const displayed = navigation?.target?.period ?? applied;
  const busy = Boolean(
    navigation?.pending && navigation.target?.changes.period,
  );
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => draftOf(applied));
  const [target, setTarget] = useState<"periodo" | "comparacion">("periodo");
  const [phase, setPhase] = useState<"start" | "end">("start");
  const [hover, setHover] = useState<string | null>(null);
  const [singleMonth, setSingleMonth] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 720px)");
    const update = () => setSingleMonth(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const [month, setMonth] = useState(() =>
    shiftMonth(monthKey(applied.end), singleMonth ? 0 : -1),
  );
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const previousSingleMonth = useRef(singleMonth);

  // Cambiar de ancho conserva el borrador y el último mes que estaba visible.
  useEffect(() => {
    if (previousSingleMonth.current === singleMonth) return;
    previousSingleMonth.current = singleMonth;
    setMonth((current) => shiftMonth(current, singleMonth ? 1 : -1));
  }, [singleMonth]);

  function toggleCalendar() {
    if (open) {
      setOpen(false);
      return;
    }
    // Solo al abrir: una respuesta pendiente nunca pisa una edición en curso.
    setDraft(draftOf(displayed));
    setTarget("periodo");
    setPhase("start");
    setHover(null);
    setMonth(shiftMonth(monthKey(displayed.end), singleMonth ? 0 : -1));
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    const onClick = (event: MouseEvent) => {
      if (
        panel.current &&
        !panel.current.contains(event.target as Node) &&
        !trigger.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const resolved = useMemo(() => preview(draft, cutoff), [draft, cutoff]);

  function go(changes: Record<string, string | null>) {
    if (navigation) {
      navigation.navigate({ params: changes, period: resolved });
      return;
    }
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  }

  function apply() {
    go(reportWindowParams(resolved));
    setOpen(false);
    trigger.current?.focus();
  }

  function choosePreset(key: ReportPreset) {
    const range = presetRange(key, cutoff);
    if (!range) {
      setDraft((current) => ({ ...current, preset: "custom" }));
      setTarget("periodo");
      setPhase("start");
      return;
    }
    setDraft((current) => ({
      ...current,
      preset: key,
      start: range.start,
      end: range.end,
    }));
    setMonth(shiftMonth(monthKey(range.end), singleMonth ? 0 : -1));
    setPhase("start");
  }

  function pickDay(day: string) {
    if (target === "comparacion") {
      setDraft((current) => ({ ...current, compare: "custom", cfrom: day }));
      return;
    }
    if (phase === "start") {
      setDraft((current) => ({
        ...current,
        preset: "custom",
        start: day,
        end: day,
      }));
      setPhase("end");
    } else {
      setDraft((current) =>
        day < current.start
          ? { ...current, preset: "custom", start: day }
          : { ...current, preset: "custom", end: day },
      );
      if (day >= draft.start) setPhase("start");
    }
  }

  function typeDate(field: "start" | "end" | "cfrom", value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    if (field === "cfrom") {
      setDraft((current) => ({ ...current, compare: "custom", cfrom: value }));
      return;
    }
    setDraft((current) => ({ ...current, preset: "custom", [field]: value }));
    setMonth(
      shiftMonth(monthKey(value), field === "end" && !singleMonth ? -1 : 0),
    );
  }

  // Rango que se pinta mientras se elige el fin: del inicio al día bajo el cursor.
  const liveEnd =
    target === "periodo" && phase === "end" && hover && hover >= draft.start
      ? hover
      : resolved.end;
  const liveStart =
    target === "periodo" && phase === "end" ? draft.start : resolved.start;
  const compareStart =
    target === "comparacion" && hover ? hover : resolved.previousStart;
  const compareEnd = addDays(compareStart, resolved.days - 1);

  return (
    <div className="range-bar no-print">
      <div className="range-anchor">
        <span className="range-label">Periodo</span>
        <button
          ref={trigger}
          type="button"
          className="range-trigger"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-busy={busy || undefined}
          onClick={toggleCalendar}
        >
          <CalendarRange size={16} aria-hidden />
          <span className="range-trigger-main">
            <strong>{displayed.label}</strong>
            {compact ? null : ` · ${fmtRange(displayed.start, displayed.end)}`}
          </span>
          <span className="range-trigger-sub">
            {compact ? (
              fmtRange(displayed.start, displayed.end)
            ) : (
              <>
                vs. {fmtRange(displayed.previousStart, displayed.previousEnd)} ·{" "}
                {displayed.previousYearLabel}{" "}
                {fmtRange(
                  displayed.previousYearStart,
                  displayed.previousYearEnd,
                )}
              </>
            )}
          </span>
          {busy ? (
            <LoaderCircle
              size={16}
              className="report-update-icon"
              aria-hidden
            />
          ) : (
            <ChevronDown size={16} aria-hidden />
          )}
        </button>

        {open ? (
          <div
            ref={panel}
            className="range-panel ds-overlay"
            role="dialog"
            aria-label="Elegir periodo y comparación"
          >
            <aside className="range-presets" aria-label="Atajos de periodo">
              {(["rapidos", "calendario"] as const).map((group) => (
                <div key={group}>
                  <p className="range-group">
                    {group === "rapidos" ? "Rápidos" : "Calendario"}
                  </p>
                  {REPORT_PRESETS.filter((item) => item.group === group).map(
                    (item) => (
                      <button
                        key={item.key}
                        type="button"
                        className={`range-preset ${draft.preset === item.key ? "is-active" : ""}`}
                        aria-pressed={draft.preset === item.key}
                        onClick={() => choosePreset(item.key)}
                      >
                        {item.label}
                      </button>
                    ),
                  )}
                </div>
              ))}
              <p className="range-group">Libre</p>
              <button
                type="button"
                className={`range-preset ${draft.preset === "custom" ? "is-active" : ""}`}
                aria-pressed={draft.preset === "custom"}
                onClick={() => choosePreset("custom")}
              >
                Personalizado
              </button>
            </aside>

            <div className="range-main">
              <div
                className="range-targets"
                role="tablist"
                aria-label="Qué se elige en el calendario"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={target === "periodo"}
                  className={target === "periodo" ? "is-active" : ""}
                  onClick={() => {
                    setTarget("periodo");
                    setPhase("start");
                  }}
                >
                  <span
                    className="range-swatch range-swatch-current"
                    aria-hidden
                  />
                  Periodo
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={target === "comparacion"}
                  className={target === "comparacion" ? "is-active" : ""}
                  onClick={() => {
                    setTarget("comparacion");
                    setDraft((current) => ({ ...current, compare: "custom" }));
                    setMonth(
                      shiftMonth(
                        monthKey(resolved.previousEnd),
                        singleMonth ? 0 : -1,
                      ),
                    );
                  }}
                >
                  <span
                    className="range-swatch range-swatch-compare"
                    aria-hidden
                  />
                  Comparación
                </button>
              </div>

              <div className="range-inputs">
                {target === "periodo" ? (
                  <>
                    <label>
                      <span>Inicio</span>
                      <input
                        className="ds-input"
                        type="date"
                        min={REPORT_MIN_DATE}
                        max={cutoff}
                        value={draft.start}
                        onChange={(event) =>
                          typeDate("start", event.target.value)
                        }
                      />
                    </label>
                    <label>
                      <span>Fin</span>
                      <input
                        className="ds-input"
                        type="date"
                        min={draft.start}
                        max={cutoff}
                        value={draft.end}
                        onChange={(event) =>
                          typeDate("end", event.target.value)
                        }
                      />
                    </label>
                    <p className="range-hint">
                      {phase === "end"
                        ? "Elige el último día del periodo."
                        : "Haz clic en el primer día y después en el último."}
                    </p>
                  </>
                ) : (
                  <>
                    <label>
                      <span>Inicio de la comparación</span>
                      <input
                        className="ds-input"
                        type="date"
                        min={REPORT_MIN_DATE}
                        max={addDays(cutoff, -(resolved.days - 1))}
                        value={draft.cfrom}
                        onChange={(event) =>
                          typeDate("cfrom", event.target.value)
                        }
                      />
                    </label>
                    <p className="range-hint">
                      Haz clic en el día en que empieza. La comparación dura lo
                      mismo que el periodo ({resolved.days}{" "}
                      {resolved.days === 1 ? "día" : "días"}) y termina el{" "}
                      {fmt(compareEnd)}.
                    </p>
                  </>
                )}
              </div>

              <div className="range-calendars">
                <button
                  type="button"
                  className="range-nav"
                  aria-label="Mes anterior"
                  disabled={month <= monthKey(REPORT_MIN_DATE)}
                  onClick={() => setMonth((value) => shiftMonth(value, -1))}
                >
                  <ChevronLeft size={16} />
                </button>
                {[month, shiftMonth(month, 1)].map((value) => (
                  <MonthGrid
                    key={value}
                    month={value}
                    cutoff={cutoff}
                    gscFloor={gscFloor}
                    start={liveStart}
                    end={liveEnd}
                    compareStart={
                      resolved.compare === "custom" || target === "comparacion"
                        ? compareStart
                        : resolved.previousStart
                    }
                    compareEnd={
                      resolved.compare === "custom" || target === "comparacion"
                        ? compareEnd
                        : resolved.previousEnd
                    }
                    onPick={pickDay}
                    onHover={setHover}
                  />
                ))}
                <button
                  type="button"
                  className="range-nav"
                  aria-label="Mes siguiente"
                  disabled={
                    shiftMonth(month, singleMonth ? 0 : 1) >= monthKey(cutoff)
                  }
                  onClick={() => setMonth((value) => shiftMonth(value, 1))}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <p className="range-legend">
                <span
                  className="range-swatch range-swatch-current"
                  aria-hidden
                />
                Periodo{" "}
                <span
                  className="range-swatch range-swatch-compare"
                  aria-hidden
                />
                Comparación <span className="range-dot" aria-hidden />
                Sin dato de Search Console (guarda desde el {fmt(gscFloor)})
              </p>

              <div className="range-options">
                <fieldset>
                  <legend>Comparar con</legend>
                  <label>
                    <input
                      type="radio"
                      name="cmp"
                      checked={draft.compare === "anterior"}
                      onChange={() => {
                        setDraft((current) => ({
                          ...current,
                          compare: "anterior",
                        }));
                        setTarget("periodo");
                      }}
                    />{" "}
                    Periodo anterior
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="cmp"
                      checked={draft.compare === "custom"}
                      onChange={() => {
                        setDraft((current) => ({
                          ...current,
                          compare: "custom",
                        }));
                        setTarget("comparacion");
                        setMonth(
                          shiftMonth(
                            monthKey(resolved.previousEnd),
                            singleMonth ? 0 : -1,
                          ),
                        );
                      }}
                    />{" "}
                    Periodo elegido
                  </label>
                </fieldset>
                <fieldset>
                  <legend>Año pasado</legend>
                  <label>
                    <input
                      type="radio"
                      name="yoy"
                      checked={draft.yoy === "fecha"}
                      onChange={() =>
                        setDraft((current) => ({ ...current, yoy: "fecha" }))
                      }
                    />{" "}
                    Misma fecha
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="yoy"
                      checked={draft.yoy === "semana"}
                      onChange={() =>
                        setDraft((current) => ({ ...current, yoy: "semana" }))
                      }
                    />{" "}
                    Mismo día de la semana
                  </label>
                </fieldset>
              </div>

              <footer className="range-footer">
                <dl>
                  <div>
                    <dt>Periodo</dt>
                    <dd>
                      {fmtRange(resolved.start, resolved.end)} · {resolved.days}{" "}
                      {resolved.days === 1 ? "día" : "días"}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      {resolved.compare === "custom"
                        ? "Comparación elegida"
                        : "Periodo anterior"}
                    </dt>
                    <dd>
                      {fmtRange(resolved.previousStart, resolved.previousEnd)}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      {resolved.yearAlign === "semana"
                        ? "Año pasado (día de la semana)"
                        : "Año pasado"}
                    </dt>
                    <dd>
                      {fmtRange(
                        resolved.previousYearStart,
                        resolved.previousYearEnd,
                      )}
                    </dd>
                  </div>
                </dl>
                <div className="range-actions">
                  <button
                    type="button"
                    className="ds-button ds-button-compact"
                    onClick={() => setOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="ds-button ds-button-primary ds-button-compact"
                    onClick={apply}
                  >
                    Aplicar
                  </button>
                </div>
              </footer>
            </div>
          </div>
        ) : null}
      </div>

      {marketSlot}
      <p className="range-note">Datos cerrados hasta el {fmt(cutoff)}</p>
    </div>
  );
}

function MonthGrid({
  month,
  cutoff,
  gscFloor,
  start,
  end,
  compareStart,
  compareEnd,
  onPick,
  onHover,
}: {
  month: string;
  cutoff: string;
  gscFloor: string;
  start: string;
  end: string;
  compareStart: string;
  compareEnd: string;
  onPick: (day: string) => void;
  onHover: (day: string | null) => void;
}) {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const first = iso(Date.UTC(y, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const offset = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7;
  const cells: Array<string | null> = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => addDays(first, index)),
  ];
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, index) =>
    cells.slice(index * 7, index * 7 + 7),
  );
  return (
    <table className="range-month" onMouseLeave={() => onHover(null)}>
      <caption>
        {MONTHS[m - 1]} {y}
      </caption>
      <thead>
        <tr>
          {WEEKDAYS.map((day) => (
            <th key={day} scope="col">
              {day}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((week, index) => (
          <tr key={index}>
            {week.map((day, cell) => {
              if (!day) return <td key={cell} />;
              const disabled = day > cutoff || day < REPORT_MIN_DATE;
              const inRange = day >= start && day <= end;
              const inCompare = day >= compareStart && day <= compareEnd;
              const edge = day === start || day === end;
              const classes = [
                "range-day",
                inRange ? "in-range" : "",
                edge ? "is-edge" : "",
                inCompare ? "in-compare" : "",
                day < gscFloor ? "no-gsc" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <td key={cell}>
                  <button
                    type="button"
                    className={classes}
                    disabled={disabled}
                    aria-pressed={edge}
                    aria-label={new Date(`${day}T00:00:00Z`).toLocaleDateString(
                      "es-ES",
                      {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        timeZone: "UTC",
                      },
                    )}
                    onClick={() => onPick(day)}
                    onMouseEnter={() => onHover(day)}
                    onFocus={() => onHover(day)}
                  >
                    {Number(day.slice(8, 10))}
                  </button>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Modo presentación e impresión a PDF. */
export function PresentControls({ present }: { present: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const navigation = useReportNavigation();
  function toggle() {
    const next = new URLSearchParams(params.toString());
    if (present) next.delete("modo");
    else next.set("modo", "presentacion");
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  }
  return (
    <div className="present-controls no-print">
      <button
        className="ds-button ds-button-compact"
        type="button"
        onClick={toggle}
        disabled={navigation?.pending}
      >
        {present ? "Salir del modo presentación" : "Modo presentación"}
      </button>
      <button
        className="ds-button ds-button-compact"
        type="button"
        onClick={() => window.print()}
        disabled={navigation?.pending}
      >
        Imprimir o guardar PDF
      </button>
    </div>
  );
}
