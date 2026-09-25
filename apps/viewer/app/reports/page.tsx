import type { Metadata } from "next";
import Link from "next/link";
import {
  BRANDS,
  latestVersion,
  parseReportFilters,
  projectSlugSchema,
  type ReportArchiveChapter,
} from "@seo/contracts";
import { Badge, Notice } from "@seo/ui";
import { ReportDataTable } from "@seo/ui/data-table";
import { Download } from "lucide-react";
import { PageFrame } from "@/components/page-frame";
import { getReportArchive } from "@/lib/reports";

export const metadata: Metadata = { title: "Informes y archivo histórico" };
const TYPES = ["mensual", "trimestral", "especial"] as const;
const STATUSES = ["borrador", "revision", "aprobado", "publicado"] as const;
const chapterTone = {
  publicado: "good",
  parcial: "warn",
  pendiente: "neutral",
} as const;
const statusTone = {
  publicado: "good",
  aprobado: "info",
  revision: "warn",
  borrador: "neutral",
} as const;
const projectName = (slug: string | null) =>
  slug === null
    ? "Conjunto"
    : (BRANDS.find((brand) => brand.slug === slug)?.name ?? slug);
const origins = (chapter: ReportArchiveChapter) =>
  chapter.v1Reports
    .map((origin) => (origin === "informe" ? "Trimestral" : "Por fechas"))
    .join(" + ");

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseReportFilters(await searchParams);
  const archive = getReportArchive(filters);
  const filtering =
    filters.project !== "all" ||
    filters.type !== "all" ||
    filters.status !== "all" ||
    filters.year !== "all";

  return (
    <PageFrame
      eyebrow="Archivo de informes"
      title="Informes"
      description="Cierres, revisiones y versiones publicadas."
      generatedAt={archive.generatedAt}
      showGlobalFilters={false}
      aside={
        <div className="date-context">
          <strong>{archive.totalEntries} informes</strong>
          <br />
          {archive.years.join(" · ")}
        </div>
      }
    >
      {archive.mode === "synthetic" ? (
        <Notice tone="info">
          Archivo de ejemplo. Contenido sintético de validación.
        </Notice>
      ) : null}
      <form
        className="editorial-toolbar"
        aria-label="Filtros del archivo"
        action="/reports"
      >
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
          <span>Tipo</span>
          <select className="ds-select" name="type" defaultValue={filters.type}>
            <option value="all">Todos los tipos</option>
            {TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Estado</span>
          <select
            className="ds-select"
            name="status"
            defaultValue={filters.status}
          >
            <option value="all">Todos los estados</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status === "revision" ? "en revisión" : status}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Año</span>
          <select className="ds-select" name="year" defaultValue={filters.year}>
            <option value="all">Todos los años</option>
            {archive.years.map((year) => (
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
            <Link className="ds-button ds-button-quiet" href="/reports">
              Limpiar
            </Link>
          ) : null}
        </div>
      </form>
      <ReportDataTable
        id="report-archive"
        caption="Archivo de informes"
        searchPlaceholder="Buscar informe, proyecto o autor…"
        columns={[
          { key: "title", label: "Informe" },
          { key: "project", label: "Proyecto" },
          { key: "period", label: "Periodo" },
          { key: "type", label: "Tipo" },
          { key: "status", label: "Estado" },
          { key: "version", label: "Versión", numeric: true },
          { key: "author", label: "Autor" },
          { key: "export", label: "Descarga", sortable: false },
        ]}
        rows={archive.entries.map((report) => {
          const current = latestVersion(report);
          return {
            id: report.id,
            searchText: `${report.title} ${report.executiveSummary} ${projectName(report.project)} ${current.author} ${current.reviewer ?? ""}`,
            values: {
              title: report.title,
              project: projectName(report.project),
              period: report.period,
              type: report.type,
              status: report.status,
              version: current.version,
              author: current.author,
              export: null,
            },
            cells: {
              title: (
                <Link className="cell-primary" href={`/reports/${report.id}`}>
                  {report.title}
                </Link>
              ),
              status: (
                <Badge tone={statusTone[report.status]}>
                  {report.status === "revision" ? "en revisión" : report.status}
                </Badge>
              ),
              version: `v${current.version}`,
              export:
                report.status === "publicado" ? (
                  <Link
                    className="ds-evidence"
                    href={`/api/v1/exports/${report.id}.csv`}
                    aria-label={`Descargar CSV de ${report.title}`}
                  >
                    <Download size={14} aria-hidden="true" /> CSV
                  </Link>
                ) : (
                  "—"
                ),
            },
          };
        })}
        note="Las versiones publicadas conservan su contenido. Las correcciones se registran en una nueva versión."
      />
      <section className="section" aria-labelledby="capitulos">
        <div className="section-heading">
          <div>
            <h2 id="capitulos">Cobertura del archivo</h2>
            <p>
              {archive.coverage.published} capítulos publicados ·{" "}
              {archive.coverage.partial} parciales · {archive.coverage.pending}{" "}
              pendientes
            </p>
          </div>
          <Link className="section-link" href="/data">
            Ver fuentes
          </Link>
        </div>
        <details>
          <summary className="section-link">
            Ver equivalencia con el archivo anterior
          </summary>
          <div style={{ marginTop: 20 }}>
            <ReportDataTable
              id="report-chapters"
              caption="Equivalencia de capítulos"
              searchPlaceholder="Buscar capítulo…"
              columns={[
                { key: "label", label: "Capítulo" },
                { key: "origin", label: "Informe de origen" },
                { key: "state", label: "Estado" },
                { key: "gap", label: "Cobertura pendiente" },
                { key: "count", label: "Informes", numeric: true },
              ]}
              rows={archive.chapters.map((chapter) => ({
                id: chapter.key,
                searchText: `${chapter.label} ${chapter.v1Sections.join(" ")} ${chapter.gap ?? ""}`,
                values: {
                  label: chapter.label,
                  origin: origins(chapter),
                  state: chapter.state,
                  gap: chapter.gap ?? "Cubierto",
                  count: chapter.reportIds.length,
                },
                cells: {
                  label: (
                    <>
                      <span className="cell-primary">
                        {chapter.surface && !chapter.surface.includes("[") ? (
                          <Link href={chapter.surface}>{chapter.label}</Link>
                        ) : (
                          chapter.label
                        )}
                      </span>
                      <span className="cell-secondary">
                        {chapter.v1Sections.join(" · ")}
                      </span>
                    </>
                  ),
                  state: (
                    <Badge tone={chapterTone[chapter.state]}>
                      {chapter.state}
                    </Badge>
                  ),
                  count: `${chapter.reportIds.length} de ${archive.totalEntries}`,
                },
              }))}
            />
          </div>
        </details>
      </section>
    </PageFrame>
  );
}
