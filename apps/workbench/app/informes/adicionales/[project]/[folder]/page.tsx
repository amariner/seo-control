import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { readFileSync } from "node:fs";
import { Download } from "lucide-react";
import { FlashMessages } from "@/components/flash-messages";
import { Markdown } from "@/components/markdown";
import { ScrollRegion } from "@/components/scroll-region";
import { WorkbenchFrame } from "@/components/workbench-frame";
import { getAdditionalReport, previewCsv, safeAdditionalPath, type AdditionalFile } from "@/lib/additional-reports";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ project: string; folder: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { project, folder } = await params;
  return { title: `${getAdditionalReport(`${project}/${folder}`)?.report.title ?? folder} · Informes adicionales` };
}

const size = (bytes: number) => (bytes < 1024 ? `${bytes} B` : bytes < 1024 ** 2 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 ** 2).toFixed(1)} MB`);
const fileHref = (file: AdditionalFile) => `/informes/adicionales/fichero?${new URLSearchParams({ path: file.path })}`;
/** Por encima de esto la vista previa no se calcula: se descarga. */
const PREVIEW_MAX = 8 * 1024 * 1024;

/** Detalle de un informe adicional: README, ficheros y vista previa de CSV y Markdown. */
export default async function AdditionalReportPage({ params, searchParams }: Props) {
  const { project, folder } = await params;
  const found = getAdditionalReport(`${project}/${folder}`);
  if (!found) notFound();
  const { report, readme } = found;
  const query = await searchParams;
  const pick = (key: string) => {
    const value = query[key];
    return Array.isArray(value) ? value[0] : value;
  };
  // Sin fichero elegido se lee el README: explica qué es cada salida.
  const selected = report.files.find((file) => file.name === pick("f") && file.name !== "README.md") ?? null;
  const content = selected && selected.size <= PREVIEW_MAX && selected.kind !== "other" && selected.kind !== "html" ? readFileSync(safeAdditionalPath(selected.path)!, "utf8") : null;

  return (
    <WorkbenchFrame
      eyebrow={`Informe adicional · ${report.projectName}`}
      title={report.title}
      description={report.question ?? "Sin pregunta de negocio en el README."}
      crumb={report.path}
      aside={
        <Link className="button button-small button-ghost" href="/informes/adicionales">
          ← Informes adicionales
        </Link>
      }
    >
      <FlashMessages ok={pick("ok")} error={pick("error")} />

      <dl className="rp-facts">
        <div><dt>Estado</dt><dd>{report.status}</dd></div>
        <div><dt>Fecha</dt><dd>{report.date ?? "—"}</dd></div>
        <div><dt>Periodo de datos</dt><dd>{report.period ?? "—"}</dd></div>
        <div><dt>Dato</dt><dd>{report.data}</dd></div>
        <div className="rp-span-all"><dt>Fuente(s)</dt><dd>{report.source ?? "Sin declarar: el README tiene que decir si el dato es real o sintético."}</dd></div>
        <div className="rp-span-all"><dt>Carpeta</dt><dd><code>informes-adicionales/{report.path}/</code> · solo en este equipo</dd></div>
      </dl>

      <div className="rp-additional">
        <section className="wb-card panel" aria-labelledby="ficheros">
          <h2 id="ficheros">Ficheros</h2>
          <ul className="rp-files">
            {report.files.map((file) => (
              <li key={file.name} className={(selected?.name ?? "README.md") === file.name ? "is-current" : undefined}>
                <Link href={file.name === "README.md" ? `/informes/adicionales/${report.path}` : `/informes/adicionales/${report.path}?${new URLSearchParams({ f: file.name })}`}>{file.name}</Link>
                <span className="rp-muted">{size(file.size)}</span>
                <a href={fileHref(file)} aria-label={`Descargar ${file.name}`} title="Descargar">
                  <Download size={14} aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="wb-card panel rp-preview" aria-label="Vista previa">
          {selected ? (
            <>
              <div className="panel-head">
                <h2>{selected.name}</h2>
                <a className="button button-small" href={fileHref(selected)}>
                  <Download size={14} aria-hidden /> Descargar
                </a>
              </div>
              {content === null ? (
                <p className="tool-note">{selected.kind === "html" ? "Ábrelo con «Descargar»: el HTML no se incrusta aquí." : "Sin vista previa para este tipo o tamaño de fichero."}</p>
              ) : selected.kind === "csv" ? (
                <CsvPreview content={content} />
              ) : selected.kind === "md" ? (
                <Markdown source={content} />
              ) : (
                <pre className="rp-code"><code>{content.slice(0, 200_000)}</code></pre>
              )}
            </>
          ) : (
            <Markdown source={readme || "Sin README."} />
          )}
        </section>
      </div>

      {selected && readme ? (
        <section className="wb-card panel rp-readme" aria-labelledby="readme">
          <h2 id="readme">README</h2>
          <Markdown source={readme} />
        </section>
      ) : null}
    </WorkbenchFrame>
  );
}

function CsvPreview({ content }: { content: string }) {
  const { head, rows, total } = previewCsv(content, 100);
  return (
    <>
      <p className="tool-note">
        {total.toLocaleString("es-ES")} filas · se muestran {Math.min(rows.length, 100)}.
      </p>
      <ScrollRegion label="Vista previa del CSV">
        <table className="rp-table rp-csv">
          <thead><tr>{head.map((cell, index) => <th key={index}>{cell}</th>)}</tr></thead>
          <tbody>
            {rows.slice(0, 100).map((row, index) => (
              <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </ScrollRegion>
    </>
  );
}
