import type { BrandReport } from "@seo/contracts";
import { findBrand } from "@seo/contracts";
import type { DeckList, DeckMetric, DeckSlide } from "@seo/reports/project-report";
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

const fmt = new Intl.NumberFormat("es-ES", {
  useGrouping: "always" as unknown as boolean,
});
const compact = new Intl.NumberFormat("es-ES", {
  notation: "compact",
  maximumFractionDigits: 1,
});
/**
 * Techo «redondo» del eje para que las marcas (techo y mitad) se lean sin
 * dejar media gráfica vacía: 30 mil → 30 mil, no 50 mil.
 */
const niceCeil = (value: number) => {
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find(
    (item) => value / power <= item,
  )!;
  return step * power;
};

/** Clics del periodo frente al anterior, en SVG para que imprima como vector. */
function Spark({ series }: { series: NonNullable<DeckSlide["series"]> }) {
  const values = series.flatMap((point) => [
    point.current ?? 0,
    point.previous ?? 0,
  ]);
  const top = niceCeil(Math.max(1, ...values));
  const w = 1000;
  const h = 180;
  const x = (index: number) =>
    series.length > 1 ? (index / (series.length - 1)) * w : 0;
  const y = (value: number) => h - (value / top) * (h - 12) - 6;
  const line = (key: "current" | "previous") =>
    series
      .map((point, index) =>
        point[key] === null ? null : `${x(index)},${y(point[key]!)}`,
      )
      .filter(Boolean)
      .join(" ");
  const sum = (key: "current" | "previous") =>
    series.reduce((total, point) => total + (point[key] ?? 0), 0);
  // Las marcas van en HTML: el SVG se estira (preserveAspectRatio="none") y
  // deformaría el texto.
  const ticks = [top, top / 2, 0];
  return (
    <figure className="deck-spark">
      <figcaption className="deck-chart-title">
        Clics en Google del periodo
      </figcaption>
      <div className="deck-spark-plot">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="none"
          role="img"
          aria-label="Clics en Google del periodo frente al anterior"
        >
          {ticks.map((tick) => (
            <line
              key={tick}
              className="deck-grid"
              x1={0}
              x2={w}
              y1={y(tick)}
              y2={y(tick)}
              vectorEffect="non-scaling-stroke"
            />
          ))}
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
        {ticks.map((tick) => (
          <span
            key={tick}
            className="deck-tick"
            style={{ top: `${(y(tick) / h) * 100}%` }}
            aria-hidden
          >
            {compact.format(tick)}
          </span>
        ))}
      </div>
      <div className="deck-legend">
        <span className="deck-key is-current">
          Clics del periodo · {fmt.format(sum("current"))}
        </span>
        <span className="deck-key is-previous">
          Periodo anterior · {fmt.format(sum("previous"))}
        </span>
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
  const top = 22;
  const base = h - 26;
  const gutter = 40;
  const max = niceCeil(
    Math.max(
      1,
      ...bars.months.flatMap((m) => [m.value ?? 0, m.previousYear ?? 0]),
    ),
  );
  const slot = (w - gutter) / bars.months.length;
  const barW = Math.min(22, slot * 0.36);
  const y = (value: number) => base - (value / max) * (base - top);
  const hasYear = bars.months.some((m) => m.previousYear !== null);
  return (
    <figure className="deck-bars">
      <figcaption className="deck-chart-title">{bars.title}</figcaption>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={`${bars.title}, frente al mismo mes del año anterior`}
      >
        {[max / 2, max].map((tick) => (
          <g key={tick}>
            <line
              className="deck-grid"
              x1={gutter}
              x2={w}
              y1={y(tick)}
              y2={y(tick)}
            />
            <text
              className="deck-bars-tick"
              x={gutter - 6}
              y={y(tick) + 4}
              textAnchor="end"
            >
              {compact.format(tick)}
            </text>
          </g>
        ))}
        <line
          className="deck-bars-axis"
          x1={gutter}
          x2={w}
          y1={base}
          y2={base}
        />
        {bars.months.map((month, index) => {
          const cx = gutter + slot * index + slot / 2;
          const peak = Math.max(month.value ?? 0, month.previousYear ?? 0);
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
              {/* Solo los meses del informe llevan cifra: el resto es contexto. */}
              {month.inPeriod && month.value !== null ? (
                <text
                  className="deck-bars-value"
                  x={cx}
                  y={y(peak) - 6}
                  textAnchor="middle"
                >
                  {fmt.format(month.value)}
                </text>
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

function ListTable({ list }: { list: DeckList }) {
  const numeric = numericColumns(list.rows, list.head.length);
  return (
    <div className="deck-list">
      <h3>{list.title}</h3>
      <table>
        <thead>
          <tr>
            {list.head.map((cell, cellIndex) => (
              <th
                key={cell}
                className={numeric[cellIndex] ? "is-numeric" : undefined}
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
                          tone && cellIndex === toneAt ? `is-${tone}` : "",
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
              <td className="deck-empty" colSpan={list.head.length}>
                {list.empty ?? "Sin datos."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {list.note ? <p className="deck-list-note">{list.note}</p> : null}
    </div>
  );
}

/**
 * Resumen ejecutivo: el veredicto, la idea clave de cada apartado, las tres
 * primeras acciones y los avisos de medición que condicionan las cifras.
 */
function Summary({
  slide,
  verdict,
}: {
  slide: DeckSlide;
  verdict: NonNullable<DeckSlide["verdict"]>;
}) {
  return (
    <>
      <div className={`deck-verdict is-${verdict.tone}`}>
        <p className="deck-verdict-headline">{verdict.headline}</p>
        <p className="deck-verdict-detail">{verdict.detail}</p>
      </div>
      <div className="deck-summary">
        <div>
          <h3 className="deck-subtitle">Claves por apartado</h3>
          <ul className="deck-points">
            {slide.points?.map((point) => (
              <li className={`is-${point.tone}`} key={point.label}>
                <strong>{point.label}</strong>
                <span>{point.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="deck-summary-side">
          {slide.lists.map((list) => (
            <ListTable list={list} key={list.title} />
          ))}
          {slide.warnings?.length ? (
            <aside className="deck-warnings">
              <strong>Calidad del dato</strong>
              <ul>
                {slide.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </aside>
          ) : null}
        </div>
      </div>
    </>
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
  periodLabel,
  frozen,
}: {
  report: BrandReport;
  slides: DeckSlide[];
  /** Nombre del periodo cerrado («2.º trimestre 2026»), si el informe es de uno (D-076). */
  periodLabel?: string;
  /** Versión congelada en el workbench: quién y cuándo (D-076). */
  frozen?: { generatedBy: string };
  logo?: string;
  marketName: string;
  /** Sin extensión: el navegador lo propone al guardar como PDF. */
  filename: string;
  autoPrint: boolean;
  backHref: string;
}) {
  const brand = findBrand(report.brand)!;
  const w = report.window;
  const windowLabel = periodLabel ?? w.label;
  const period = `${long(w.start)} – ${long(w.end)}`;
  const generated = new Date(report.generatedAt).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Madrid",
  });
  const total = slides.length + 1;
  const warnings = report.dataQuality.filter(
    (item) => item.tone === "warn",
  ).length;
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
          {marketName} · {windowLabel}
        </p>
        <p className="deck-cover-meta">
          Comparado con el {w.previousLabel} ({long(w.previousStart)} –{" "}
          {long(w.previousEnd)}) y con el {w.previousYearLabel} (
          {long(w.previousYearStart)} – {long(w.previousYearEnd)}).
        </p>
        <p className="deck-cover-generated">
          {frozen ? `Versión congelada por ${frozen.generatedBy} el` : "Generado el"} {generated} · datos reales de Search Console
          {report.sources.some((s) => s.source === "ga4" && s.ok)
            ? " y GA4"
            : ""}{" "}
          hasta el {long(report.cutoff)}
          {warnings ? (
            <>
              {" "}
              ·{" "}
              <span className="deck-cover-warn">
                {warnings === 1
                  ? "1 aviso de medición"
                  : `${warnings} avisos de medición`}
                , detallados en el resumen ejecutivo
              </span>
            </>
          ) : null}
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
          {slide.verdict ? (
            <Summary slide={slide} verdict={slide.verdict} />
          ) : (
            <div className="deck-notes">
              <p className="deck-note">{slide.note}</p>
              {slide.reading ? (
                <p className="deck-reading">
                  <strong>Lectura SEO</strong>
                  {slide.reading}
                </p>
              ) : null}
            </div>
          )}
          {slide.comment ? (
            <p className="deck-comment">
              <strong>Puntualización del equipo SEO</strong>
              {slide.comment}
            </p>
          ) : null}
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
          {slide.lists.length && !slide.verdict ? (
            <div
              className={`deck-lists ${slide.lists.length > 1 ? "is-pair" : ""}`}
            >
              {slide.lists.map((list) => (
                <ListTable list={list} key={list.title} />
              ))}
            </div>
          ) : null}
          <footer className="deck-foot">
            <span>
              {brand.name} · {windowLabel}
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
