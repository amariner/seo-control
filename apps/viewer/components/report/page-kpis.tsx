import type { ReactNode } from "react";
import type { BrandReport } from "@seo/contracts";
import type { PageAnalysis } from "@/lib/page-analysis";
import { InfoHint } from "./info-hint";
import { DuplicatesDialog, TrendFilterButton } from "./page-kpi-actions";
import { RankBar } from "./rank-bar";
import { ReportPendingZone } from "./report-navigation";

/**
 * Tarjetas de la pestaña Páginas (D-072). Salen de la muestra de páginas de
 * Search Console del informe; la comparación usa la muestra del periodo
 * anterior y nunca rellena con ceros las URLs que no figuran en ella.
 */

const format = (value: number | null, digits = 0) =>
  value === null
    ? "—"
    : new Intl.NumberFormat("es-ES", {
        maximumFractionDigits: digits,
        useGrouping: "always" as unknown as boolean,
      }).format(value);
const share = (part: number, total: number) =>
  total ? `${format((part / total) * 100, 1)} %` : "—";

function Change({ value, base }: { value: number; base: number | null }) {
  if (base === null || base === 0)
    return <span className="brand-delta">—</span>;
  const change = ((value - base) / Math.abs(base)) * 100;
  return (
    <span className={`brand-delta ${change >= 0 ? "delta-good" : "delta-bad"}`}>
      {change > 0 ? "+" : change < 0 ? "−" : ""}
      {format(Math.abs(change), 1)} %
    </span>
  );
}

function Card({
  title,
  info,
  children,
}: {
  title: string;
  info: string;
  children: ReactNode;
}) {
  return (
    <article className="brand-kpi">
      <div className="brand-kpi-label">
        <span className="brand-kpi-title">
          {title}
          <InfoHint title={title} source="Search Console" text={info} />
        </span>
      </div>
      <ReportPendingZone variant="metric">{children}</ReportPendingZone>
    </article>
  );
}

export function PageKpis({
  analysis: a,
  window,
  table,
  context,
}: {
  analysis: PageAnalysis;
  window: BrandReport["window"];
  /** `id` de la tabla de páginas que filtran las cifras de «Ganan y pierden». */
  table: string;
  /** Marca, periodo y fuente para el brief de duplicadas. */
  context: string;
}) {
  return (
    <section
      className="brand-overview brand-page-kpis"
      aria-label="Indicadores de páginas"
    >
      <div className="brand-kpis">
        <Card
          title="Páginas en Google"
          info="URLs con al menos una impresión en el periodo, repartidas por su posición media. Cuenta cada URL tal como la muestra Google, con o sin barra final y parámetros."
        >
          <div className="brand-kpi-figure">
            <strong className="brand-kpi-value">
              {format(a.visible)}
              {a.limitReached ? "+" : ""}
            </strong>
          </div>
          <RankBar
            total={a.visible}
            unit="páginas"
            label="Páginas por posición media en Google"
            segments={[
              { key: "top3", label: "Top 3", count: a.ranks.top3 },
              { key: "top20", label: "Posición 4–10", count: a.ranks.top10 },
              { key: "rest", label: "Más de 10", count: a.ranks.rest },
            ]}
          />
          <div className="brand-kpi-comparisons">
            <span>
              <Change value={a.visible} base={a.previousVisible} />
              <small>vs. {window.previousLabel}</small>
            </span>
          </div>
          <p className="brand-kpi-sub">
            <strong>{format(a.ranks.top3 + a.ranks.top10)}</strong> en primera
            página
          </p>
        </Card>

        <Card
          title="Páginas con clics"
          info="URLs que reciben al menos un clic de Google. El resto aparece en resultados sin que nadie entre. La concentración indica qué parte de los clics depende de las diez URLs más visitadas."
        >
          <div className="brand-kpi-figure">
            <strong className="brand-kpi-value">{format(a.withClicks)}</strong>
          </div>
          <div className="brand-kpi-comparisons">
            <span>
              <span className="brand-delta">
                {share(a.withClicks, a.visible)}
              </span>
              <small>de las páginas en Google</small>
            </span>
            <span>
              <span className="brand-delta">{format(a.impressionsOnly)}</span>
              <small>aparecen sin recibir clics</small>
            </span>
          </div>
          <p className="brand-kpi-sub">
            Top 10 URLs:{" "}
            <strong>
              {a.top10Share === null ? "—" : `${format(a.top10Share, 1)} %`}
            </strong>{" "}
            de los clics
          </p>
        </Card>

        <Card
          title="Ganan y pierden"
          info="URLs presentes en las dos muestras, comparadas por clics con el periodo anterior. Las que no estaban en la muestra anterior se cuentan aparte: pueden ser nuevas o haber quedado fuera de aquella muestra."
        >
          <div className="brand-kpi-figure brand-page-balance">
            <strong className="brand-kpi-value">
              <TrendFilterButton
                table={table}
                trend="ganan"
                className="delta-good"
                label={`Ver en la tabla las ${format(a.gaining)} URLs que ganan clics`}
              >
                {format(a.gaining)}
              </TrendFilterButton>
              <span className="brand-page-balance-sep" aria-hidden>
                /
              </span>
              <TrendFilterButton
                table={table}
                trend="pierden"
                className="delta-bad"
                label={`Ver en la tabla las ${format(a.losing)} URLs que pierden clics`}
              >
                {format(a.losing)}
              </TrendFilterButton>
            </strong>
          </div>
          <div className="brand-kpi-comparisons">
            <span>
              <span
                className={`brand-delta ${a.netClicks >= 0 ? "delta-good" : "delta-bad"}`}
              >
                {a.netClicks > 0 ? "+" : a.netClicks < 0 ? "−" : ""}
                {format(Math.abs(a.netClicks))}
              </span>
              <small>clics en URLs comparables</small>
            </span>
          </div>
          <p className="brand-kpi-sub">
            <strong>{format(a.withoutPrevious)}</strong> sin dato anterior ·{" "}
            {format(a.withoutPreviousClicks)} clics
          </p>
        </Card>

        <Card
          title="URLs duplicadas"
          info="Rutas que Google muestra en más de una URL: con y sin barra final, en mayúsculas o con parámetros. Los clics de las variantes secundarias se reparten en lugar de sumar a la principal."
        >
          <div className="brand-kpi-figure">
            {a.variantGroups ? (
              <strong className="brand-kpi-value">
                <DuplicatesDialog duplicates={a.duplicates} context={context}>
                  {format(a.variantGroups)}
                </DuplicatesDialog>
              </strong>
            ) : (
              <strong className="brand-kpi-value">0</strong>
            )}
          </div>
          <div className="brand-kpi-comparisons">
            <span>
              <span className="brand-delta">{format(a.variantClicks)}</span>
              <small>clics en variantes secundarias</small>
            </span>
          </div>
          <p className="brand-kpi-sub">
            <strong>{format(a.parameterUrls)}</strong> URLs con parámetros
          </p>
        </Card>
      </div>
    </section>
  );
}
