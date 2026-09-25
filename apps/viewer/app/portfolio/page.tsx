import type { Metadata } from "next";
import Link from "next/link";
import {
  BRANDS,
  MARKETS,
  PERIODS,
  SOURCE_LABELS,
  parsePortfolioFilters,
  type BrandSourceMap,
  type PortfolioBrand,
} from "@seo/contracts";
import { Badge, Card, MetricStrip, Notice } from "@seo/ui";
import { ReportDataTable } from "@seo/ui/data-table";
import { MarketBars } from "@/components/portfolio/market-bars";
import { PageFrame } from "@/components/page-frame";
import { brandToggleHref, getPortfolio, portfolioHref } from "@/lib/portfolio";
import { describeDataSource } from "@/lib/data";
import "@/components/overview.css";

export const metadata: Metadata = { title: "Conjunto · SEO Intelligence" };
const number = (value: number) =>
  value.toLocaleString("es-ES", {
    useGrouping: "always" as unknown as boolean,
    maximumFractionDigits: 0,
  });
const sourceNames = (sources: BrandSourceMap) =>
  (Object.keys(SOURCE_LABELS) as Array<keyof BrandSourceMap>)
    .filter((key) => sources[key])
    .map((key) => SOURCE_LABELS[key]);

function editorialStates(brand: PortfolioBrand) {
  return [
    brand.editorial.published
      ? `${brand.editorial.published} publicadas`
      : null,
    brand.editorial.scheduled
      ? `${brand.editorial.scheduled} programadas`
      : null,
    brand.editorial.inProgress
      ? `${brand.editorial.inProgress} en curso`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function SourceList({ sources }: { sources: BrandSourceMap }) {
  const labels = sourceNames(sources);
  return labels.length ? (
    <span className="source-list">
      {labels.map((label) => (
        <code key={label}>{label}</code>
      ))}
    </span>
  ) : (
    <span className="muted">Sin conexión</span>
  );
}

function change(value: number, comparison: number) {
  return comparison === 0 ? null : ((value - comparison) / comparison) * 100;
}

function Delta({ value }: { value: number | null }) {
  return value === null ? (
    <span className="muted">—</span>
  ) : (
    <span className={value >= 0 ? "delta-good" : "delta-bad"}>
      {value > 0 ? "+" : ""}
      {value.toLocaleString("es-ES", { maximumFractionDigits: 1 })}%
    </span>
  );
}

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parsePortfolioFilters(await searchParams);
  const data = await getPortfolio(filters);
  const origin = describeDataSource();
  const comparisonLabel =
    filters.compare === "previousYear" ? "interanual" : "periodo anterior";
  const brandComparison = (brand: PortfolioBrand) =>
    brand.analytics
      ? filters.compare === "previousYear"
        ? brand.analytics.previousYearSessions
        : brand.analytics.previousSessions
      : null;
  const pilotOnly = BRANDS.filter((brand) => brand.pilot).map(
    (brand) => brand.slug,
  );
  const hasVisibility = data.totals.some(
    (metric) => metric.key === "visibility",
  );
  const filterKey = `${filters.brands.join(",")}-${filters.market}-${filters.period}-${filters.compare}`;
  const query = new URLSearchParams({
    brands: filters.brands.join(","),
    market: filters.market,
    period: filters.period,
    compare: filters.compare,
  }).toString();

  return (
    <PageFrame
      eyebrow="Rendimiento por marca"
      title="Conjunto"
      description="Resultados por marca y mercado. Selecciona qué quieres comparar."
      generatedAt={data.generatedAt}
      showGlobalFilters={false}
      aside={
        <div className="date-context">
          <strong>
            {PERIODS.find((period) => period.key === filters.period)?.label}
          </strong>
          <p>Frente al {comparisonLabel}</p>
          <span>{origin.label}</span>
        </div>
      }
    >
      {!origin.realData && (
        <Notice tone="info">
          Analítica sintética de validación. El plan editorial es dato real
          importado de V1.{" "}
          <Link className="ds-evidence" href="/data">
            Ver fuentes
          </Link>
        </Notice>
      )}

      <div
        className="editorial-toolbar overview-toolbar"
        role="group"
        aria-label="Filtros del conjunto"
      >
        <div className="field field-brands">
          <span id="selector-marcas">
            Marcas · {data.coverage.brandsSelected} de 8
          </span>
          <div
            className="brand-chips"
            role="group"
            aria-labelledby="selector-marcas"
          >
            {BRANDS.map((brand) => {
              const selected = filters.brands.includes(brand.slug);
              return (
                <Link
                  key={brand.slug}
                  href={brandToggleHref(filters, brand.slug)}
                  className={`brand-chip ${selected ? "brand-chip-on" : ""} ${brand.pilot ? "" : "brand-chip-pending"}`}
                  aria-current={selected ? "true" : undefined}
                  aria-label={`${selected ? "Quitar" : "Añadir"} ${brand.name}${brand.pilot ? "" : " (sin analítica en esta vista)"}`}
                  title={
                    brand.pilot
                      ? `${brand.name} · con serie analítica`
                      : `${brand.name} · sin analítica en esta vista`
                  }
                >
                  {brand.name}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="field">
          <span>Mercado</span>
          <div className="segmented">
            <Link
              className={filters.market === "all" ? "segment-active" : ""}
              href={portfolioHref(filters, { market: "all" })}
            >
              Todos
            </Link>
            {MARKETS.map((market) => (
              <Link
                key={market.code}
                className={
                  filters.market === market.code ? "segment-active" : ""
                }
                href={portfolioHref(filters, { market: market.code })}
                title={market.name}
              >
                {market.code}
              </Link>
            ))}
          </div>
        </div>
        <div className="field">
          <span>Periodo</span>
          <div className="segmented">
            {PERIODS.map((period) => (
              <Link
                key={period.key}
                className={
                  filters.period === period.key ? "segment-active" : ""
                }
                href={portfolioHref(filters, { period: period.key })}
                title={period.label}
              >
                {period.key}
              </Link>
            ))}
          </div>
        </div>
        <div className="field">
          <span>Comparar con</span>
          <div className="segmented">
            <Link
              className={filters.compare === "previous" ? "segment-active" : ""}
              href={portfolioHref(filters, { compare: "previous" })}
            >
              Periodo anterior
            </Link>
            <Link
              className={
                filters.compare === "previousYear" ? "segment-active" : ""
              }
              href={portfolioHref(filters, { compare: "previousYear" })}
            >
              Interanual
            </Link>
          </div>
        </div>
        <div className="toolbar-actions">
          <span className="result-count">
            <strong>{data.coverage.brandsWithAnalytics}</strong> con analítica
          </span>
          <Link
            className="ds-button ds-button-quiet"
            href={portfolioHref(filters, { brands: pilotOnly })}
          >
            Solo piloto
          </Link>
          <Link className="ds-button ds-button-quiet" href="/portfolio">
            Todas
          </Link>
          <a
            className="ds-button ds-button-quiet"
            href={`/api/v1/portfolio?${query}`}
          >
            Datos JSON
          </a>
        </div>
      </div>

      <section aria-labelledby="indicadores">
        <div className="section-heading">
          <h2 id="indicadores">Indicadores</h2>
          <span className="muted">
            {data.coverage.brandsWithAnalytics} de{" "}
            {data.coverage.brandsSelected} marcas con analítica
          </span>
        </div>
        {data.coverage.brandsWithAnalytics === 0 ? (
          <Notice tone="warn">
            Las marcas seleccionadas no tienen serie analítica en esta vista. El
            plan editorial sí está disponible.
          </Notice>
        ) : (
          <>
            {data.coverage.brandsPending.length > 0 && (
              <p className="overview-caption" style={{ margin: "0 0 20px" }}>
                Sin analítica:{" "}
                {data.coverage.brandsPending
                  .map(
                    (slug) =>
                      BRANDS.find((brand) => brand.slug === slug)?.name ?? slug,
                  )
                  .join(", ")}
                .
              </p>
            )}
            <MetricStrip metrics={data.totals} />
          </>
        )}
      </section>

      <section className="section" aria-labelledby="marcas">
        <div className="section-heading">
          <div>
            <h2 id="marcas">Marcas</h2>
            <p>
              Sesiones frente al {comparisonLabel}. Plan editorial{" "}
              {data.editorialPlanningYear}.
            </p>
          </div>
          <Link className="section-link" href="/projects">
            Abrir proyectos →
          </Link>
        </div>
        <ReportDataTable
          key={filterKey}
          id="portfolio-brands"
          caption="Resultados por marca"
          searchPlaceholder="Buscar marca o dominio…"
          columns={[
            { key: "name", label: "Marca" },
            { key: "sessions", label: "Sesiones", numeric: true },
            { key: "change", label: "Variación", numeric: true },
            { key: "share", label: "Cuota", numeric: true },
            { key: "clicks", label: "Clics", numeric: true },
            ...(hasVisibility
              ? [{ key: "visibility", label: "Visibilidad", numeric: true }]
              : []),
            { key: "editorial", label: "Plan editorial", numeric: true },
          ]}
          rows={data.brands.map((brand) => {
            const delta = brand.analytics
              ? change(brand.analytics.sessions, brandComparison(brand) ?? 0)
              : null;
            const pieces =
              brand.editorial.planPieces + brand.editorial.backlogPieces;
            return {
              id: brand.slug,
              searchText: `${brand.name} ${brand.domain ?? ""}`,
              values: {
                name: brand.name,
                sessions: brand.analytics?.sessions ?? null,
                change: delta,
                share: brand.shareOfSessions,
                clicks: brand.analytics?.clicks ?? null,
                visibility: hasVisibility
                  ? (brand.analytics?.visibility ?? null)
                  : null,
                editorial: pieces,
              },
              cells: {
                name: (
                  <>
                    <Link
                      className="cell-primary"
                      href={`/projects/${brand.slug}`}
                    >
                      {brand.name}
                    </Link>
                    <span className="cell-secondary">
                      {brand.domain ?? "Dominio sin confirmar"}
                      {!brand.analytics && " · sin analítica"}
                    </span>
                  </>
                ),
                sessions: brand.analytics
                  ? number(brand.analytics.sessions)
                  : "—",
                change: <Delta value={delta} />,
                share:
                  brand.shareOfSessions === null
                    ? "—"
                    : `${brand.shareOfSessions.toLocaleString("es-ES", { maximumFractionDigits: 1 })}%`,
                clicks: brand.analytics ? number(brand.analytics.clicks) : "—",
                visibility:
                  brand.analytics && hasVisibility
                    ? `${brand.analytics.visibility.toLocaleString("es-ES")}%`
                    : "—",
                editorial: (
                  <>
                    <Link href={`/editorial/calendario?brand=${brand.slug}`}>
                      {number(pieces)} piezas
                    </Link>
                    <span className="cell-secondary">
                      {brand.editorial.planPieces} en plan ·{" "}
                      {brand.editorial.backlogPieces} en backlog
                    </span>
                    {editorialStates(brand) && (
                      <span className="cell-secondary">
                        {editorialStates(brand)}
                      </span>
                    )}
                  </>
                ),
              },
            };
          })}
          note="La cuota se calcula sobre las sesiones de las marcas seleccionadas con analítica. Los guiones indican datos no disponibles."
        />
      </section>

      {data.markets.length > 0 && (
        <section className="section" aria-labelledby="mercados">
          <div className="section-heading">
            <div>
              <h2 id="mercados">Mercados</h2>
              <p>Sesiones orgánicas · escala común.</p>
            </div>
          </div>
          <Card className="overview-chart">
            <MarketBars markets={data.markets} compare={filters.compare} />
          </Card>
          <details className="overview-details">
            <summary>Ver datos por mercado</summary>
            <ReportDataTable
              key={filterKey}
              id="portfolio-markets"
              caption="Resultados por mercado"
              searchPlaceholder="Buscar mercado…"
              columns={[
                { key: "name", label: "Mercado" },
                { key: "sessions", label: "Sesiones", numeric: true },
                { key: "previous", label: "Anterior", numeric: true },
                { key: "year", label: "Interanual", numeric: true },
                { key: "change", label: "Variación", numeric: true },
                ...(hasVisibility
                  ? [{ key: "visibility", label: "Visibilidad", numeric: true }]
                  : []),
                { key: "brands", label: "Marcas", numeric: true },
              ]}
              rows={data.markets.map((market) => {
                const delta = change(
                  market.sessions,
                  filters.compare === "previousYear"
                    ? market.previousYearSessions
                    : market.previousSessions,
                );
                return {
                  id: market.code,
                  searchText: `${market.name} ${market.code}`,
                  values: {
                    name: market.name,
                    sessions: market.sessions,
                    previous: market.previousSessions,
                    year: market.previousYearSessions,
                    change: delta,
                    visibility: hasVisibility ? market.visibility : null,
                    brands: market.contributingBrands,
                  },
                  cells: {
                    sessions: number(market.sessions),
                    visibility: hasVisibility
                      ? `${market.visibility.toLocaleString("es-ES")}%`
                      : "—",
                    previous: number(market.previousSessions),
                    year: number(market.previousYearSessions),
                    change: <Delta value={delta} />,
                  },
                };
              })}
              note={`Variación frente al ${comparisonLabel}. Solo incluye marcas con serie analítica.`}
            />
          </details>
        </section>
      )}

      {data.objectives.length > 0 && (
        <section className="section" aria-labelledby="objetivos">
          <div className="section-heading">
            <h2 id="objetivos">Objetivos</h2>
          </div>
          <ReportDataTable
            key={filterKey}
            id="portfolio-objectives"
            caption="Objetivos del periodo"
            searchPlaceholder="Buscar indicador…"
            columns={[
              { key: "label", label: "Indicador" },
              { key: "value", label: "Actual", numeric: true },
              { key: "target", label: "Objetivo", numeric: true },
              { key: "progress", label: "Cumplimiento", numeric: true },
              { key: "gap", label: "Pendiente", numeric: true },
              { key: "coverage", label: "Cobertura" },
            ]}
            rows={data.objectives.map((objective) => ({
              id: objective.key,
              searchText: objective.label,
              values: {
                label: objective.label,
                value: objective.value,
                target: objective.target,
                progress: objective.progress,
                gap: objective.gap,
                coverage: objective.coverage.label,
              },
              cells: {
                value: number(objective.value),
                target: number(objective.target),
                progress: `${Math.round(objective.progress * 100)}%`,
                gap: objective.gap > 0 ? number(objective.gap) : "Cumplido",
              },
            }))}
            note="Cumplimiento = valor actual ÷ objetivo. El objetivo suma las marcas con medición."
          />
        </section>
      )}

      <section className="section" aria-labelledby="cobertura">
        <div className="section-heading">
          <h2 id="cobertura">Fuentes y cobertura</h2>
          <Link className="section-link" href="/data">
            Ver detalle →
          </Link>
        </div>
        <ReportDataTable
          key={filterKey}
          id="portfolio-sources"
          caption="Fuentes por marca"
          searchPlaceholder="Buscar marca o fuente…"
          columns={[
            { key: "name", label: "Marca" },
            { key: "current", label: "Fuentes en V2" },
            { key: "legacy", label: "Fuentes en V1" },
            { key: "status", label: "Analítica" },
          ]}
          rows={data.brands.map((brand) => ({
            id: brand.slug,
            searchText: `${brand.name} ${sourceNames(brand.sources.v1).join(" ")} ${sourceNames(brand.sources.v2).join(" ")}`,
            values: {
              name: brand.name,
              current: sourceNames(brand.sources.v2).join(", ") || null,
              legacy: sourceNames(brand.sources.v1).join(", ") || null,
              status: brand.analytics
                ? data.mode === "synthetic"
                  ? "Sintética"
                  : data.mode === "live"
                    ? "En directo"
                    : "Almacén propio"
                : "No disponible",
            },
            cells: {
              current: <SourceList sources={brand.sources.v2} />,
              legacy: <SourceList sources={brand.sources.v1} />,
              status: (
                <>
                  <Badge
                    tone={
                      brand.analytics
                        ? data.mode === "synthetic"
                          ? "warn"
                          : "good"
                        : "neutral"
                    }
                  >
                    {brand.analytics
                      ? data.mode === "synthetic"
                        ? "Sintética"
                        : data.mode === "live"
                          ? "En directo"
                          : "Almacén propio"
                      : "Sin serie"}
                  </Badge>
                  {!brand.analytics && (
                    <span className="cell-secondary">
                      Pendiente de integración
                    </span>
                  )}
                </>
              ),
            },
          }))}
          note={
            <>
              Configuración de fuentes importada de V1. Analítica:{" "}
              {origin.label}. Plan editorial: importación V1 de{" "}
              {data.editorialPlanningYear}.
              {data.mode === "live" &&
                " Datos en directo pendientes de reconciliación."}
            </>
          }
        />
      </section>
    </PageFrame>
  );
}
