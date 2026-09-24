import { privateJson } from "@/lib/http";
import { getPortfolio, portfolioFiltersFromUrl } from "@/lib/portfolio";

/**
 * Visión transversal del grupo (P2.2). Acepta el mismo estado de filtros que la
 * pantalla (`brands`, `market`, `period`, `compare`), así que un enlace
 * compartido de `/portfolio` y su payload describen exactamente el mismo corte.
 */
export async function GET(request: Request) {
  return privateJson(await getPortfolio(portfolioFiltersFromUrl(request)));
}
