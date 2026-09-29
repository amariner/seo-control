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
import { Download, Presentation } from "lucide-react";
import {
  parseFrozenArchiveFilters,
  type FrozenArchiveFilters,
} from "@seo/reports/archive";
import { PageFrame } from "@/components/page-frame";
import {
  frozenExportHref,
  frozenPresentationHref,
  getFrozenArchive,
} from "@/lib/frozen-reports";
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
const longDate = (value: string) =>
  new Date(
    value.length === 10 ? `${value}T00:00:00Z` : value,
  ).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Madrid",
  });
const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;
/** Los dos formularios de la página conservan el estado del otro en campos ocultos. */
const FROZEN_PARAMS = {
  brand: "marca",
  kind: "periodo",
  year: "anio",
} as const;
function Keep({ values }: { values: Record<string, string> }) {
  return (
    <>
      {Object.entries(values)
        .filter(([, value]) => value !== "all")
        .map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
    </>
  );
}
const frozenQuery = (filters: FrozenArchiveFilters) =>
  Object.fromEntries(
    Object.entries(FROZEN_PARAMS).map(([key, name]) => [
      name,
      filters[key as keyof FrozenArchiveFilters],
    ]),
  );
const origins = (chapter: ReportArchiveChapter) =>
  chapter.v1Reports
    .map((origin) => (origin === "informe" ? "Trimestral" : "Por fechas"))
    .join(" + ");

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseReportFilters(params);
  const archive = getReportArchive(filters);
  const frozenFilters = parseFrozenArchiveFilters(params);
  const frozen = getFrozenArchive(frozenFilters);
  const frozenFiltering =
    frozenFilters.brand !== "all" ||
    frozenFilters.kind !== "all" ||
    frozenFilters.year !== "all";
  const filtering =
    filters.project !== "all" ||
    filters.type !== "all" ||
    filters.status !== "all" ||
    filters.year !== "all";

  return (
    <PageFrame
      eyebrow="Archivo de informes"
      title="Informes"
      description="Versiones congeladas de los periodos cerrados, con su presentación, PDF, HTML y CSV."
      generatedAt={frozen.updatedAt}
      showGlobalFilters={false}
      aside={
        <div className="date-context">
          <strong>
            {plural(frozen.total, "informe congelado", "informes congelados")}
          </strong>
          <br />
          {frozen.years.join(" · ") || "Sin versiones"}
        </div>
      }
    >
      <section className="section" aria-labelledby="congelados">
        <div className="section-heading">
          <div>
            <h2 id="congelados">Informes congelados</h2>
            <p>
              Datos reales de Search Console y GA4 fijados en el workbench al
              cerrar el periodo, con las puntualizaciones del equipo SEO. Las
              cifras no cambian hasta que alguien regenere la versión.
            </p>
          </div>
          <span className="result-count">
            {frozenFiltering
              ? `${frozen.entries.length} de ${frozen.total}`
              : plural(frozen.total, "informe", "informes")}
          </span>
        </div>
        <form
          className="editorial-toolbar"
          aria-label="Filtros de los informes congelados"
          action="/reports"
        >
          <Keep
            values={{
              project: filters.project,
              type: filters.type,
              status: filters.status,
              year: String(filters.year),
            }}
          />
          <label className="field">
            <span>Marca</span>
            <select
              className="ds-select"
              name="marca"
              defaultValue={frozenFilters.brand}
            >
              <option value="all">Todas las marcas</option>
              {frozen.brands.map((slug) => (
                <option key={slug} value={slug}>
                  {projectName(slug)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Periodo</span>
            <select
              className="ds-select"
              name="periodo"
              defaultValue={frozenFilters.kind}
            >
              <option value="all">Meses y trimestres</option>
              <option value="quarter">Trimestres</option>
              <option value="month">Meses</option>
            </select>
          </label>
          <label className="field">
            <span>Año</span>
            <select
              className="ds-select"
              name="anio"
              defaultValue={frozenFilters.year}
            >
              <option value="all">Todos los años</option>
              {frozen.years.map((year) => (
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
            {frozenFiltering ? (
              <Link className="ds-button ds-button-quiet" href="/reports">
                Limpiar
              </Link>
            ) : null}
          </div>
        </form>
        {frozen.total === 0 ? (
          <Notice tone="info">
            Todavía no hay versiones congeladas. Se congelan desde «Informes»
            del workbench al cerrar un trimestre o un mes, y llegan aquí con el
            despliegue.
          </Notice>
        ) : null}
        <ReportDataTable
          id="frozen-reports"
          caption="Informes congelados"
          searchPlaceholder="Buscar marca, periodo o autor…"
          columns={[
            { key: "report", label: "Informe" },
            { key: "cutoff", label: "Corte del dato" },
            { key: "frozen", label: "Congelado" },
            { key: "curation", label: "Puntualizaciones", numeric: true },
            { key: "contract", label: "Contrato" },
            { key: "hash", label: "Huella" },
            { key: "open", label: "Consultar", sortable: false },
          ]}
          rows={frozen.entries.map((entry) => {
            const detail = entry.curation
              ? [
                  entry.curation.hiddenSlides
                    ? plural(
                        entry.curation.hiddenSlides,
                        "apartado oculto",
                        "apartados ocultos",
                      )
                    : null,
                  entry.curation.notes
                    ? plural(entry.curation.notes, "nota", "notas")
                    : null,
                  entry.curation.actions
                    ? plural(
                        entry.curation.actions,
                        "acción del equipo",
                        "acciones del equipo",
                      )
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "";
            const name = `${entry.brandName} · ${entry.period.label}`;
            return {
              id: entry.id,
              searchText: `${name} ${entry.period.id} ${entry.generatedBy} ${entry.curation?.updatedBy ?? ""}`,
              values: {
                report: `${entry.period.end} ${entry.brandName}`,
                cutoff: entry.cutoff,
                frozen: entry.generatedAt,
                curation: entry.curation?.count ?? 0,
                contract: entry.stale ? "anterior" : "vigente",
                hash: entry.sha256,
                open: null,
              },
              cells: {
                report: (
                  <>
                    <Link
                      className="cell-primary"
                      href={frozenPresentationHref(
                        entry.brand,
                        entry.period.id,
                      )}
                    >
                      {name}
                    </Link>
                    <span className="cell-secondary">
                      {entry.period.kind === "quarter"
                        ? "Trimestral"
                        : "Mensual"}{" "}
                      · todos los mercados
                    </span>
                  </>
                ),
                cutoff: longDate(entry.cutoff),
                frozen: (
                  <>
                    <span>{longDate(entry.generatedAt)}</span>
                    <span className="cell-secondary">{entry.generatedBy}</span>
                  </>
                ),
                curation: entry.curation ? (
                  <>
                    <span>{entry.curation.count}</span>
                    {detail ? (
                      <span className="cell-secondary">{detail}</span>
                    ) : null}
                  </>
                ) : (
                  "—"
                ),
                contract: entry.stale ? (
                  <Badge tone="warn">anterior · {entry.reportVersion}</Badge>
                ) : (
                  <Badge tone="good">vigente</Badge>
                ),
                hash: (
                  <code title={entry.sha256}>{entry.sha256.slice(0, 12)}</code>
                ),
                open: (
                  <span
                    style={{
                      display: "inline-flex",
                      flexWrap: "wrap",
                      gap: 10,
                    }}
                  >
                    <Link
                      className="ds-evidence"
                      href={frozenPresentationHref(
                        entry.brand,
                        entry.period.id,
                      )}
                      aria-label={`Ver en modo presentación ${name}`}
                    >
                      <Presentation size={14} aria-hidden="true" /> Presentación
                    </Link>
                    <Link
                      className="ds-evidence"
                      href={frozenPresentationHref(
                        entry.brand,
                        entry.period.id,
                        true,
                      )}
                      aria-label={`PDF de ${name}`}
                    >
                      PDF
                    </Link>
                    <a
                      className="ds-evidence"
                      href={frozenExportHref(
                        entry.brand,
                        entry.period.id,
                        "html",
                      )}
                      aria-label={`Descargar HTML de ${name}`}
                      download
                    >
                      <Download size={14} aria-hidden="true" /> HTML
                    </a>
                    <a
                      className="ds-evidence"
                      href={frozenExportHref(
                        entry.brand,
                        entry.period.id,
                        "csv",
                      )}
                      aria-label={`Descargar CSV de ${name}`}
                      download
                    >
                      <Download size={14} aria-hidden="true" /> CSV
                    </a>
                  </span>
                ),
              },
            };
          })}
          note="El HTML se abre sin conexión y lleva incrustados estilos y logotipo. HTML y CSV llevan quién los exporta, cuándo, la versión, la huella del fichero congelado y la confidencialidad."
        />
      </section>
      <section className="section" aria-labelledby="archivo-ejemplo">
        <div className="section-heading">
          <div>
            <h2 id="archivo-ejemplo">Archivo de ejemplo</h2>
            <p>
              Circuito borrador → revisión → aprobación → publicación y
              equivalencia con los informes de la V1. Contenido sintético de
              validación: no son informes reales.
            </p>
          </div>
          <span className="result-count">
            {archive.totalEntries} informes · {archive.years.join(" · ")}
          </span>
        </div>
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
          <Keep values={frozenQuery(frozenFilters)} />
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
            <select
              className="ds-select"
              name="type"
              defaultValue={filters.type}
            >
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
            <select
              className="ds-select"
              name="year"
              defaultValue={filters.year}
            >
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
                    {report.status === "revision"
                      ? "en revisión"
                      : report.status}
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
      </section>
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
