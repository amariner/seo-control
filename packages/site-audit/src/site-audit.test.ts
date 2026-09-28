import { describe, expect, it } from "vitest";
import { SITE_AUDIT_LIMITS } from "@seo/contracts";
import type { CrawledPage, CrawlRun } from "./crawler";
import { urlReport, urlRows } from "./explore";
import { auditRun, isIndexable } from "./issues";
import { parsePage } from "./parse";
import { parseRobots } from "./robots";
import { buildSummary } from "./summary";
import { readSitemaps } from "./sitemap";

const ROBOTS = `
User-agent: *
Allow: /wp-content/uploads/
Disallow: /wp-*
Disallow: /*?
Disallow: /author/

User-agent: GPTBot
Disallow: /
Sitemap: https://example.com/sitemap_index.xml
`;

describe("robots.txt", () => {
  const robots = parseRobots(ROBOTS, "PorcelanosaSEOAuditBot/2.0");
  const allowed = (path: string) => robots.isAllowed(new URL(path, "https://example.com"));
  it("aplica el grupo * con comodines y gana la regla más específica", () => {
    expect(allowed("/productos/")).toBe(true);
    expect(allowed("/wp-admin/")).toBe(false);
    expect(allowed("/wp-content/uploads/a.jpg")).toBe(true);
    expect(allowed("/contacto/?motivo=x")).toBe(false);
    expect(allowed("/author/pepe/")).toBe(false);
  });
  it("usa el grupo propio del agente cuando existe", () => {
    expect(parseRobots(ROBOTS, "GPTBot").isAllowed(new URL("https://example.com/"))).toBe(false);
  });
  it("recoge los sitemaps declarados", () => {
    expect(robots.sitemaps).toEqual(["https://example.com/sitemap_index.xml"]);
  });
});

describe("sitemaps", () => {
  it("sigue índices y normaliza las URL", async () => {
    const files: Record<string, string> = {
      "https://e.com/index.xml": `<sitemapindex><sitemap><loc>https://e.com/a.xml</loc></sitemap></sitemapindex>`,
      "https://e.com/a.xml": `<urlset><url><loc>https://E.com/uno/#x</loc></url><url><loc><![CDATA[https://e.com/dos/]]></loc></url></urlset>`,
    };
    const { urls, files: read } = await readSitemaps(["https://e.com/index.xml"], async (url) => files[url] ?? null);
    expect([...urls]).toEqual(["https://e.com/uno/", "https://e.com/dos/"]);
    expect(read).toBe(2);
  });
});

const HTML = `<!doctype html><html lang="es"><head>
<title>  Superficies de gran formato | XTONE </title>
<meta name="description" content="Descripción de prueba">
<link rel="canonical" href="/pagina/">
<link rel="alternate" hreflang="es" href="https://e.com/pagina/"><link rel="alternate" hreflang="en" href="https://e.com/en/page/">
<meta property="og:title" content="x">
<script type="application/ld+json">{"@graph":[{"@type":"WebPage"},{"@type":["Organization","Brand"]}]}</script>
</head><body><h1>Título</h1><h2>a</h2><p>Hola mundo con cinco palabras</p>
<script>var ignorada = "no cuenta como texto";</script>
<a href="/otra/#top">Otra</a><a href="https://externa.com/">Fuera</a><a href="mailto:a@b.c">Mail</a><a rel="nofollow" href="/nf/">NF</a>
<img src="a.jpg" alt="ok"><img src="b.jpg"></body></html>`;

describe("análisis on-page", () => {
  const facts = parsePage(HTML, "https://e.com/pagina/");
  it("extrae title, description, canonical, lang, hreflang y schema", () => {
    expect(facts.title).toBe("Superficies de gran formato | XTONE");
    expect(facts.description).toBe("Descripción de prueba");
    expect(facts.canonical).toBe("https://e.com/pagina/");
    expect(facts.lang).toBe("es");
    expect(facts.hreflang.map((item) => item.lang)).toEqual(["es", "en"]);
    expect(facts.schemaTypes).toEqual(["WebPage", "Organization", "Brand"]);
    expect(facts.openGraph).toBe(true);
  });
  it("cuenta enlaces, imágenes sin alt y palabras visibles sin scripts", () => {
    expect(facts.internalLinks).toEqual(["https://e.com/otra/", "https://e.com/nf/"]);
    expect(facts.externalLinks).toBe(1);
    expect(facts.nofollowLinks).toBe(1);
    expect(facts.imagesWithoutAlt).toBe(1);
    expect(facts.h1).toEqual(["Título"]);
    expect(facts.wordCount).toBe(11);
  });
});

const page = (url: string, overrides: Partial<CrawledPage> = {}, html = HTML): CrawledPage => ({
  url,
  status: 200,
  error: null,
  redirectTo: null,
  contentType: "text/html",
  xRobotsTag: null,
  responseMs: 400,
  bytes: 1000,
  depth: 1,
  inSitemap: true,
  facts: overrides.status && overrides.status !== 200 ? null : parsePage(html.replace('href="/pagina/"', `href="${url}"`), url),
  ...overrides,
});

const run = (pages: CrawledPage[]): CrawlRun => ({
  schemaVersion: "site-audit-run.v1",
  runId: "test",
  project: "xtone",
  domain: "e.com",
  startUrl: "https://e.com/",
  startedAt: "2026-09-28T10:00:00.000Z",
  completedAt: "2026-09-28T10:05:00.000Z",
  status: "complete",
  error: null,
  config: { maxUrls: 200, concurrency: 2, delayMs: 300, timeoutMs: 20000, respectRobots: true, userAgent: "bot" },
  robots: { found: true, sitemaps: [], crawlDelayMs: null },
  sitemap: { files: 1, urls: pages.filter((item) => item.inSitemap).map((item) => item.url) },
  blockedByRobots: ["https://e.com/?s=x"],
  pages,
  queuedWhenDone: 3,
});

describe("comprobaciones y resumen", () => {
  const pages = [
    page("https://e.com/a/"),
    page("https://e.com/b/"),
    page("https://e.com/otra/", { status: 404 }),
    page("https://e.com/nf/", { status: 301, redirectTo: "https://e.com/a/" }),
    page("https://e.com/lenta/", { responseMs: 3000, inSitemap: false }, HTML.replace('<meta name="description" content="Descripción de prueba">', '<meta name="robots" content="noindex">')),
  ];
  const result = auditRun(run(pages));
  const ids = (url: string) => result.byPage.get(url) ?? [];

  it("detecta errores, redirecciones, enlaces rotos y duplicados", () => {
    expect(ids("https://e.com/otra/")).toContain("http_4xx");
    expect(ids("https://e.com/nf/")).toContain("redirect_internal");
    expect(ids("https://e.com/a/")).toEqual(expect.arrayContaining(["broken_links", "links_to_redirects", "title_duplicate", "hreflang_no_xdefault", "img_missing_alt", "thin_content"]));
    expect(ids("https://e.com/lenta/")).toEqual(expect.arrayContaining(["noindex", "slow_response"]));
    expect(ids("https://e.com/lenta/")).not.toContain("title_duplicate");
    expect(isIndexable(pages[4]!)).toBe(false);
  });

  it("ordena las incidencias por severidad y alcance", () => {
    expect(result.issues[0]!.severity).toBe("critica");
    const order = { critica: 0, alta: 1, media: 2, baja: 3 };
    const ranks = result.issues.map((issue) => order[issue.severity]);
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
  });

  it("el resumen publicable cuenta bien y respeta los topes", () => {
    const summary = buildSummary(run(pages), "2026-09-28T10:10:00.000Z");
    expect(summary.totals).toMatchObject({ crawled: 5, ok: 3, redirects: 1, clientErrors: 1, indexable: 2, noindex: 1, blockedByRobots: 1 });
    expect(summary.pages[0]!.status).toBe(404);
    expect(summary.pages.every((row) => !row.path.startsWith("http"))).toBe(true);
    const many = Array.from({ length: SITE_AUDIT_LIMITS.pages + 20 }, (_, index) => page(`https://e.com/p${index}/`));
    const big = buildSummary(run(many));
    expect(big.pages).toHaveLength(SITE_AUDIT_LIMITS.pages);
    expect(big.pagesTruncated).toBe(true);
    expect(big.issues.every((issue) => issue.sample.length <= SITE_AUDIT_LIMITS.samplesPerIssue)).toBe(true);
  });
});

describe("exploración URL a URL (D-071)", () => {
  const pages = [page("https://e.com/a/"), page("https://e.com/otra/", { status: 404 }), page("https://e.com/nf/", { status: 301, redirectTo: "https://e.com/a/" })];
  const crawl = run(pages);
  it("cuenta enlaces entrantes y explica por qué no es indexable", () => {
    const rows = urlRows(crawl);
    expect(rows.find((row) => row.path === "/otra/")).toMatchObject({ inlinks: 1, indexable: false, notIndexableReason: "Responde 404" });
    expect(rows.find((row) => row.path === "/nf/")!.notIndexableReason).toBe("Redirige (301) a https://e.com/a/");
  });
  it("la ficha ordena incidencias por severidad y marca el estado de cada enlace", () => {
    const report = urlReport(crawl, "https://e.com/a/")!;
    const order = { critica: 0, alta: 1, media: 2, baja: 3 };
    const ranks = report.issues.map((issue) => order[issue.severity]);
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
    expect(report.outlinks.find((link) => link.url === "https://e.com/otra/")).toMatchObject({ status: 404, crawled: true });
    expect(report.redirectedFrom).toEqual(["https://e.com/nf/"]);
    expect(urlReport(crawl, "https://e.com/no-existe/")).toBeNull();
  });
});
