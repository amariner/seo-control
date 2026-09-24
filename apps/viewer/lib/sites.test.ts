import { describe, expect, it } from "vitest";
import { PRIMARY_SITES, findSite } from "@seo/contracts";
import { connectedSourceCount, connectedSources, isTier1, listSites, tier1Count, totalMarkets } from "./sites";

describe("selección de webs de /projects", () => {
  it("sin filtro lista las ocho webs principales", () => {
    expect(listSites("all")).toHaveLength(8);
  });

  it("un proyecto del piloto reduce la lista a ese sitio", () => {
    expect(listSites("noken").map((site) => site.slug)).toEqual(["noken"]);
  });

  it("un filtro que no corresponde a ninguna web no vacía el catálogo", () => {
    // `projectSlugSchema` solo admite el piloto, pero la URL es del usuario:
    // devolver cero fichas dejaría la pantalla en blanco sin explicar por qué.
    expect(listSites("product-finder")).toHaveLength(8);
    expect(listSites("inventado")).toHaveLength(8);
  });

  it("no lista product-finder ni con su propio slug", () => {
    expect(listSites("all").some((site) => site.slug === "product-finder")).toBe(false);
  });

  it("suma los mercados de la vista, no los 61 importados", () => {
    expect(totalMarkets(listSites("all"))).toBe(58);
    expect(totalMarkets(listSites("porcelanosa"))).toBe(18);
  });
});

describe("cobertura de Tier 1", () => {
  it("cuenta solo los cinco mercados navegables", () => {
    // Porcelanosa tiene 18 mercados, pero `en` y `fra` son internacionales y
    // no son Tier 1 aunque su idioma coincida con uno que sí lo es.
    expect(tier1Count(findSite("porcelanosa")!)).toBe(5);
    expect(tier1Count(findSite("krion")!)).toBe(5);
    expect(tier1Count(findSite("xtone")!)).toBe(1);
  });

  it("`en` no es Tier 1 aunque `uk` lo sea", () => {
    expect(isTier1("en")).toBe(false);
    expect(isTier1("uk")).toBe(true);
  });

  it("no distingue mayúsculas: los códigos de V1 vienen en minúscula", () => {
    expect(isTier1("es")).toBe(true);
    expect(isTier1("ES")).toBe(true);
  });

  it("ningún sitio declara más mercados de Tier 1 que mercados", () => {
    for (const site of PRIMARY_SITES) expect(tier1Count(site)).toBeLessThanOrEqual(site.markets.length);
  });
});

describe("fuentes conectadas en V1", () => {
  it("cuenta las cuatro del piloto y solo GA4 en Krion", () => {
    expect(connectedSourceCount(findSite("porcelanosa")!)).toBe(4);
    expect(connectedSourceCount(findSite("krion")!)).toBe(1);
    expect(connectedSources(findSite("xtone")!)).toEqual(["ga4", "gsc"]);
  });

  it("mantiene el orden del catálogo de fuentes en todas las fichas", () => {
    for (const site of PRIMARY_SITES) {
      const keys = connectedSources(site);
      expect([...keys]).toEqual(["ga4", "gsc", "semrush", "siteAudit"].filter((key) => keys.includes(key as never)));
    }
  });
});
