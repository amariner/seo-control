import Link from "next/link";
import { notFound } from "next/navigation";
import { REPORT_CHAPTERS, latestVersion } from "@seo/contracts";
import { Badge, Card, Notice } from "@seo/ui";
import { ReportDataTable } from "@seo/ui/data-table";
import { PageFrame } from "@/components/page-frame";
import { EditorialBacklinks } from "@/components/editorial/backlinks";
import { getReportArchive } from "@/lib/reports";

const chapterTone = {
  publicado: "good",
  parcial: "warn",
  pendiente: "neutral",
} as const;

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const archive = getReportArchive({
    project: "all",
    type: "all",
    status: "all",
    year: "all",
  });
  const report = archive.entries.find((entry) => entry.id === id);
  if (!report) notFound();
  const current = latestVersion(report);
  const chapters = REPORT_CHAPTERS.filter((chapter) =>
    report.chapters.includes(chapter.key),
  );
  const published = report.status === "publicado";

  return (
    <PageFrame
      eyebrow={`${report.type} · v${current.version}`}
      title={report.title}
      description={`${report.period} · ${report.project ?? "Conjunto del grupo"}`}
      generatedAt={archive.generatedAt}
      showGlobalFilters={false}
      aside={
        <div className="date-context">
          <Badge tone={published ? "good" : "warn"}>{report.status}</Badge>
          <br />
          <br />
          {report.publishedAt ?? "Sin publicar"}
        </div>
      }
    >
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24 }}
      >
        <Link className="ds-button ds-button-quiet" href="/reports">
          Volver al archivo
        </Link>
        {published ? (
          <Link
            className="ds-button ds-button-secondary"
            href={`/api/v1/exports/${report.id}.csv`}
          >
            Descargar CSV
          </Link>
        ) : null}
      </div>
      {archive.mode === "synthetic" ? (
        <Notice tone="info">
          Informe de ejemplo. Contenido sintético de validación.
        </Notice>
      ) : null}
      <Card className="subpage-card" id="bloque-resumen">
        <h2>Resumen archivado</h2>
        <p className="lede">{report.executiveSummary}</p>
        <div className="insight-grid" style={{ marginTop: 24 }}>
          <div className="info-box">
            <small>Autor</small>
            <strong>{current.author}</strong>
          </div>
          <div className="info-box">
            <small>Revisor</small>
            <strong>{current.reviewer ?? "Pendiente"}</strong>
          </div>
          <div className="info-box">
            <small>Bloques</small>
            <strong>{report.blocks}</strong>
          </div>
        </div>
      </Card>
      <section className="section" aria-labelledby="capitulos-informe">
        <div className="section-heading">
          <div>
            <h2 id="capitulos-informe">Capítulos</h2>
            <p>
              Índice y cobertura disponible. El contenido completo aún no está
              incorporado.
            </p>
          </div>
          <span className="result-count">{chapters.length} capítulos</span>
        </div>
        <ReportDataTable
          id="report-detail-chapters"
          caption="Capítulos del informe"
          searchPlaceholder="Buscar capítulo…"
          columns={[
            { key: "label", label: "Capítulo" },
            { key: "state", label: "Estado" },
            { key: "coverage", label: "Cobertura" },
            { key: "link", label: "Consulta", sortable: false },
          ]}
          rows={chapters.map((chapter) => ({
            id: chapter.key,
            ...(chapter.key !== "resumen"
              ? { anchorId: `bloque-${chapter.key}` }
              : {}),
            searchText: `${chapter.label} ${chapter.v1Sections.join(" ")} ${chapter.gap ?? ""}`,
            values: {
              label: chapter.label,
              state: chapter.state,
              coverage: chapter.gap ?? "Disponible",
              link: null,
            },
            cells: {
              state: (
                <Badge tone={chapterTone[chapter.state]}>{chapter.state}</Badge>
              ),
              link:
                chapter.key === "resumen" ? (
                  <a className="ds-evidence" href="#bloque-resumen">
                    Ver resumen
                  </a>
                ) : chapter.surface && !chapter.surface.includes("[") ? (
                  <Link className="ds-evidence" href={chapter.surface}>
                    Ver datos
                  </Link>
                ) : (
                  "—"
                ),
            },
          }))}
        />
      </section>
      <section className="section" aria-labelledby="historial-versiones">
        <div className="section-heading">
          <div>
            <h2 id="historial-versiones">Versiones</h2>
            <p>Las correcciones conservan la versión anterior.</p>
          </div>
        </div>
        <ReportDataTable
          id="report-versions"
          caption="Versiones del informe"
          searchPlaceholder="Buscar versión, autor o cambio…"
          columns={[
            { key: "version", label: "Versión", numeric: true },
            { key: "date", label: "Publicación" },
            { key: "status", label: "Estado" },
            { key: "author", label: "Autor" },
            { key: "reviewer", label: "Revisor" },
            { key: "change", label: "Cambio" },
          ]}
          rows={[...report.versions].reverse().map((version) => ({
            id: String(version.version),
            searchText: `${version.author} ${version.reviewer ?? ""} ${version.changeNote ?? ""}`,
            values: {
              version: version.version,
              date: version.publishedAt,
              status: version.status,
              author: version.author,
              reviewer: version.reviewer,
              change: version.changeNote,
            },
            cells: {
              version: (
                <strong>
                  v{version.version}
                  {version.version === current.version ? " · actual" : ""}
                </strong>
              ),
              status: (
                <Badge
                  tone={
                    version.status === "publicado"
                      ? "good"
                      : version.status === "aprobado"
                        ? "info"
                        : "warn"
                  }
                >
                  {version.status}
                </Badge>
              ),
            },
          }))}
        />
      </section>
      <div id="bloque-editorial">
        <EditorialBacklinks kind="report" id={report.id} />
      </div>
      <details className="section">
        <summary className="section-link">
          Capítulos no incluidos ({REPORT_CHAPTERS.length - chapters.length})
        </summary>
        <ul className="bullet-list" style={{ marginTop: 16 }}>
          {REPORT_CHAPTERS.filter(
            (chapter) => !report.chapters.includes(chapter.key),
          ).map((chapter) => (
            <li key={chapter.key}>{chapter.label}</li>
          ))}
        </ul>
        <p style={{ marginTop: 16 }}>
          <Link className="ds-evidence" href="/reports#capitulos">
            Ver cobertura del archivo
          </Link>
        </p>
      </details>
      <p className="provenance" style={{ marginTop: 28 }}>
        <span>Archivo de informes · Confidencial · Uso interno</span>
      </p>
    </PageFrame>
  );
}
