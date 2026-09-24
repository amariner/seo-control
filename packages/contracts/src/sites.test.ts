import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BRAND_SLUGS } from "./taxonomy";
import { PRIMARY_SITES, SITES, SITE_LOCALES, brandsWithoutSite, findSite, findSiteMarket, marketPath, sitesOfBrand } from "./sites";

/**
 * Paridad de la importación contra el snapshot archivado de V1.
 *
 * El snapshot es la entrada real (`data/archive/v1/projects.json`), no una copia
 * escrita a mano: si `sites.ts` pierde un mercado, le cambia un `pathPrefix` o
 * se inventa uno que V1 no tenía, estas pruebas caen. Es lo único que impide
 * que una migración de 61 mercados se degrade sin que nadie lo note.
 */

const ARCHIVE = resolve(dirname(fileURLToPath(import.meta.url)), "../data/archive/v1/projects.json");

type V1Market = { code: string; pathPrefix: string; catalogSlug: string; productCatalogSlug?: string; locale: string; semrushDatabase: string; label: string; flag: string };
type V1Project = {
  key: string;
  label: string;
  sources: { ga4: boolean; gsc: boolean; semrush: boolean; siteAudit: boolean };
  brandTerms: { own: string[]; umbrella: string[] } | null;
  suggestedExclusions: { ownBrand: string[]; competitors: string[]; productModels: string[] } | null;
  markets: V1Market[];
};

const snapshot = JSON.parse(readFileSync(ARCHIVE, "utf8")) as { projects: V1Project[]; marketCount: number };
const v1 = new Map(snapshot.projects.map((project) => [project.key, project]));

/** La vista agregada de V1; en V2 la sirve /portfolio, así que no es un sitio. */
const NOT_A_SITE = ["conjunto"];

describe("importación de los sitios de V1", () => {
  it("importa todas las claves de V1 salvo la vista agregada", () => {
    const expected = snapshot.projects.map((project) => project.key).filter((key) => !NOT_A_SITE.includes(key));
    expect([...SITES.map((site) => site.v1Key)].sort()).toEqual([...expected].sort());
  });

  it("no importa `conjunto`, que no era una web", () => {
    expect(SITES.some((site) => NOT_A_SITE.includes(site.v1Key))).toBe(false);
  });

  it("recupera product-finder, que la migración a ocho marcas había perdido", () => {
    const site = findSite("product-finder");
    expect(site?.brand).toBe("porcelanosa");
    expect(site?.hosts).toHaveLength(2);
    expect(site?.markets.map((market) => market.code)).toEqual(["es", "en", "fr"]);
  });

  it("conserva los 61 mercados de V1, no los cinco de la lista global", () => {
    const total = SITES.reduce((count, site) => count + site.markets.length, 0);
    expect(total).toBe(snapshot.marketCount);
    expect(total).toBe(61);
  });

  it.each(SITES.map((site) => [site.slug, site] as const))("%s conserva los mercados de V1 campo a campo", (_slug, site) => {
    const source = v1.get(site.v1Key)!;
    expect(site.markets.map((market) => ({ ...market }))).toEqual(source.markets.map((market) => ({ ...market })));
  });

  it.each(SITES.map((site) => [site.slug, site] as const))("%s conserva fuentes, términos de marca y exclusiones", (_slug, site) => {
    const source = v1.get(site.v1Key)!;
    expect(site.sources).toEqual(source.sources);
    expect(site.brandTerms ? { own: [...site.brandTerms.own], umbrella: [...site.brandTerms.umbrella] } : null).toEqual(source.brandTerms);
    expect(
      site.suggestedExclusions
        ? {
            ownBrand: [...site.suggestedExclusions.ownBrand],
            competitors: [...site.suggestedExclusions.competitors],
            productModels: [...site.suggestedExclusions.productModels],
          }
        : null,
    ).toEqual(source.suggestedExclusions);
  });

  it("mantiene los mercados de mayor cobertura, que son los que más se degradaban", () => {
    // Estos cuatro son el motivo de la importación: la lista global de cinco
    // dejaba fuera 39 de sus mercados.
    expect(findSite("porcelanosa")!.markets).toHaveLength(18);
    expect(findSite("krion")!.markets).toHaveLength(13);
    expect(findSite("noken")!.markets).toHaveLength(10);
    expect(findSite("gamadecor")!.markets).toHaveLength(7);
  });
});

describe("coherencia del modelo de sitios", () => {
  it("cada sitio cuelga de una marca de la taxonomía", () => {
    for (const site of SITES) expect(BRAND_SLUGS).toContain(site.brand);
  });

  it("no deja ninguna marca sin sitio", () => {
    expect(brandsWithoutSite()).toEqual([]);
  });

  it("Porcelanosa es hoy la única marca con más de un sitio", () => {
    expect(sitesOfBrand("porcelanosa").map((site) => site.slug)).toEqual(["porcelanosa", "product-finder"]);
    for (const brand of BRAND_SLUGS.filter((slug) => slug !== "porcelanosa")) {
      expect(sitesOfBrand(brand)).toHaveLength(1);
    }
  });

  it("hay exactamente una web principal por marca", () => {
    expect(PRIMARY_SITES).toHaveLength(BRAND_SLUGS.length);
    expect(new Set(PRIMARY_SITES.map((site) => site.brand)).size).toBe(BRAND_SLUGS.length);
  });

  it("product-finder queda fuera de las principales: es una herramienta, no la web de una marca", () => {
    expect(findSite("product-finder")!.primary).toBe(false);
    expect(PRIMARY_SITES.some((site) => site.slug === "product-finder")).toBe(false);
  });

  it("los slugs de sitio no se repiten", () => {
    expect(new Set(SITES.map((site) => site.slug)).size).toBe(SITES.length);
  });

  it("los códigos de mercado no se repiten dentro de un sitio", () => {
    for (const site of SITES) {
      expect(new Set(site.markets.map((market) => market.code)).size).toBe(site.markets.length);
    }
  });

  it("todos los idiomas están en la lista declarada", () => {
    for (const site of SITES) {
      for (const market of site.markets) expect(SITE_LOCALES).toContain(market.locale);
    }
  });

  it("solo Butech separa el catálogo de productos del de categorías", () => {
    const withProductCatalog = SITES.filter((site) => site.markets.some((market) => "productCatalogSlug" in market));
    expect(withProductCatalog.map((site) => site.slug)).toEqual(["butech"]);
  });
});

describe("resolución de rutas de mercado", () => {
  it("el código de mercado no siempre es la ruta: Noken sirve UK bajo /en_gb/", () => {
    const uk = findSiteMarket("noken", "uk")!;
    expect(uk.pathPrefix).toBe("en_gb");
    expect(marketPath(uk)).toBe("/en_gb/");
  });

  it("un mercado en la raíz da `/`, no `//`", () => {
    expect(marketPath(findSiteMarket("butech", "es")!)).toBe("/");
  });

  it("la base de SEMrush no siempre es el código: Krion `zh` consulta `cn`", () => {
    expect(findSiteMarket("krion", "zh")!.semrushDatabase).toBe("cn");
  });

  it("devuelve null para sitios y mercados que no existen", () => {
    expect(findSite("conjunto")).toBeNull();
    expect(findSiteMarket("xtone", "de")).toBeNull();
  });
});
