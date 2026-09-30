/** Formatos compartidos por el informe del proyecto y el repaso de acciones. */

export const nf = (value: number | null, digits = 0) =>
  value === null
    ? "—"
    : new Intl.NumberFormat("es-ES", {
        maximumFractionDigits: digits,
        useGrouping: "always" as unknown as boolean,
      }).format(value);
export const pct = (value: number | null, digits = 1) =>
  value === null ? "—" : `${nf(value, digits)} %`;
export const change = (value: number | null, base: number | null) =>
  value === null || base === null || base === 0
    ? null
    : ((value - base) / Math.abs(base)) * 100;
export const signed = (value: number, digits = 1, unit = " %") =>
  `${value > 0 ? "+" : value < 0 ? "−" : ""}${nf(Math.abs(value), digits)}${unit}`;
/** «A», «A y B», «A, B y C»; «e» ante sonido /i/ («Portugal e Italia»). */
export const listOf = (items: string[]) => {
  if (items.length <= 1) return items[0] ?? "";
  const last = items.at(-1)!;
  const and = /^h?[ií](?![aeoáéó])/i.test(last) ? "e" : "y";
  return `${items.slice(0, -1).join(", ")} ${and} ${last}`;
};
export const pathOf = (url: string) => {
  try {
    return decodeURIComponent(new URL(url, "https://x").pathname);
  } catch {
    return url;
  }
};
