import { ArrowUpRight, Info } from "lucide-react";
import { Notice } from "@seo/ui";
import type { PageStructure as Structure, StructureGroup, StructureNode } from "@seo/reports/page-structure";

/**
 * «Estructura del sitio» de la pestaña Páginas (D-087): un grupo por sitemap
 * y, dentro, sus páginas por carpeta con los clics de Search Console de cada
 * rama. Filas compactas y plegables con `<details>`, sin JavaScript.
 */
const MAX_CHILDREN = 200;
const fmt = (value: number | null, digits = 0) =>
  value === null
    ? "—"
    : new Intl.NumberFormat("es-ES", {
        maximumFractionDigits: digits,
        useGrouping: "always" as unknown as boolean,
      }).format(value);
const share = (value: number) => (value <= 0 ? "—" : value < 0.1 ? "<0,1 %" : `${fmt(value, 1)} %`);
const when = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Madrid",
  });

function Cells({ node }: { node: StructureNode }) {
  return (
    <>
      <span>{fmt(node.pages)}</span>
      <span>{fmt(node.withClicks)}</span>
      <strong>{node.clicks ? fmt(node.clicks) : "—"}</strong>
      <span>{share(node.share)}</span>
      <span>{fmt(node.position, 1)}</span>
    </>
  );
}

function Name({ label, url, title, extra }: { label: string; url: string | null; title?: string; extra?: string }) {
  return (
    <span className="brand-structure-name" title={title}>
      <span className="brand-structure-label">{label}</span>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${url}`} title={url}>
          <ArrowUpRight size={12} aria-hidden />
        </a>
      ) : null}
      {extra ? <small>{extra}</small> : null}
    </span>
  );
}

function Nodes({ nodes }: { nodes: StructureNode[] }) {
  const shown = nodes.slice(0, MAX_CHILDREN);
  return (
    <ul className="brand-structure-list">
      {shown.map((node) =>
        node.children.length ? (
          <li key={node.path}>
            <details>
              <summary className="brand-structure-row">
                <Name label={`${node.name}/`} url={node.url} title={node.path} />
                <Cells node={node} />
              </summary>
              <Nodes nodes={node.children} />
            </details>
          </li>
        ) : (
          <li key={node.path} className="brand-structure-row is-page">
            <Name label={node.name} url={node.url} title={node.path} />
            <Cells node={node} />
          </li>
        ),
      )}
      {nodes.length > shown.length ? <li className="brand-structure-more">… y {fmt(nodes.length - shown.length)} más en este nivel</li> : null}
    </ul>
  );
}

function Group({ group }: { group: StructureGroup }) {
  return (
    <details className="brand-structure-group">
      <summary className="brand-structure-row">
        <Name label={group.label} url={group.sitemap} extra={group.lastmod ? `mod. ${when(group.lastmod)}` : undefined} />
        <Cells node={group.root} />
      </summary>
      <Nodes nodes={group.root.children} />
    </details>
  );
}

export function PageStructurePanel({ structure, brandName, marketLabel }: { structure: Structure; brandName: string; marketLabel: string | null }) {
  const { totals, sitemap } = structure;
  if (!sitemap || !structure.available)
    return (
      <Notice tone="info">
        La estructura sigue los sitemaps del último crawl publicado y {brandName} todavía no tiene uno que los incluya. Aparecerá con el próximo crawl publicado.
      </Notice>
    );
  return (
    <>
      <p className="brand-coverage">
        <Info size={15} aria-hidden />
        {`${fmt(totals.declared)} URL en ${fmt(sitemap.files)} sitemaps (crawl del ${when(sitemap.completedAt)}); ${fmt(totals.declaredWithClicks)} con clics en la muestra de Search Console.${totals.outsidePages ? ` ${fmt(totals.outsidePages)} páginas con datos no están en ningún sitemap (${fmt(totals.outsideClicks)} clics).` : ""}${totals.unreadable ? ` ${fmt(totals.unreadable)} sitemaps no se pudieron leer.` : ""}${sitemap.truncated ? " El sitio declara más URL de las publicadas: la estructura está recortada." : ""}${!sitemap.detailed ? " Crawl anterior al detalle por sitemap: todas las URL van en un grupo." : ""}${marketLabel ? ` Clics de ${marketLabel}; los sitemaps cubren todos los idiomas.` : ""}`}
      </p>
      <div className="brand-structure">
        <div className="brand-list-head brand-structure-row" aria-hidden>
          <span>Sitemap › carpeta › página</span>
          <span>Páginas</span>
          <span>Con clics</span>
          <span>Clics</span>
          <span>Cuota</span>
          <span>Posición</span>
        </div>
        {structure.groups.map((group) => (
          <Group key={group.sitemap} group={group} />
        ))}
        {structure.outside ? (
          <div className="brand-structure-outside">
            <Group group={structure.outside} />
          </div>
        ) : null}
      </div>
    </>
  );
}
