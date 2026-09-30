import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { crawlSitemaps, sitemapUrls, urlTree, type CrawlRun, type SitemapFile, type UrlTreeNode } from "@seo/site-audit";
import { Notice, StatusBadge } from "@seo/ui";
import { SitemapDisclosure } from "./sitemap-disclosure";

/**
 * «Sitemaps encontrados» del crawl: los sitemaps raíz (robots.txt, indicados
 * con `--sitemap` o en la ruta habitual) y, colgando de cada índice, los que
 * declara. Cada uno se abre o despliega la estructura de URL que deduce.
 * Se leen al empezar el crawl; son una foto de ese momento.
 */
const MAX_CHILDREN = 200;
const ORIGIN = { robots: "Declarado en robots.txt", indicado: "Indicado al lanzar el crawl", "ruta-habitual": "Encontrado en la ruta habitual" } as const;
const fmt = (value: number) => value.toLocaleString("es-ES");
const fileName = (url: string) => {
  try {
    const { pathname } = new URL(url);
    return decodeURIComponent(pathname.split("/").filter(Boolean).at(-1) ?? pathname);
  } catch {
    return url;
  }
};
const day = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Madrid" });
};

type Crawled = Map<string, number>;

function UrlLinks({ url, crawled, base }: { url: string; crawled: Crawled; base: string }) {
  const status = crawled.get(url);
  return (
    <span className="sm-links">
      <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${url}`} title={url}>
        <ExternalLink aria-hidden size={13} />
      </a>
      {status === undefined ? (
        <span className="sa-muted">no rastreada</span>
      ) : (
        <Link href={`${base}/url?u=${encodeURIComponent(url)}`} className={status >= 200 && status < 300 ? undefined : "sm-bad"}>
          {status ? `HTTP ${status}` : "sin respuesta"}
        </Link>
      )}
    </span>
  );
}

function TreeNodes({ nodes, crawled, base }: { nodes: UrlTreeNode[]; crawled: Crawled; base: string }) {
  const shown = nodes.slice(0, MAX_CHILDREN);
  return (
    <ul className="sm-tree">
      {shown.map((node) =>
        node.children.length ? (
          <li key={node.path}>
            <details>
              <summary>
                <span className="sm-seg">{node.name}/</span>
                <span className="sm-count">{fmt(node.total)} URL</span>
                {node.url ? <UrlLinks url={node.url} crawled={crawled} base={base} /> : null}
              </summary>
              <TreeNodes nodes={node.children} crawled={crawled} base={base} />
            </details>
          </li>
        ) : (
          <li key={node.path} className="sm-leaf">
            <span className="sm-seg">{node.name}</span>
            {node.url ? <UrlLinks url={node.url} crawled={crawled} base={base} /> : null}
          </li>
        ),
      )}
      {nodes.length > shown.length ? <li className="sm-leaf sa-muted">… y {fmt(nodes.length - shown.length)} más en este nivel (ábrelas en el sitemap)</li> : null}
    </ul>
  );
}

function Structure({ urls, crawled, base }: { urls: string[]; crawled: Crawled; base: string }) {
  if (!urls.length) return <p className="sa-muted">Este sitemap no declara URL.</p>;
  return (
    <>
      {urlTree(urls).map((tree) => (
        <div key={tree.host} className="sm-host">
          <p className="sm-host-head">
            <strong>{tree.host}</strong> · {fmt(tree.root.total)} URL · hasta {fmt(tree.depth)} niveles de carpeta · {fmt(urls.filter((url) => crawled.has(url) && new URL(url).host === tree.host).length)} rastreadas en este crawl
          </p>
          {tree.root.url ? (
            <p className="sm-leaf sm-home">
              <span className="sm-seg">/ (portada)</span>
              <UrlLinks url={tree.root.url} crawled={crawled} base={base} />
            </p>
          ) : null}
          <TreeNodes nodes={tree.root.children} crawled={crawled} base={base} />
        </div>
      ))}
    </>
  );
}

function SitemapItem({ file, files, byParent, crawled, base, seen }: { file: SitemapFile; files: SitemapFile[]; byParent: Map<string, SitemapFile[]>; crawled: Crawled; base: string; seen: Set<string> }) {
  seen.add(file.url);
  const urls = file.kind === "ilegible" ? [] : sitemapUrls(files, file.url);
  const children = (byParent.get(file.url) ?? []).filter((child) => !seen.has(child.url));
  const kind = file.kind === "indice" ? <StatusBadge tone="info">Índice</StatusBadge> : file.kind === "urls" ? <StatusBadge>URL</StatusBadge> : <StatusBadge tone="bad">Ilegible</StatusBadge>;
  const head = (
    <div className="sm-head">
      {kind}
      <div>
        <p className="sm-name" title={file.url}>
          {fileName(file.url)}
        </p>
        <p className="sm-meta">
          {file.kind === "indice" ? `${fmt(file.children.length)} sitemaps · ${fmt(urls.length)} URL` : file.kind === "urls" ? `${fmt(urls.length)} URL` : "No respondió o no es XML"}
          {file.lastmod ? ` · modificado ${day(file.lastmod)}` : ""}
          {file.origin ? ` · ${ORIGIN[file.origin]}` : ""}
        </p>
      </div>
    </div>
  );
  return (
    <li className="sm-item">
      <SitemapDisclosure head={head} href={file.url} disabled={!urls.length}>
        <Structure urls={urls} crawled={crawled} base={base} />
      </SitemapDisclosure>
      {children.length ? (
        <ul className="sm-list sm-children">
          {children.map((child) => (
            <SitemapItem key={child.url} file={child} files={files} byParent={byParent} crawled={crawled} base={base} seen={seen} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function CrawlSitemaps({ run, base, brandName }: { run: CrawlRun; base: string; brandName: string }) {
  const { files, detailed, notRead } = crawlSitemaps(run);
  const crawled: Crawled = new Map(run.pages.map((page) => [page.url, page.status]));
  const byParent = new Map<string, SitemapFile[]>();
  for (const file of files) if (file.parent) byParent.set(file.parent, [...(byParent.get(file.parent) ?? []), file]);
  const roots = files.filter((file) => !file.parent);
  const declared = run.sitemap.urls;
  const inCrawl = declared.filter((url) => crawled.has(url)).length;
  const seen = new Set<string>();

  return (
    <section className="crawl-sitemaps" aria-labelledby="sitemaps-titulo">
      <h2 id="sitemaps-titulo">Sitemaps encontrados</h2>
      <p>
        Leídos al empezar el crawl a partir de robots.txt: de cada índice cuelgan los sitemaps que declara. {fmt(files.length)} ficheros, {fmt(declared.length)} URL declaradas, {fmt(inCrawl)} de ellas rastreadas en este crawl. La estructura ramifica por carpetas las URL que declara cada sitemap.
      </p>
      {!detailed && files.length ? (
        <Notice tone="info">
          Este crawl es anterior al detalle por sitemap: guardó los sitemaps de robots.txt y todas las URL declaradas juntas, sin los sitemaps hijos. El próximo crawl («lanza un crawl de {brandName}») los registrará uno a uno.
        </Notice>
      ) : null}
      {notRead ? <Notice tone="warn">{fmt(notRead)} sitemaps declarados quedaron sin leer por el tope de 60 ficheros por crawl.</Notice> : null}
      {files.length ? (
        <ul className="sm-list">
          {roots.map((file) => (
            <SitemapItem key={file.url} file={file} files={files} byParent={byParent} crawled={crawled} base={base} seen={seen} />
          ))}
        </ul>
      ) : (
        <Notice tone="warn">
          No se encontró ningún sitemap: robots.txt no declara ninguno y no hay en /sitemap_index.xml ni /sitemap.xml. Para indicar uno al lanzar el crawl: <code>pnpm crawl -- --project {run.project} --sitemap https://…/sitemap.xml</code>.
        </Notice>
      )}
    </section>
  );
}
