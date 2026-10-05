import { describe, expect, it } from "vitest";
import type { DashboardPayload } from "@seo/contracts";
import { getPublishedAudit } from "@seo/site-audit/published";
import { withPublishedCrawls } from "./data";

const crawlRow = { source: "crawl", label: "Crawl aprobado", status: "no_configurado", lastValidSnapshot: null, cutoff: null, coverage: 0, note: "El crawl vive en el workbench local." } as const;
const payload = (sources: DashboardPayload["sources"]) => ({ sources }) as unknown as DashboardPayload;

describe("fila del crawl en las fuentes (D-094)", () => {
  const xtone = getPublishedAudit("xtone");

  it("refleja el resumen publicado de las marcas del filtro, sin firma", () => {
    expect(xtone).not.toBeNull();
    const one = withPublishedCrawls(payload([crawlRow]), { project: "xtone", market: "all", period: "28d" }).sources[0]!;
    expect(one).toMatchObject({ label: "Crawl publicado", status: "correcto", coverage: 1, lastValidSnapshot: xtone!.completedAt });
    expect(one.note).toContain("sin firma");
    // Con todo el piloto, solo XTONE tiene crawl publicado: cobertura parcial y se dice quién falta.
    const all = withPublishedCrawls(payload([crawlRow]), { project: "all", market: "all", period: "28d" }).sources[0]!;
    expect(all.status).toBe("parcial");
    expect(all.coverage).toBeCloseTo(1 / 3);
    expect(all.note).toContain("sin crawl: Porcelanosa, Noken");
  });

  it("deja la fila como estaba si ninguna marca del filtro tiene crawl", () => {
    const untouched = withPublishedCrawls(payload([crawlRow]), { project: "noken", market: "all", period: "28d" }).sources[0]!;
    expect(untouched).toEqual(crawlRow);
  });
});
