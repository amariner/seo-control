import type { ReportWindow } from "@seo/contracts";
import { resolveReportTab } from "./report-tab";

export type PendingMarket = { code: string; name: string; definition: string };
export type ReportNavigationUpdate = {
  params: Record<string, string | null>;
  market?: PendingMarket;
  period?: ReportWindow;
  tabLabel?: string;
};
export type ReportTarget = {
  query: string;
  market?: PendingMarket;
  period?: ReportWindow;
  tabLabel?: string;
  changes: {
    market: boolean;
    period: boolean;
    tab: boolean;
    refresh?: boolean;
  };
};
export type ReportPendingScope = "selection" | "market" | "period" | "fixed";
const periodKeys = ["range", "from", "to", "cmp", "cfrom", "yoy"];
const defaults: Record<string, string> = {
  market: "all",
  range: "90d",
  cmp: "anterior",
  yoy: "fecha",
};
const value = (params: URLSearchParams, key: string) =>
  params.get(key) ?? defaults[key] ?? "";

/** Merge into the latest requested URL so rapid market/date choices do not undo each other. */
export function reportNavigationTarget(
  appliedQuery: string,
  previous: ReportTarget | null,
  update: ReportNavigationUpdate,
): ReportTarget {
  const applied = new URLSearchParams(appliedQuery);
  const next = new URLSearchParams(previous?.query ?? appliedQuery);
  for (const [key, entry] of Object.entries(update.params)) {
    if (entry === null) next.delete(key);
    else next.set(key, entry);
  }
  const changes = {
    market: value(next, "market") !== value(applied, "market"),
    period: periodKeys.some((key) => value(next, key) !== value(applied, key)),
    tab:
      resolveReportTab(next.get("tab"), next.get("chapter")) !==
      resolveReportTab(applied.get("tab"), applied.get("chapter")),
  };
  return {
    query: next.toString(),
    changes,
    market: changes.market ? (update.market ?? previous?.market) : undefined,
    period: changes.period ? (update.period ?? previous?.period) : undefined,
    tabLabel: changes.tab ? (update.tabLabel ?? previous?.tabLabel) : undefined,
  };
}

export function reportZonePending(
  scope: ReportPendingScope,
  target: ReportTarget | null,
): boolean {
  if (!target || scope === "fixed") return false;
  if (target.changes.refresh) return true;
  if (scope === "period") return target.changes.period;
  if (scope === "market") return target.changes.market;
  return target.changes.market || target.changes.period;
}

export function reportPendingMessage(target: ReportTarget): string {
  if (target.changes.market && target.market)
    return `Actualizando datos de ${target.market.name}…`;
  if (target.changes.period) return "Actualizando el periodo seleccionado…";
  if (target.changes.tab && target.tabLabel)
    return `Abriendo ${target.tabLabel.toLowerCase()}…`;
  return "Actualizando los datos…";
}
