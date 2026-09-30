import { describe, expect, it } from "vitest";
import type { BrandReport, SiteAuditSummary } from "@seo/contracts";
import { pageStructure } from "./page-structure";

const page = (url: string, clicks: number, impressions = clicks * 10, position = 5) => ({ page: url, clicks, impressions, ctr: 0, position, previousClicks: null });
const report = (pages: ReturnType<typeof page>[]) => ({ pages }) as unknown as BrandReport;
const file = (url: string, urls: string[], parent: string | null = "https://e.com/sitemap_index.xml") => ({ url, parent, kind: urls.length ? "urls" : "indice", lastmod: null, urls });
const audit = (files: ReturnType<typeof file>[]) =>
  ({ runId: "r1", completedAt: "2026-09-30T08:50:00.000Z", sitemap: { files, detailed: true, truncated: false } }) as unknown as SiteAuditSummary;

describe("estructura del sitio (D-087)", () => {
  const structure = pageStructure(
    report([page("https://e.com/", 50), page("https://e.com/es/producto/a/", 30, 100, 4), page("https://e.com/es/producto/b", 10, 100, 8), page("https://e.com/es/viejo/", 5)]),
    audit([
      file("https://e.com/sitemap_index.xml", [], null),
      file("https://e.com/es-pages-sitemap.xml", ["https://e.com/", "https://e.com/es/"]),
      file("https://e.com/es-productos-sitemap.xml", ["https://e.com/es/producto/a/", "https://e.com/es/producto/b/", "https://e.com/es/producto/c/"]),
    ]),
  );

  it("agrupa por sitemap en el orden del índice", () => {
    expect(structure.available).toBe(true);
    expect(structure.sitemap?.index).toBe("https://e.com/sitemap_index.xml");
    expect(structure.groups.map((group) => [group.label, group.root.pages, group.root.clicks])).toEqual([
      ["es-pages-sitemap.xml", 2, 50],
      ["es-productos-sitemap.xml", 3, 40],
    ]);
  });

  it("ramifica cada sitemap por carpeta y cruza los clics sin depender de la barra final", () => {
    const [pages, products] = structure.groups;
    expect(pages!.root.children.map((node) => node.name)).toEqual(["/ (portada)", "es"]);
    const producto = products!.root.children[0]!;
    expect([producto.name, producto.pages, producto.withClicks, producto.clicks, producto.position]).toEqual(["es/producto", 3, 2, 40, 6]);
  });

  it("deja aparte las páginas con datos que ningún sitemap declara", () => {
    expect(structure.outside?.root.pages).toBe(1);
    expect(structure.totals).toMatchObject({ declared: 5, declaredWithClicks: 3, outsidePages: 1, outsideClicks: 5 });
  });

  it("sin sitemaps publicados no hay estructura", () => {
    expect(pageStructure(report([page("https://e.com/en/a/", 3)]), null).available).toBe(false);
  });
});
