import type { SiteAuditSeverity } from "@seo/contracts";
import type { CrawledPage, CrawlRun } from "./crawler";
import { auditRun, CHECKS, isIndexable, SEVERITY_ORDER } from "./issues";

/**
 * Diferencias entre dos crawls de un proyecto (P5, D-080): qué incidencias se
 * han corregido, cuáles han aparecido y qué ha cambiado URL a URL.
 *
 * Solo se comparan las URL rastreadas en los dos crawls: una URL que falta en
 * uno de ellos (por el tope o porque el recorrido cambió) no está «corregida»
 * ni «rota», está sin comparar, y se cuenta aparte.
 */

export type CrawlDiffIssue = {
  id: string;
  label: string;
  severity: SiteAuditSeverity;
  before: number;
  after: number;
  /** En URL de los dos crawls: estaba y ya no. */
  fixed: string[];
  /** En URL de los dos crawls: no estaba y ahora sí. */
  introduced: string[];
  /** En URL que solo aparecen en el crawl nuevo. */
  inNewUrls: number;
};

export type CrawlDiffChange = {
  url: string;
  field: "status" | "indexable" | "title" | "canonical" | "h1" | "noindex";
  before: string;
  after: string;
};

export type CrawlDiff = {
  base: { runId: string; startedAt: string; pages: number };
  head: { runId: string; startedAt: string; pages: number };
  urls: { common: number; added: string[]; removed: string[] };
  issues: CrawlDiffIssue[];
  changes: CrawlDiffChange[];
  totals: { fixed: number; introduced: number; severeFixed: number; severeIntroduced: number };
};

const noindex = (page: CrawledPage) => /noindex/i.test(`${page.facts?.robotsMeta ?? ""} ${page.xRobotsTag ?? ""}`);
const text = (value: string | null | undefined) => (value ?? "").trim() || "—";

function fieldChanges(before: CrawledPage, after: CrawledPage): CrawlDiffChange[] {
  const out: CrawlDiffChange[] = [];
  const push = (field: CrawlDiffChange["field"], a: string, b: string) => {
    if (a !== b) out.push({ url: after.url, field, before: a, after: b });
  };
  push("status", String(before.status), String(after.status));
  push("indexable", isIndexable(before) ? "sí" : "no", isIndexable(after) ? "sí" : "no");
  push("noindex", noindex(before) ? "sí" : "no", noindex(after) ? "sí" : "no");
  push("title", text(before.facts?.title), text(after.facts?.title));
  push("canonical", text(before.facts?.canonical), text(after.facts?.canonical));
  push("h1", text(before.facts?.h1[0]), text(after.facts?.h1[0]));
  return out;
}

const FIELD_ORDER: Record<CrawlDiffChange["field"], number> = { status: 0, indexable: 1, noindex: 2, canonical: 3, title: 4, h1: 5 };

export function diffRuns(base: CrawlRun, head: CrawlRun): CrawlDiff {
  const before = new Map(base.pages.map((page) => [page.url, page]));
  const after = new Map(head.pages.map((page) => [page.url, page]));
  const common = [...after.keys()].filter((url) => before.has(url));
  const commonSet = new Set(common);
  const added = [...after.keys()].filter((url) => !before.has(url));
  const removed = [...before.keys()].filter((url) => !after.has(url));

  const auditBefore = auditRun(base).byPage;
  const auditAfter = auditRun(head).byPage;
  const issues: CrawlDiffIssue[] = CHECKS.map((check) => {
    const had = (url: string) => auditBefore.get(url)?.includes(check.id) ?? false;
    const has = (url: string) => auditAfter.get(url)?.includes(check.id) ?? false;
    return {
      id: check.id,
      label: check.label,
      severity: check.severity,
      before: base.pages.filter((page) => had(page.url)).length,
      after: head.pages.filter((page) => has(page.url)).length,
      fixed: common.filter((url) => had(url) && !has(url)),
      introduced: common.filter((url) => !had(url) && has(url)),
      inNewUrls: added.filter(has).length,
    };
  })
    .filter((issue) => issue.before || issue.after)
    .sort(
      (a, b) =>
        SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
        b.introduced.length + b.fixed.length - (a.introduced.length + a.fixed.length),
    );

  const changes = common
    .flatMap((url) => fieldChanges(before.get(url)!, after.get(url)!))
    .sort((a, b) => FIELD_ORDER[a.field] - FIELD_ORDER[b.field] || a.url.localeCompare(b.url));

  const severe = (issue: CrawlDiffIssue) => issue.severity === "critica" || issue.severity === "alta";
  return {
    base: { runId: base.runId, startedAt: base.startedAt, pages: base.pages.length },
    head: { runId: head.runId, startedAt: head.startedAt, pages: head.pages.length },
    urls: { common: commonSet.size, added, removed },
    issues,
    changes,
    totals: {
      fixed: issues.reduce((sum, issue) => sum + issue.fixed.length, 0),
      introduced: issues.reduce((sum, issue) => sum + issue.introduced.length, 0),
      severeFixed: issues.filter(severe).reduce((sum, issue) => sum + issue.fixed.length, 0),
      severeIntroduced: issues.filter(severe).reduce((sum, issue) => sum + issue.introduced.length, 0),
    },
  };
}
