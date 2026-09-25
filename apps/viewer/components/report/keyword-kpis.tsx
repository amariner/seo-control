"use client";

import { useState, type ReactNode } from "react";
import type {
  BrandReport,
  ReportSearchSegment,
  ReportSearchTotals,
} from "@seo/contracts";
import { InfoHint } from "./info-hint";
import { RankBar } from "./rank-bar";
import { ReportPendingZone } from "./report-navigation";

/**
 * Tarjetas de la pestaña Keywords. Por defecto enseñan el total de Google; el
 * anillo de la última tarjeta filtra las demás a búsquedas de marca o sin
 * marca, y pulsar de nuevo el segmento activo vuelve al total.
 */

type Totals3 = ReportSearchTotals["all"]["clicks"];

const format = (value: number | null, digits = 0) =>
  value === null
    ? "—"
    : new Intl.NumberFormat("es-ES", {
        maximumFractionDigits: digits,
        useGrouping: "always" as unknown as boolean,
      }).format(value);
const signed = (change: number, digits = 1) =>
  `${change > 0 ? "+" : change < 0 ? "−" : ""}${format(Math.abs(change), digits)}`;

type DeltaKind = "percent" | "points" | "position";
function Change({
  value,
  base,
  kind = "percent",
}: {
  value: number | null;
  base: number | null;
  kind?: DeltaKind;
}) {
  if (value === null || base === null || (kind === "percent" && base === 0))
    return <span className="brand-delta">—</span>;
  const change =
    kind === "percent" ? ((value - base) / Math.abs(base)) * 100 : value - base;
  // En posición, bajar de número es subir en Google.
  const good = kind === "position" ? change <= 0 : change >= 0;
  return (
    <span className={`brand-delta ${good ? "delta-good" : "delta-bad"}`}>
      {signed(change)}
      {kind === "percent" ? " %" : kind === "points" ? " pp" : ""}
    </span>
  );
}

const SEGMENT_SUFFIX: Record<ReportSearchSegment, string> = {
  all: "",
  brand: "de marca",
  nonBrand: "sin marca",
};

function Card({
  title,
  info,
  segment,
  children,
}: {
  title: string;
  info: string;
  segment: ReportSearchSegment;
  children: ReactNode;
}) {
  return (
    <article className="brand-kpi">
      <div className="brand-kpi-label">
        <span className="brand-kpi-title">
          {title}
          {segment !== "all" ? (
            <span className="brand-kpi-segment">{SEGMENT_SUFFIX[segment]}</span>
          ) : null}
          <InfoHint title={title} source="Search Console" text={info} />
        </span>
      </div>
      <ReportPendingZone variant="metric">{children}</ReportPendingZone>
    </article>
  );
}

function Comparisons({
  totals,
  kind,
  window,
}: {
  totals: Totals3;
  kind: DeltaKind;
  window: BrandReport["window"];
}) {
  return (
    <div className="brand-kpi-comparisons">
      <span>
        <Change value={totals.value} base={totals.previous} kind={kind} />
        <small>vs. {window.previousLabel}</small>
      </span>
      <span>
        <Change value={totals.value} base={totals.previousYear} kind={kind} />
        <small>vs. {window.previousYearLabel}</small>
      </span>
    </div>
  );
}

export function KeywordKpis({
  ranking,
  totals,
  window,
}: {
  ranking: BrandReport["keywordRanking"];
  totals: BrandReport["searchTotals"];
  window: BrandReport["window"];
}) {
  const [segment, setSegment] = useState<ReportSearchSegment>("all");
  const keywords = ranking?.segments[segment] ?? null;
  const search = totals?.[segment] ?? null;
  const toggle = (next: ReportSearchSegment) =>
    setSegment((current) => (current === next ? "all" : next));

  const brandClicks = totals?.brand.clicks.value ?? null;
  const nonBrandClicks = totals?.nonBrand.clicks.value ?? null;
  const known =
    brandClicks !== null && nonBrandClicks !== null
      ? brandClicks + nonBrandClicks
      : 0;
  const nonBrandShare = known ? ((nonBrandClicks ?? 0) / known) * 100 : null;
  const share = (clicks: number | null) =>
    known && clicks !== null ? (clicks / known) * 100 : null;

  return (
    <section
      className="brand-overview brand-keyword-kpis"
      aria-label="Indicadores de keywords"
    >
      <div className="brand-kpis">
        <Card
          title="Keywords"
          info="Búsquedas de Google en las que la web aparece con impresiones en el periodo, repartidas por posición media. Google omite las búsquedas anónimas."
          segment={segment}
        >
          <div className="brand-kpi-figure">
            <strong className="brand-kpi-value">
              {format(keywords?.total ?? null)}
              {ranking?.limitReached ? "+" : ""}
            </strong>
          </div>
          {keywords ? (
            <>
              <RankBar
                total={keywords.total}
                segments={[
                  { key: "top3", label: "Top 3", count: keywords.top3 },
                  {
                    key: "top20",
                    label: "Posición 4–20",
                    count: keywords.top20,
                  },
                  { key: "rest", label: "Más de 20", count: keywords.rest },
                ]}
              />
              <div className="brand-kpi-comparisons">
                <span>
                  <Change
                    value={keywords.total}
                    base={keywords.previousTotal}
                  />
                  <small>vs. {window.previousLabel}</small>
                </span>
              </div>
              <p className="brand-kpi-sub">
                <strong>{format(keywords.top3)}</strong> en top 3
                <Change value={keywords.top3} base={keywords.previousTop3} />
              </p>
            </>
          ) : null}
        </Card>

        <Card
          title="CTR"
          info="De cada 100 apariciones en Google, cuántas acaban en clic. La variación va en puntos porcentuales."
          segment={segment}
        >
          <div className="brand-kpi-figure">
            <strong className="brand-kpi-value">
              {search?.ctr.value === null || !search
                ? "—"
                : `${format(search.ctr.value, 1)} %`}
            </strong>
          </div>
          {search ? (
            <Comparisons totals={search.ctr} kind="points" window={window} />
          ) : null}
        </Card>

        <Card
          title="Posición"
          info="Posición media en Google ponderada por impresiones. Un número menor es mejor: una bajada se muestra en verde."
          segment={segment}
        >
          <div className="brand-kpi-figure">
            <strong className="brand-kpi-value">
              {format(search?.position.value ?? null, 1)}
            </strong>
          </div>
          {search ? (
            <Comparisons
              totals={search.position}
              kind="position"
              window={window}
            />
          ) : null}
        </Card>

        <article className="brand-kpi brand-kpi-brand-split">
          <div className="brand-kpi-label">
            <span className="brand-kpi-title">
              De marca y sin marca
              <InfoHint
                title="De marca y sin marca"
                source="Search Console"
                text="Reparto de los clics con consulta visible entre búsquedas que incluyen la marca y búsquedas genéricas. Pulsa un segmento para ver las demás tarjetas solo con él; vuelve a pulsarlo para ver el total."
              />
            </span>
          </div>
          <ReportPendingZone variant="metric">
            <div className="brand-split">
              <svg
                viewBox="0 0 36 36"
                className="brand-split-ring"
                aria-hidden
              >
                <circle
                  className={`brand-split-arc is-brand ${segment === "brand" ? "is-active" : ""} ${segment === "nonBrand" ? "is-muted" : ""}`}
                  cx="18"
                  cy="18"
                  r="15.9155"
                  onClick={() => toggle("brand")}
                />
                {nonBrandShare !== null ? (
                  <circle
                    className={`brand-split-arc is-nonbrand ${segment === "nonBrand" ? "is-active" : ""} ${segment === "brand" ? "is-muted" : ""}`}
                    cx="18"
                    cy="18"
                    r="15.9155"
                    strokeDasharray={`${nonBrandShare} ${100 - nonBrandShare}`}
                    onClick={() => toggle("nonBrand")}
                  />
                ) : null}
              </svg>
              <div
                className="brand-split-options"
                role="group"
                aria-label="Segmento de búsqueda"
              >
                {(
                  [
                    ["nonBrand", "Sin marca", nonBrandClicks, totals?.nonBrand],
                    ["brand", "De marca", brandClicks, totals?.brand],
                  ] as const
                ).map(([key, label, clicks, data]) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={segment === key}
                    onClick={() => toggle(key)}
                  >
                    <span
                      className={`brand-split-swatch ${key === "brand" ? "is-brand" : "is-nonbrand"}`}
                      aria-hidden
                    />
                    <span className="brand-split-text">
                      <strong>
                        {share(clicks) === null
                          ? "—"
                          : `${format(share(clicks), 1)} %`}
                      </strong>{" "}
                      {label}
                      <small>
                        {format(clicks)} clics{" "}
                        {data ? (
                          <Change
                            value={data.clicks.value}
                            base={data.clicks.previous}
                          />
                        ) : null}
                      </small>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </ReportPendingZone>
        </article>
      </div>
    </section>
  );
}
