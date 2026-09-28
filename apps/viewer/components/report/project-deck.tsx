import type { BrandReport } from "@seo/contracts";
import { findBrand } from "@seo/contracts";
import type { DeckMetric, DeckSlide } from "@/lib/project-report";
import { DeckControls } from "./project-deck-controls";
import "./project-deck.css";

/**
 * Informe del proyecto (D-073, D-074). En pantalla es una presentación: una
 * diapositiva por apartado, a pantalla completa y con teclado. Al imprimir, la
 * misma estructura sale como PDF al estilo de la V1 (portada, una página por
 * apartado, cabecera repetida y nombre de fichero desde `document.title`).
 */

const long = (value: string) =>
  new Date(`${value}T00:00:00Z`).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

function Change({ item }: { item: NonNullable<DeckMetric["change"]> }) {
  return (
    <span className={`deck-change is-${item.tone}`}>
      {item.text} <small>vs. {item.against}</small>
    </span>
  );
}

/** Una columna es numérica si todas sus celdas son cifras, variaciones o «—». */
const NUMERIC = /^([−+]?[\d.,]+( %| pp)?|—|Nueva|[\d.,]+ → [\d.,]+)$/;
const numericColumns = (rows: string[][], width: number) =>
  Array.from(
    { length: width },
    (_, index) =>
      index > 0 &&
      rows.length > 0 &&
      rows.every((row) => NUMERIC.test(row[index] ?? "")),
  );

/** Clics del periodo frente al anterior, en SVG para que imprima como vector. */
function Spark({ series }: { series: NonNullable<DeckSlide["series"]> }) {
  const values = series.flatMap((point) => [
    point.current ?? 0,
    point.previous ?? 0,
  ]);
  const max = Math.max(1, ...values);
  const w = 1000;
  const h = 180;
  const x = (index: number) =>
    series.length > 1 ? (index / (series.length - 1)) * w : 0;
  const y = (value: number) => h - (value / max) * (h - 12) - 6;
  const line = (key: "current" | "previous") =>
    series
      .map((point, index) =>
        point[key] === null ? null : `${x(index)},${y(point[key]!)}`,
      )
      .filter(Boolean)
      .join(" ");
  return (
    <figure className="deck-spark">
      <figcaption className="deck-chart-title">
        Clics en Google del periodo
      </figcaption>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Clics en Google del periodo frente al anterior"
      >
        <polyline
          className="deck-spark-previous"
          points={line("previous")}
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          className="deck-spark-current"
          points={line("current")}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="deck-legend">
        <span className="deck-key is-current">Clics del periodo</span>
        <span className="deck-key is-previous">Periodo anterior</span>
        <span className="deck-spark-range">
          {series[0]?.label} – {series.at(-1)?.label}
        </span>
      </div>
    </figure>
  );
}

/**
 * Mes a mes: cada mes, su valor y el del mismo mes del año anterior. Los meses
 * del periodo del informe se resaltan; el resto da contexto.
 */
function Bars({ bars }: { bars: NonNullable<DeckSlide["bars"]> }) {
  const w = 600;
  const h = 250;
  const top = 8;
  const base = h - 26;
  const max = Math.max(
    1,
    ...bars.months.flatMap((m) => [m.value ?? 0, m.previousYear ?? 0]),
  );
  const slot = w / bars.months.length;
  const barW = Math.min(22, slot * 0.36);
  const y = (value: number) => base - (value / max) * (base - top);
  const hasYear = bars.months.some((m) => m.previousYear !== null);
  const fmt = new Intl.NumberFormat("es-ES", {
    useGrouping: "always" as unknown as boolean,
  });
  return (
    <figure className="deck-bars">
      <figcaption className="deck-chart-title">{bars.title}</figcaption>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={`${bars.title}, frente al mismo mes del año anterior`}
      >
        <line className="deck-bars-axis" x1={0} x2={w} y1={base} y2={base} />
        {bars.months.map((month, index) => {
          const cx = slot * index + slot / 2;
          return (
            <g
              key={month.label}
              className={month.inPeriod ? "is-period" : undefined}
            >
              {month.previousYear !== null ? (
                <rect
                  className="deck-bar-year"
                  x={cx - barW - 1}
                  y={y(month.previousYear)}
                  width={barW}
                  height={base - y(month.previousYear)}
                  rx={2}
                >
                  <title>{`${month.label} · año anterior: ${fmt.format(month.previousYear)}`}</title>
                </rect>
              ) : null}
              {month.value !== null ? (
                <rect
                  className="deck-bar-value"
                  x={hasYear ? cx + 1 : cx - barW / 2}
                  y={y(month.value)}
                  width={barW}
                  height={base - y(month.value)}
                  rx={2}
                >
                  <title>{`${month.label}: ${fmt.format(month.value)}`}</title>
                </rect>
              ) : null}
              <text
                className="deck-bars-label"
                x={cx}
                y={h - 8}
                textAnchor="middle"
              >
                {month.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="deck-legend">
        <span className="deck-key is-bar">{bars.metric}</span>
        {hasYear ? (
          <span className="deck-key is-bar-year">
            Mismo mes del año anterior
          </span>
        ) : null}
        <span className="deck-key is-bar-period">Meses del informe</span>
      </div>
    </figure>
  );
}

export function ProjectDeck({
  report,
  slides,
  logo,
  marketName,
  filename,
  autoPrint,
  backHref,
}: {
  report: BrandReport;
  slides: DeckSlide[];
  logo?: string;
  marketName: string;
  /** Sin extensión: el navegador lo propone al guardar como PDF. */
  filename: string;
  autoPrint: boolean;
  backHref: string;
}) {
  const brand = findBrand(report.brand)!;
  const w = report.window;
  const period = `${long(w.start)} – ${long(w.end)}`;
  const generated = new Date(report.generatedAt).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Madrid",
  });
  const total = slides.length + 1;
  const running = (
    <div className="deck-running" aria-hidden>
      <span>
        {brand.name} · {marketName}
      </span>
      <span>{period}</span>
    </div>
  );
  return (
    <div className="deck" id="deck">
      <DeckControls
        filename={filename}
        autoPrint={autoPrint}
        backHref={backHref}
        total={total}
      />
      <section className="deck-slide deck-cover" aria-label="Portada">
        <p className="deck-eyebrow">Informe SEO</p>
        <h1 className="deck-cover-title">
          {logo ? (
            /* eslint-disable-next-line @next/next/no-img-element -- SVG estático de marca. */
            <img src={logo} alt={brand.name} />
          ) : (
            brand.name
          )}
        </h1>
        <p className="deck-cover-period">{period}</p>
        <p className="deck-cover-meta">
          {marketName} · {w.label}
        </p>
        <p className="deck-cover-meta">
          Comparado con el {w.previousLabel} ({long(w.previousStart)} –{" "}
          {long(w.previousEnd)}) y con el {w.previousYearLabel} (
          {long(w.previousYearStart)} – {long(w.previousYearEnd)}).
        </p>
        <p className="deck-cover-generated">
          Generado el {generated} · datos reales de Search Console
          {report.sources.some((s) => s.source === "ga4" && s.ok)
            ? " y GA4"
            : ""}
        </p>
        <ol className="deck-index">
          {slides.map((slide, index) => (
            <li key={slide.id}>
              <span>{String(index + 1).padStart(2, "0")}</span> {slide.title}
            </li>
          ))}
        </ol>
      </section>
      {slides.map((slide, index) => (
        <section
          className="deck-slide"
          id={`deck-${slide.id}`}
          key={slide.id}
          aria-labelledby={`deck-${slide.id}-title`}
        >
          {running}
          <header className="deck-head">
            <span className="deck-num">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <h2 id={`deck-${slide.id}-title`}>{slide.title}</h2>
              <p className="deck-source">{slide.source}</p>
            </div>
          </header>
          <div className="deck-notes">
            <p className="deck-note">{slide.note}</p>
            {slide.reading ? (
              <p className="deck-reading">
                <strong>Lectura SEO</strong>
                {slide.reading}
              </p>
            ) : null}
          </div>
          {slide.metrics.length ? (
            <div className="deck-metrics">
              {slide.metrics.map((metric) => (
                <article className="deck-metric" key={metric.label}>
                  <span className="deck-metric-label">{metric.label}</span>
                  <strong className="deck-metric-value">{metric.value}</strong>
                  {metric.change ? <Change item={metric.change} /> : null}
                  {metric.year ? <Change item={metric.year} /> : null}
                </article>
              ))}
            </div>
          ) : null}
          {(slide.series && slide.series.length > 1) || slide.bars ? (
            <div
              className={`deck-charts ${slide.bars && slide.series && slide.series.length > 1 ? "is-pair" : ""}`}
            >
              {slide.series && slide.series.length > 1 ? (
                <Spark series={slide.series} />
              ) : null}
              {slide.bars ? <Bars bars={slide.bars} /> : null}
            </div>
          ) : null}
          {slide.lists.length ? (
            <div
              className={`deck-lists ${slide.lists.length > 1 ? "is-pair" : ""}`}
            >
              {slide.lists.map((list) => {
                const numeric = numericColumns(list.rows, list.head.length);
                return (
                  <div className="deck-list" key={list.title}>
                    <h3>{list.title}</h3>
                    <table>
                      <thead>
                        <tr>
                          {list.head.map((cell, cellIndex) => (
                            <th
                              key={cell}
                              className={
                                numeric[cellIndex] ? "is-numeric" : undefined
                              }
                            >
                              {cell}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {list.rows.length ? (
                          list.rows.map((row, rowIndex) => {
                            const toneAt = list.toneColumn ?? row.length - 1;
                            const tone = list.tones?.[rowIndex];
                            return (
                              <tr key={rowIndex}>
                                {row.map((cell, cellIndex) => (
                                  <td
                                    key={cellIndex}
                                    className={
                                      [
                                        numeric[cellIndex] ? "is-numeric" : "",
                                        tone && cellIndex === toneAt
                                          ? `is-${tone}`
                                          : "",
                                      ]
                                        .filter(Boolean)
                                        .join(" ") || undefined
                                    }
                                  >
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td
                              className="deck-empty"
                              colSpan={list.head.length}
                            >
                              {list.empty ?? "Sin datos."}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          ) : null}
          <footer className="deck-foot">
            <span>
              {brand.name} · {w.label}
            </span>
            <span>
              {index + 2} / {total}
            </span>
          </footer>
        </section>
      ))}
    </div>
  );
}
