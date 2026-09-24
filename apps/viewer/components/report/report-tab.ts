const REPORT_TAB_KEYS = [
  "resumen",
  "busquedas",
  "paginas",
  "mercados",
  "migracion",
  "editorial",
] as const;
type ReportTabKey = (typeof REPORT_TAB_KEYS)[number];

/** Resolve both current and V1 URLs identically on the server and during navigation. */
export function resolveReportTab(
  tab: string | null | undefined,
  chapter: string | null | undefined,
  availableTabs: readonly ReportTabKey[] = REPORT_TAB_KEYS,
): ReportTabKey {
  if (availableTabs.some((key) => key === tab)) return tab as ReportTabKey;
  if (chapter === "contenido") return "paginas";
  if (chapter === "demanda") return "busquedas";
  if (chapter === "mercados") return "mercados";
  return "resumen";
}
