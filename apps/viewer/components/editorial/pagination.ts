type SearchInput = Record<string, string | string[] | undefined>;

/** Filas por página; los tamaños grandes muestran el listado entero de una vez. */
export const PAGE_SIZES: readonly number[] = [10, 25, 50, 100, 500, 1000, 50000];

/** URL pagination leaves the filtered and sorted dataset intact for CSV exports. */
export function editorialPagination(input: SearchInput, total: number) {
  const value = (key: string) => Array.isArray(input[key]) ? input[key]?.[0] : input[key];
  const requestedSize = Number(value("rows"));
  const pageSize = PAGE_SIZES.includes(requestedSize) ? requestedSize : 10;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const requestedPage = Number(value("page"));
  const page = Number.isFinite(requestedPage) ? Math.min(pageCount, Math.max(1, Math.floor(requestedPage))) : 1;
  const start = (page - 1) * pageSize;
  return { page, pageSize, pageCount, start, end: Math.min(start + pageSize, total) };
}
