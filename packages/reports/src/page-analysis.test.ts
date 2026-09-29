import { describe, expect, it } from "vitest";
import type { BrandReport } from "@seo/contracts";
import { analysePages, canonicalPath, localeOf, pageKindOf, pageTrendOf } from "./page-analysis";

const site = "https://www.example.com";
const page = (path: string, clicks: number, impressions: number, position: number, previousClicks: number | null = null): BrandReport["pages"][number] => ({
  page: `${site}${path}`,
  clicks,
  impressions,
  position,
  ctr: impressions ? (clicks / impressions) * 100 : 0,
  previousClicks,
});
const coverage = (rows: number, previous: number): BrandReport["explorerCoverage"] => ({
  searchQueries: { scope: "non_brand_query_page", rowLimit: 3000, rowsReturned: 0, available: true, limitReached: false },
  pages: { scope: "all_pages", rowLimit: 5000, rowsReturned: rows, available: true, limitReached: false },
  previousPages: { scope: "all_pages", rowLimit: 5000, rowsReturned: previous, available: true, limitReached: false },
});

describe("clasificación de URLs", () => {
  it("separa fichas de categorías con y sin prefijo de idioma", () => {
    expect(pageKindOf(`${site}/en/product/porcelain-slabs/taj-mahal`)).toBe("ficha");
    expect(pageKindOf(`${site}/productos/porcelanico/taj-mahal`)).toBe("ficha");
    expect(pageKindOf(`${site}/en/products/porcelain-slabs/`)).toBe("categoria");
    expect(pageKindOf(`${site}/pl/produkty/`)).toBe("categoria");
    expect(pageKindOf(`${site}/fr/`)).toBe("inicio");
    expect(pageKindOf(`${site}/static/pdfs/catalogs/slabs.pdf`)).toBe("recursos");
    expect(pageKindOf(`${site}/en/blog/kitchen-colors/`)).toBe("blog");
    expect(pageKindOf(`${site}/wp-json`)).toBe("tecnica");
  });

  it("reconoce la carpeta de idioma y la raíz", () => {
    expect(localeOf(`${site}/en/products`)).toBe("en");
    expect(localeOf(`${site}/en-gb/x`)).toBe("en_gb");
    expect(localeOf(`${site}/productos/x`)).toBe("");
  });

  it("une variantes con barra final, mayúsculas y parámetros", () => {
    expect(canonicalPath(`${site}/En/Products/?acabado=SILK`)).toBe("/en/products");
    expect(canonicalPath(`${site}/`)).toBe("/");
  });
});

describe("analysePages", () => {
  const pages = [
    page("/", 900, 9000, 2, 1000),
    page("/en/", 300, 4000, 4, null),
    page("/en", 100, 2000, 5, 800),
    page("/en/products/", 20, 5000, 5, 20),
    page("/blog/a", 0, 300, 14, null),
  ];
  const analysis = analysePages({ pages, explorerCoverage: coverage(pages.length, 4) });

  it("cuenta páginas, clics y concentración de la muestra", () => {
    expect(analysis.visible).toBe(5);
    expect(analysis.previousVisible).toBe(4);
    expect(analysis.withClicks).toBe(4);
    expect(analysis.impressionsOnly).toBe(1);
    expect(analysis.ranks).toEqual({ top3: 1, top10: 3, rest: 1 });
    expect(analysis.top10Share).toBe(100);
  });

  it("compara solo URLs con dato anterior y nunca rellena con cero", () => {
    expect(analysis.comparable).toBe(3);
    expect(analysis.losing).toBe(2);
    expect(analysis.gaining).toBe(0);
    expect(analysis.netClicks).toBe(900 + 100 + 20 - (1000 + 800 + 20));
    expect(analysis.withoutPrevious).toBe(2);
    expect(analysis.withoutPreviousClicks).toBe(300);
  });

  it("detecta variantes de la misma ruta y sus clics repartidos", () => {
    expect(analysis.variantGroups).toBe(1);
    expect(analysis.variantClicks).toBe(100);
    expect(analysis.duplicates[0]).toMatchObject({
      path: "/en",
      main: { url: `${site}/en/`, clicks: 300 },
      variants: [{ url: `${site}/en`, clicks: 100 }],
      mainForm: "slash",
      cells: { slash: { urls: 1, clicks: 300 }, noslash: { urls: 1, clicks: 100 } },
      action: "301 sin barra → con barra",
    });
  });

  it("cruza la ruta con sus formas y propone canonical para los parámetros", () => {
    const withParams = analysePages({
      pages: [page("/p/", 10, 100, 3), page("/p/?color=gris", 2, 50, 4), page("/p/?color=rojo", 1, 20, 4), page("/P", 1, 10, 6)],
      explorerCoverage: coverage(4, 0),
    });
    const [item] = withParams.duplicates;
    expect(item?.cells.params).toMatchObject({ urls: 2, clicks: 3 });
    expect(item?.cells.case).toMatchObject({ urls: 1, clicks: 1 });
    expect(item?.action).toBe("301 con mayúsculas → con barra · Canonical en 2 URLs con parámetros");
  });

  it("clasifica la tendencia sin inventar el dato anterior", () => {
    expect(pageTrendOf({ clicks: 5, previousClicks: 3 })).toBe("ganan");
    expect(pageTrendOf({ clicks: 1, previousClicks: 3 })).toBe("pierden");
    expect(pageTrendOf({ clicks: 3, previousClicks: 3 })).toBe("igual");
    expect(pageTrendOf({ clicks: 3, previousClicks: null })).toBe("sin-dato");
  });

  it("agrupa por tipo y carpeta con la cuota de clics", () => {
    const home = analysis.kinds.find((item) => item.key === "inicio");
    expect(home?.pages).toBe(3);
    expect(analysis.locales.map((item) => item.key)).toEqual(["", "en"]);
    expect(analysis.locales[0]?.label).toBe("Raíz (sin prefijo)");
  });

  it("nombra la raíz con su mercado", () => {
    const named = analysePages({ pages, explorerCoverage: coverage(pages.length, 4) }, "España (raíz)");
    expect(named.locales[0]?.label).toBe("España (raíz)");
  });
});
