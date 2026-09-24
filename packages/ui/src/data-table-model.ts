const collator = new Intl.Collator("es", {
  numeric: true,
  sensitivity: "base",
});

export function normalizeReportSearch(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("es")
    .trim();
}

/** Compare raw data, never locale-formatted display strings such as "1.200". */
export function compareReportValues(
  left: string | number,
  right: string | number,
): number {
  return typeof left === "number" && typeof right === "number"
    ? left - right
    : collator.compare(String(left), String(right));
}
