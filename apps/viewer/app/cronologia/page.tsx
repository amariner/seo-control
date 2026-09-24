import type { Metadata } from "next";
import Link from "next/link";
import {
  BRANDS,
  parseTimelineFilters,
  projectSlugSchema,
  type Timeline,
} from "@seo/contracts";
import { Badge, EmptyState, Notice } from "@seo/ui";
import { ReportDataTable } from "@seo/ui/data-table";
import { PageFrame } from "@/components/page-frame";
import { getTimeline } from "@/lib/timeline";

export const metadata: Metadata = { title: "Cronología" };
const projectName = (slug: string | null) =>
  slug === null
    ? "Conjunto"
    : (BRANDS.find((brand) => brand.slug === slug)?.name ?? slug);

function TimelineTable({
  months,
  horizon,
}: {
  months: Timeline["past"];
  horizon: "ocurrido" | "previsto";
}) {
  return (
    <ReportDataTable
      id={`timeline-${horizon}`}
      caption={horizon === "ocurrido" ? "Hitos ocurridos" : "Hitos previstos"}
      searchPlaceholder="Buscar hito, proyecto o tipo…"
      columns={[
        { key: "title", label: "Hito" },
        { key: "date", label: "Fecha" },
        { key: "project", label: "Proyecto" },
        { key: "kind", label: "Tipo" },
      ]}
      rows={months.flatMap((month) =>
        month.entries.map((entry) => ({
          id: entry.id,
          anchorId: `${horizon}-${entry.id}`,
          searchText: `${entry.title} ${entry.detail ?? ""} ${projectName(entry.project)} ${entry.kind} ${entry.date}`,
          values: {
            title: entry.title,
            date: entry.date,
            project: projectName(entry.project),
            kind: entry.kind,
          },
          cells: {
            title: (
              <>
                <span className="cell-primary">
                  {entry.href ? (
                    <Link href={entry.href}>{entry.title}</Link>
                  ) : (
                    entry.title
                  )}
                </span>
                {entry.detail ? (
                  <details>
                    <summary className="section-link">Detalle</summary>
                    <p>{entry.detail}</p>
                  </details>
                ) : null}
              </>
            ),
            kind: <Badge tone={entry.tone}>{entry.kind}</Badge>,
          },
        })),
      )}
    />
  );
}

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseTimelineFilters(await searchParams);
  const timeline = await getTimeline(filters);
  const pending = timeline.lanes.filter((lane) => lane.state === "pendiente");
  const filtering =
    filters.lane !== "all" ||
    filters.project !== "all" ||
    filters.year !== "all";
  const pastCount = timeline.past.reduce(
    (total, month) => total + month.entries.length,
    0,
  );
  const upcomingCount = timeline.upcoming.reduce(
    (total, month) => total + month.entries.length,
    0,
  );

  return (
    <PageFrame
      eyebrow="Seguimiento"
      title="Cronología"
      description="Publicaciones, cambios y compromisos del grupo."
      generatedAt={timeline.generatedAt}
      showGlobalFilters={false}
      aside={
        <div className="date-context">
          <strong>{timeline.totalEntries} hitos</strong>
          <br />
          Corte {timeline.asOf}
        </div>
      }
    >
      <form
        className="editorial-toolbar"
        aria-label="Filtros de la cronología"
        action="/cronologia"
      >
        <label className="field">
          <span>Tipo</span>
          <select className="ds-select" name="lane" defaultValue={filters.lane}>
            <option value="all">Todos los tipos</option>
            {timeline.lanes.map((lane) => (
              <option key={lane.key} value={lane.key}>
                {lane.label} ({lane.total})
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Proyecto</span>
          <select
            className="ds-select"
            name="project"
            defaultValue={filters.project}
          >
            <option value="all">Todos los proyectos</option>
            {projectSlugSchema.options.map((slug) => (
              <option key={slug} value={slug}>
                {projectName(slug)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Año</span>
          <select className="ds-select" name="year" defaultValue={filters.year}>
            <option value="all">Todos los años</option>
            {timeline.years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <div className="toolbar-actions">
          <button className="ds-button ds-button-secondary" type="submit">
            Aplicar
          </button>
          {filtering ? (
            <Link className="ds-button ds-button-quiet" href="/cronologia">
              Limpiar
            </Link>
          ) : null}
          <span className="result-count">
            {timeline.visibleEntries} de {timeline.totalEntries} hitos
          </span>
        </div>
      </form>
      {filters.project !== "all" ? (
        <p className="muted" style={{ marginBottom: 20 }}>
          Incluye los hitos comunes a todas las marcas.
        </p>
      ) : null}
      {timeline.visibleEntries === 0 ? (
        <EmptyState title="Sin hitos para estos filtros">
          <Link className="ds-evidence" href="/cronologia">
            Ver todos los hitos
          </Link>
        </EmptyState>
      ) : (
        <>
          <section aria-labelledby="ocurrido">
            <div className="section-heading">
              <div>
                <h2 id="ocurrido">Ocurrido</h2>
                <p>Hasta el {timeline.asOf} · Más reciente primero</p>
              </div>
              <span className="result-count">{pastCount} hitos</span>
            </div>
            {pastCount === 0 ? (
              <EmptyState title="Sin hitos anteriores al corte">
                Los hitos de este filtro están programados para más adelante.
              </EmptyState>
            ) : (
              <TimelineTable months={timeline.past} horizon="ocurrido" />
            )}
          </section>
          {upcomingCount > 0 ? (
            <section className="section" aria-labelledby="comprometido">
              <div className="section-heading">
                <div>
                  <h2 id="comprometido">Previsto</h2>
                  <p>Después del {timeline.asOf} · Más próximo primero</p>
                </div>
                <span className="result-count">{upcomingCount} hitos</span>
              </div>
              <TimelineTable months={timeline.upcoming} horizon="previsto" />
            </section>
          ) : null}
        </>
      )}
      {pending.length ? (
        <div style={{ marginTop: 28 }}>
          <Notice tone="info">
            Sin datos de{" "}
            {pending.map((lane) => lane.label.toLowerCase()).join(" y ")}.
            Recogida pendiente.
          </Notice>
        </div>
      ) : null}
      <p className="provenance" style={{ marginTop: 28 }}>
        <span>
          Fuentes: anotaciones, acciones, archivo de informes y calendario
          editorial.
        </span>
        <span>
          El archivo de informes contiene ejemplos sintéticos. El calendario es
          curado.
        </span>
        <Link className="ds-evidence" href="/data">
          Estado de las fuentes
        </Link>
      </p>
    </PageFrame>
  );
}
