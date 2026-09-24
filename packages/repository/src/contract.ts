import type { BrandEditorialActivity, BrandReport, BrandSlug, DashboardFilters, DashboardPayload, MarketCode, PortfolioFilters, PortfolioPayload } from "@seo/contracts";

/**
 * Adapter de repositorio (P3.1).
 *
 * El problema que resuelve: hoy las pantallas leen del conector sintético
 * llamándolo por su nombre (`getMockDashboard`, `getMockPortfolio`). Cuando P3.2
 * conecte GA4 y Search Console, sustituir esas llamadas significaría tocar cada
 * superficie —y cada superficie es una oportunidad de que una quede leyendo lo
 * sintético sin que nadie lo note—. El criterio del roadmap es explícito:
 * «repository adapter común para sintético/local/cloud **sin bifurcar la UI**».
 *
 * Así que la interfaz es deliberadamente estrecha: devuelve los mismos payloads
 * que ya validan los contratos, ni uno más. No es una capa de acceso a datos
 * genérica ni un ORM; es la costura por la que se cambia el origen.
 *
 * Lo que hace que la costura funcione de verdad es `describe()`. El aviso de
 * «datos sintéticos» que hoy aparece en pantalla no debe estar escrito en el
 * JSX: lo declara el repositorio. El día que el origen cambie, el aviso
 * desaparece solo, y —más importante— si alguien conecta Postgres a medias, la
 * pantalla lo dirá en vez de presentar dato real y sintético mezclados sin
 * distinguirlos (misma regla que D-025).
 */

export type RepositoryMode = "synthetic" | "live" | "local" | "database";

export type RepositoryDescription = {
  mode: RepositoryMode;
  /** Etiqueta corta para la interfaz. */
  label: string;
  /** Frase que la interfaz muestra al usuario. Explica el origen, no lo esconde. */
  disclosure: string;
  /** `false` mientras el origen no sea dato real medido de las propiedades. */
  realData: boolean;
  /** Fuentes conectadas de verdad en este origen. Vacío en el sintético. */
  connectedSources: readonly string[];
  /** Fase que sustituye este origen por el siguiente. `null` si ya es el definitivo. */
  supersededBy: string | null;
};

export type EditorialActivityByBrand = Record<BrandSlug, BrandEditorialActivity>;

/**
 * Lo que el repositorio necesita del lado editorial y no puede leer él mismo.
 *
 * Entra como argumento a propósito: la actividad editorial es dato real de las
 * ocho marcas y su origen no cambia con la fase, mientras la analítica solo
 * cubre el piloto y sí cambia. Mezclar las dos lecturas dentro del adapter
 * ataría el calendario editorial —que ya funciona— al calendario de P3.
 */
export type PortfolioContext = {
  editorial: EditorialActivityByBrand;
  planningYear: number;
};

export type MetricsRepository = {
  describe(): RepositoryDescription;
  /** Portada ejecutiva del piloto. */
  dashboard(filters: DashboardFilters): Promise<DashboardPayload>;
  /** Visión transversal del grupo. */
  portfolio(filters: PortfolioFilters, context: PortfolioContext): Promise<PortfolioPayload>;
  /**
   * Informe ejecutivo de una marca (D-037). Opcional: solo lo ofrece un origen
   * con dato real. El sintético no lo implementa, y la pantalla lo dice en vez
   * de montar un informe ejecutivo sobre cifras inventadas.
   */
  brandReport?(input: BrandReportRequest): Promise<BrandReport>;
  /** Corte del dato del origen: último día cerrado. */
  cutoff?(): string;
};

export type BrandReportRequest = {
  brand: BrandSlug;
  /** `all`, un mercado Tier 1 o uno de los mercados adicionales de la marca (D-039). */
  market: MarketCode | "all" | (string & {});
  range: import("@seo/contracts").ReportRangeInput;
  editorial: ReadonlyArray<{ id: string; month: string | null; title: string; type: string; status: string; keyword: string | null }>;
};

/**
 * Error de origen no disponible. Se distingue de cualquier otro fallo para que
 * la interfaz pueda decir «este origen no está configurado» en vez de «error».
 */
export class RepositoryUnavailableError extends Error {
  readonly mode: RepositoryMode;
  readonly remedy: string;

  constructor(mode: RepositoryMode, message: string, remedy: string) {
    super(message);
    this.name = "RepositoryUnavailableError";
    this.mode = mode;
    this.remedy = remedy;
  }
}
