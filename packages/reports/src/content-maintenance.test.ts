import type { ContentSectionPage, ContentSectionReport, EditorialPieceType, SiteAuditSummary } from "@seo/contracts";
import type { EditorialPlanRow } from "@seo/editorial-ui";
import { describe, expect, it } from "vitest";
import { boostCandidates, maintenanceDigest, recentChanges, retireReview, withoutRecentPlan } from "./content-maintenance";

const HOST = "https://www.xtone-surface.com";
const page = (path: string, values: Partial<ContentSectionPage> = {}): ContentSectionPage => ({
  page: `${HOST}${path}`,
  clicks: 0,
  impressions: 0,
  position: null,
  previousClicks: 0,
  previousImpressions: 0,
  yearClicks: 0,
  yearImpressions: 0,
  topQuery: null,
  potentialClicks: 0,
  ...values,
});
const sample = { available: true, rows: 10, limitReached: false };
const section = (pages: ContentSectionPage[], migrations: ContentSectionReport["migrations"] = []): ContentSectionReport => ({
  generatedAt: "2026-10-05T10:00:00.000Z",
  brand: "xtone",
  section: { label: "Blog", segment: "blog" },
  cutoff: "2026-10-02",
  windows: { year: { start: "2025-10-03", end: "2026-10-02" }, recent: { start: "2026-07-05", end: "2026-10-02" }, previous: { start: "2026-04-06", end: "2026-07-04" } },
  pages,
  coverage: { year: sample, recent: sample, previous: sample, queries: sample },
  migrations,
  sources: [{ source: "gsc", ok: true, note: "" }],
});
const audit = (urls: string[], truncated = false) =>
  ({
    completedAt: "2026-09-30T08:51:33.249Z",
    sitemap: { detailed: true, truncated, files: [{ url: `${HOST}/es-posts-sitemap.xml`, parent: null, kind: "urls", lastmod: null, urls: urls.map((path) => `${HOST}${path}`) }] },
  }) as unknown as SiteAuditSummary;
const row = (values: Partial<EditorialPlanRow> & { id: string }): EditorialPlanRow =>
  ({ status: "Publicado", statusKey: "publicado", writingDate: null, publicationDate: null, type: "Nuevo", brand: "XTONE", market: null, month: null, theme: null, subtheme: null, keyword: null, title: null, url: null, brief: null, ...values }) as EditorialPlanRow;

describe("mantenimiento del plan editorial (D-095)", () => {
  it("últimos cambios: lo publicado hasta hoy, de lo más reciente a lo más antiguo, nuevo o actualización", () => {
    const rows = [
      row({ id: "a", title: "Cocinas 2026", publicationDate: "2026-08-13", url: `${HOST}/blog/cocinas-2026/` }),
      row({ id: "b", title: "Baños", publicationDate: "2026-06-25", type: "Reedición" }),
      row({ id: "c", title: "Programado", publicationDate: "2026-10-20" }),
      row({ id: "d", title: "En redacción", statusKey: "redactando", publicationDate: "2026-09-01" }),
    ];
    const types = new Map<string, EditorialPieceType>([["a", "nuevo"], ["b", "reedicion"]]);
    const changes = recentChanges(rows, types, "2026-10-05");
    expect(changes.map((item) => [item.id, item.kind])).toEqual([["a", "publicacion"], ["b", "actualizacion"]]);
    expect(changes[0]!.result).toBeNull();
  });

  it("potenciar: primero lo que pierde clics; después, clics en juego por posición, hasta la segunda página", () => {
    const pages = [
      page("/blog/pierde/", { clicks: 20, previousClicks: 100, potentialClicks: 5 }),
      page("/blog/top3/", { potentialClicks: 40, topQuery: { query: "a", clicks: 50, impressions: 4000, position: 2.1 } }),
      page("/blog/primera/", { potentialClicks: 300, topQuery: { query: "b", clicks: 10, impressions: 9000, position: 6.4 } }),
      page("/blog/segunda/", { potentialClicks: 120, topQuery: { query: "c", clicks: 1, impressions: 5000, position: 14 } }),
      page("/blog/lejos/", { potentialClicks: 500, topQuery: { query: "d", clicks: 0, impressions: 9000, position: 35 } }),
      page("/blog/poco/", { potentialClicks: 19, topQuery: { query: "e", clicks: 0, impressions: 900, position: 12 } }),
    ];
    const boost = boostCandidates(pages, { decayComparable: true });
    expect(boost.map((item) => [item.path, item.reason, item.atStake])).toEqual([
      ["/blog/primera/", "primera", 300],
      ["/blog/segunda/", "segunda", 120],
      ["/blog/pierde/", "pierde", 80],
      ["/blog/top3/", "ctr", 40],
    ]);
    // Con una migración entre los dos tramos, perder clics no se puede leer.
    expect(boostCandidates(pages, { decayComparable: false }).some((item) => item.reason === "pierde")).toBe(false);
  });

  it("retirar: sin crawl no hay lista, solo el recuento orientativo de Search Console", () => {
    const review = retireReview(section([page("/blog/muerto/", { yearImpressions: 30, previousImpressions: 10 })]), null);
    expect(review).toMatchObject({ available: false, searchConsoleOnly: 1, candidates: [] });
    expect(review.missing).toContain("Sin crawl publicado");
  });

  it("retirar: posts de los sitemaps sin clics en 12 meses; la historia corta y lo vivo no cuentan", () => {
    const review = retireReview(
      section([
        page("/blog/vivo/", { yearClicks: 3, yearImpressions: 50 }),
        page("/blog/visto/", { yearImpressions: 400 }),
        page("/blog/muerto/", { yearImpressions: 60, impressions: 5, previousImpressions: 10 }),
        page("/blog/apagado/", { yearImpressions: 20 }),
        page("/blog/url-nueva/", { yearImpressions: 70, impressions: 70 }),
      ]),
      audit(["/blog/vivo/", "/blog/visto/", "/blog/muerto/", "/blog/apagado", "/blog/url-nueva/", "/blog/sin-indexar/", "/blog/", "/productos/x/"], true),
    );
    expect(review).toMatchObject({ available: true, declared: 6, alive: 2, shortHistory: 1, truncated: true });
    expect(review.candidates.map((item) => [item.path, item.signal])).toEqual([
      ["/blog/apagado", "sin-clics"],
      ["/blog/muerto/", "sin-clics"],
      ["/blog/sin-indexar/", "sin-impresiones"],
    ]);
    // Lo que el plan publicó hace menos de 12 meses no se propone retirar.
    const plan = [row({ id: "p", url: `${HOST}/blog/muerto`, publicationDate: "2026-03-01" }), row({ id: "q", url: `${HOST}/blog/apagado/`, publicationDate: "2024-01-10" })];
    const filtered = withoutRecentPlan(review, plan, "2026-10-05");
    expect(filtered.candidates.map((item) => item.path)).toEqual(["/blog/apagado", "/blog/sin-indexar/"]);
    expect(filtered.excludedByPlan).toBe(1);
  });

  it("resumen: con migración no compara tramos; con crawl, potenciar mira solo los posts de los sitemaps", () => {
    const pages = [
      page("/blog/nueva/", { clicks: 10, previousClicks: 0, potentialClicks: 60, topQuery: { query: "x", clicks: 10, impressions: 3000, position: 9 } }),
      page("/blog/antigua", { clicks: 0, previousClicks: 200, potentialClicks: 0 }),
    ];
    const digest = maintenanceDigest(section(pages, [{ date: "2026-07-23", label: "nueva estructura de URLs" }]), audit(["/blog/nueva/"]));
    expect(digest).toMatchObject({ decayComparable: false, boostScope: "sitemaps", migration: { date: "2026-07-23" }, totals: { posts: 2, clicks: 10, previousClicks: 200 } });
    expect(digest.boost.map((item) => item.path)).toEqual(["/blog/nueva/"]);
    expect(maintenanceDigest(section(pages), null)).toMatchObject({ decayComparable: true, boostScope: "search-console" });
  });
});
