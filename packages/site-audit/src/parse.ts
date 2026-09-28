import { NodeType, parse, type HTMLElement, type Node, type TextNode } from "node-html-parser";
import { normalizeUrl } from "./sitemap";

/** Lo que el análisis on-page extrae de una página HTML (D-070). */
export type PageFacts = {
  title: string | null;
  description: string | null;
  h1: string[];
  h2Count: number;
  canonical: string | null;
  robotsMeta: string | null;
  lang: string | null;
  hreflang: Array<{ lang: string; href: string }>;
  images: number;
  imagesWithoutAlt: number;
  wordCount: number;
  internalLinks: string[];
  externalLinks: number;
  nofollowLinks: number;
  schemaTypes: string[];
  openGraph: boolean;
};

const clean = (value: string | undefined | null) => {
  const text = value?.replace(/\s+/g, " ").trim();
  return text ? text : null;
};

function schemaTypes(json: string): string[] {
  const types: string[] = [];
  const visit = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    const type = record["@type"];
    if (typeof type === "string") types.push(type);
    else if (Array.isArray(type)) types.push(...type.filter((item): item is string => typeof item === "string"));
    if (record["@graph"]) visit(record["@graph"]);
  };
  try {
    visit(JSON.parse(json));
  } catch {
    /* JSON-LD mal formado: se ignora, no rompe el crawl. */
  }
  return types;
}

export function parsePage(html: string, pageUrl: string): PageFacts {
  const root = parse(html, { comment: false, blockTextElements: { script: true, style: true, noscript: false, pre: true } });
  const host = new URL(pageUrl).hostname.toLowerCase();
  const meta = (name: string) => clean(root.querySelector(`meta[name="${name}" i]`)?.getAttribute("content"));
  const internal = new Set<string>();
  let externalLinks = 0;
  let nofollowLinks = 0;
  for (const anchor of root.querySelectorAll("a[href]")) {
    const href = anchor.getAttribute("href") ?? "";
    if (/^(mailto|tel|javascript):/i.test(href)) continue;
    const url = normalizeUrl(href, pageUrl);
    if (!url) continue;
    if (/nofollow/i.test(anchor.getAttribute("rel") ?? "")) nofollowLinks += 1;
    if (new URL(url).hostname === host) internal.add(url);
    else externalLinks += 1;
  }
  const images = root.querySelectorAll("img");
  const body = root.querySelector("body");
  const types = root.querySelectorAll('script[type="application/ld+json"]').flatMap((node) => schemaTypes(node.textContent));
  const title = clean(root.querySelector("title")?.textContent);
  // El texto visible excluye scripts y estilos; cabecera y pie cuentan, como en cualquier auditoría on-page.
  for (const node of (body ?? root).querySelectorAll("script, style, noscript, template, svg")) node.remove();
  // Se recorren los nodos de texto uno a uno: `textContent` pega el texto de elementos contiguos («OtraFuera»).
  const chunks: string[] = [];
  const walk = (node: HTMLElement | Node) => {
    if (node.nodeType === NodeType.TEXT_NODE) chunks.push((node as TextNode).text);
    else for (const child of node.childNodes) walk(child);
  };
  walk(body ?? root);
  const text = chunks.join(" ");
  return {
    title,
    description: meta("description"),
    h1: root.querySelectorAll("h1").map((node) => clean(node.textContent) ?? ""),
    h2Count: root.querySelectorAll("h2").length,
    canonical: normalizeUrl(root.querySelector('link[rel="canonical" i]')?.getAttribute("href") ?? "", pageUrl),
    robotsMeta: meta("robots"),
    lang: clean(root.querySelector("html")?.getAttribute("lang")),
    hreflang: root
      .querySelectorAll('link[rel="alternate" i][hreflang]')
      .flatMap((node) => {
        const href = normalizeUrl(node.getAttribute("href") ?? "", pageUrl);
        return href ? [{ lang: (node.getAttribute("hreflang") ?? "").toLowerCase(), href }] : [];
      }),
    images: images.length,
    imagesWithoutAlt: images.filter((node) => !node.hasAttribute("alt")).length,
    wordCount: text.split(/\s+/).filter((word) => /\p{L}/u.test(word)).length,
    internalLinks: [...internal],
    externalLinks,
    nofollowLinks,
    schemaTypes: [...new Set(types)],
    openGraph: Boolean(root.querySelector('meta[property="og:title" i]')),
  };
}
