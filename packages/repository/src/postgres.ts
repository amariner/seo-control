import type { DashboardFilters, PortfolioFilters } from "@seo/contracts";
import { RepositoryUnavailableError, type MetricsRepository, type PortfolioContext, type RepositoryDescription } from "./contract";

/**
 * Origen PostgreSQL. **No implementado todavía, y falla diciéndolo.**
 *
 * Existe ahora, vacío, a propósito. Un adapter con una sola implementación no
 * demuestra nada: la costura solo está probada cuando hay dos orígenes y el
 * selector funciona. Este es el segundo, y su comportamiento correcto hoy es
 * negarse con un mensaje que dice qué falta.
 *
 * Lo que **no** hace, y es la decisión importante: no cae hacia el sintético
 * cuando no está configurado. Un fallback silencioso convertiría «la base de
 * datos no responde» en «aquí tienes unas cifras», que es la peor mentira
 * posible en esta plataforma. Si alguien pide el origen de base de datos, o lo
 * obtiene o recibe un error accionable.
 *
 * P3.1 completa la conexión y las migraciones; P3.2 rellena estas consultas
 * leyendo del almacén de métricas.
 */
export const POSTGRES_DESCRIPTION: RepositoryDescription = {
  mode: "database",
  label: "Almacén propio (PostgreSQL)",
  disclosure: "Datos propios reconciliados desde GA4 y Search Console, con corte y cobertura declarados por fuente.",
  realData: true,
  connectedSources: [],
  supersededBy: null,
};

const unavailable = (operation: string) =>
  new RepositoryUnavailableError(
    "database",
    `El origen PostgreSQL no está implementado: «${operation}» todavía no tiene consulta. El esquema Drizzle existe desde P0, pero el almacén de métricas se rellena en P3.2.`,
    "Usa el origen sintético (no definas SEO_DATA_SOURCE, o ponlo a «synthetic») hasta que P3.2 esté entregada. No se cae al sintético automáticamente a propósito: un fallback silencioso presentaría cifras inventadas como si fueran reales.",
  );

export function createPostgresRepository(): MetricsRepository {
  return {
    describe: () => POSTGRES_DESCRIPTION,
    async dashboard(_filters: DashboardFilters) {
      throw unavailable("dashboard");
    },
    async portfolio(_filters: PortfolioFilters, _context: PortfolioContext) {
      throw unavailable("portfolio");
    },
  };
}
