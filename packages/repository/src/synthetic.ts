import { getMockDashboard, getMockPortfolio } from "@seo/contracts/mock";
import type { DashboardFilters, PortfolioFilters } from "@seo/contracts";
import type { MetricsRepository, PortfolioContext, RepositoryDescription } from "./contract";

/**
 * Origen sintético. Es el único operativo hoy y lo dice de sí mismo.
 *
 * No genera nada nuevo: envuelve el conector que ya existía en
 * `@seo/contracts/mock`, cuyas magnitudes están fijadas y cuya agregación pasa
 * por el catálogo de métricas. Lo que aporta es que la pantalla ya no lo llame
 * por su nombre, y que el aviso de procedencia salga de `describe()` en lugar de
 * estar escrito en el JSX.
 */
export const SYNTHETIC_DESCRIPTION: RepositoryDescription = {
  mode: "synthetic",
  label: "Conector sintético",
  disclosure:
    "Las cifras analíticas provienen del conector sintético de validación, no de GA4, Search Console ni SEMrush. Ninguna fuente está conectada todavía: se conectan en P3.2 y P3.3.",
  realData: false,
  connectedSources: [],
  supersededBy: "P3.2",
};

export function createSyntheticRepository(): MetricsRepository {
  return {
    describe: () => SYNTHETIC_DESCRIPTION,
    async dashboard(filters: DashboardFilters) {
      return getMockDashboard(filters);
    },
    async portfolio(filters: PortfolioFilters, context: PortfolioContext) {
      return getMockPortfolio(filters, context.editorial, { planningYear: context.planningYear });
    },
  };
}
