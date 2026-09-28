import Link from "next/link";
import { SITE_AUDIT_SEVERITY_LABELS, type SiteAuditSeverity } from "@seo/contracts";
import { CHECKS, type UrlRow } from "@seo/site-audit";
import { ReportDataTable, type ReportDataRow } from "@seo/ui/data-table";

const SEVERITIES: SiteAuditSeverity[] = ["critica", "alta", "media", "baja"];
const severity = new Map(CHECKS.map((check) => [check.id, check.severity]));
const label = new Map(CHECKS.map((check) => [check.id, check.label]));
const fmt = (value: number) => value.toLocaleString("es-ES");
const muted = (text: string) => <span className="sa-muted">{text}</span>;

/**
 * Todas las URL del crawl con sus datos (D-071). Cada URL abre su ficha. Busca
 * también por nombre de incidencia («Sin H1», «Title duplicado»…).
 */
export function CrawlUrlTable({ rows, base }: { rows: UrlRow[]; base: string }) {
  const tableRows: ReportDataRow[] = rows.map((row) => {
    const worst = SEVERITIES.find((level) => row.issues.some((id) => severity.get(id) === level)) ?? null;
    const href = `${base}/url?u=${encodeURIComponent(row.url)}`;
    return {
      id: row.url,
      searchText: `${row.path} ${row.title ?? ""} ${row.h1 ?? ""} ${row.issues.map((id) => label.get(id)).join(" ")}`,
      values: {
        path: row.path,
        status: String(row.status || "Sin respuesta"),
        indexable: row.indexable ? "Sí" : "No",
        worst: worst ? SITE_AUDIT_SEVERITY_LABELS[worst] : "Sin incidencias",
        issues: row.issues.length,
        depth: row.depth,
        title: row.title,
        h1: row.h1,
        titleLength: row.titleLength,
        descriptionLength: row.descriptionLength,
        wordCount: row.wordCount,
        inlinks: row.inlinks,
        outlinks: row.outlinks,
        imagesWithoutAlt: row.imagesWithoutAlt,
        inSitemap: row.inSitemap ? "Sí" : "No",
        responseMs: row.responseMs,
      },
      cells: {
        path: (
          <Link href={href} className="crawl-url-link" title={row.url}>
            {row.path}
          </Link>
        ),
        status: <span className={row.status >= 400 || row.status === 0 ? "url-bad" : row.status >= 300 ? "url-warn" : "url-ok"}>{row.status || "—"}</span>,
        indexable: row.indexable ? "Sí" : <span title={row.notIndexableReason ?? undefined}>No</span>,
        worst: worst ? <span className={`sa-sev is-${worst}`}>{SITE_AUDIT_SEVERITY_LABELS[worst]}</span> : muted("—"),
        issues: row.issues.length ? <span title={row.issues.map((id) => label.get(id)).join("\n")}>{row.issues.length}</span> : muted("0"),
        title: row.title ?? muted("—"),
        h1: row.h1 ?? muted("—"),
        responseMs: `${fmt(row.responseMs)} ms`,
      },
    };
  });
  const options = (key: string) => [...new Set(tableRows.map((row) => String(row.values[key])))].sort().map((value) => ({ value, label: value }));
  return (
    <ReportDataTable
      id="crawl-urls"
      caption="URL rastreadas"
      searchPlaceholder="Buscar URL, title, H1 o incidencia…"
      pageSize={25}
      columns={[
        { key: "path", label: "URL" },
        { key: "status", label: "HTTP" },
        { key: "indexable", label: "Indexable" },
        { key: "worst", label: "Peor incidencia" },
        { key: "issues", label: "Incidencias", numeric: true },
        { key: "depth", label: "Profundidad", numeric: true },
        { key: "inSitemap", label: "Sitemap" },
        { key: "title", label: "Title" },
        { key: "h1", label: "H1" },
        { key: "titleLength", label: "Long. title", numeric: true },
        { key: "descriptionLength", label: "Long. description", numeric: true },
        { key: "wordCount", label: "Palabras", numeric: true },
        { key: "inlinks", label: "Enlaces entrantes", numeric: true },
        { key: "outlinks", label: "Enlaces salientes", numeric: true },
        { key: "imagesWithoutAlt", label: "Imágenes sin alt", numeric: true },
        { key: "responseMs", label: "Respuesta", numeric: true },
      ]}
      filters={[
        { key: "worst", label: "Peor incidencia", options: options("worst") },
        { key: "status", label: "HTTP", options: options("status") },
        { key: "indexable", label: "Indexable", options: options("indexable") },
        { key: "inSitemap", label: "Sitemap", options: options("inSitemap") },
      ]}
      rows={tableRows}
      note={`${fmt(rows.length)} URL del crawl completo (local). Pasa el ratón por «Incidencias» para ver cuáles; abre la URL para su ficha.`}
    />
  );
}
