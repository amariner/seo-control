import { describe, expect, it } from "vitest";
import { EDITORIAL_SECTIONS, PILOT_PROJECTS, isSectionPost, sectionPageRegex } from "./index";

const trendbook = EDITORIAL_SECTIONS.porcelanosa!;
const blog = EDITORIAL_SECTIONS.noken!;

describe("secciones editoriales (D-095)", () => {
  it("cubren las marcas del piloto", () => {
    for (const brand of PILOT_PROJECTS) expect(EDITORIAL_SECTIONS[brand.slug], brand.slug).toBeDefined();
  });

  it("reconocen los posts con el idioma delante o detrás de la carpeta", () => {
    expect(isSectionPost("https://www.porcelanosa.com/trendbook/tendencias-banos-2026/", trendbook)).toBe(true);
    expect(isSectionPost("https://www.porcelanosa.com/trendbook/fr/cuisines-modernes-2026/", trendbook)).toBe(true);
    expect(isSectionPost("https://www.noken.com/es/blog/distribucion-planos-banos", blog)).toBe(true);
    expect(isSectionPost("https://www.noken.com/en_gb/blog/bathroom-layout-planning", blog)).toBe(true);
    expect(isSectionPost("https://www.xtone-surface.com/en/blog/registration-ii-xtone-awards/", blog)).toBe(true);
  });

  it("descartan portadas, listados, taxonomías, archivos por fecha y otras carpetas", () => {
    for (const url of [
      "https://www.porcelanosa.com/trendbook/",
      "https://www.porcelanosa.com/trendbook/us/",
      "https://www.noken.com/es/blog/",
      "https://www.xtone-surface.com/blog/page/2/",
      "https://www.noken.com/es/blog/categoria/banos/",
      "https://www.gama-decor.com/blog/2026/",
      "https://www.porcelanosa.com/pavimentos/gres-porcelanico/",
      "no es una URL",
    ])
      expect(isSectionPost(url, url.includes("trendbook") || url.includes("pavimentos") ? trendbook : blog), url).toBe(false);
  });

  it("filtran Search Console por la carpeta en cualquier nivel, no por un trozo del slug", () => {
    const regex = new RegExp(sectionPageRegex(blog));
    expect(regex.test("https://www.noken.com/es/blog/elegir-inodoro-pequeno")).toBe(true);
    expect(regex.test("https://www.xtone-surface.com/blog/kitchen-colors/")).toBe(true);
    expect(regex.test("https://www.noken.com/es/productos/blog-lavabo")).toBe(false);
  });
});
