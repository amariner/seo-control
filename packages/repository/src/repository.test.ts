import { describe, expect, it } from "vitest";
import { BRAND_SLUGS, type BrandEditorialActivity, type BrandSlug, type PortfolioFilters } from "@seo/contracts";
import { RepositoryUnavailableError, type MetricsRepository, type PortfolioContext } from "./contract";
import { createPostgresRepository } from "./postgres";
import { SYNTHETIC_DESCRIPTION, createSyntheticRepository } from "./synthetic";
import { REPOSITORY_ENV_VAR, isRepositoryMode, resolveRepository } from "./resolve";

/**
 * Pruebas del adapter de repositorio (P3.1).
 *
 * Lo que se prueba aquí no es que el sintético funcione —eso lo cubren los
 * contratos—, sino que la **costura** funciona: que hay dos orígenes, que el
 * selector elige el correcto y, sobre todo, que un origen no disponible falla
 * en vez de caer al sintético en silencio.
 */

const emptyEditorial: BrandEditorialActivity = { calendarEvents: 0, backlogPieces: 0, planPieces: 0, slots: 0, published: 0, scheduled: 0, inProgress: 0 };
const context: PortfolioContext = {
  editorial: Object.fromEntries(BRAND_SLUGS.map((slug) => [slug, emptyEditorial])) as Record<BrandSlug, BrandEditorialActivity>,
  planningYear: 2026,
};
const filters: PortfolioFilters = { brands: [...BRAND_SLUGS], market: "all", period: "28d", compare: "previous" };

describe("origen sintético", () => {
  const repository = createSyntheticRepository();

  it("se declara como no real y dice qué fase lo sustituye", () => {
    const description = repository.describe();
    expect(description.mode).toBe("synthetic");
    expect(description.realData).toBe(false);
    expect(description.connectedSources).toEqual([]);
    expect(description.supersededBy).toBe("P3.2");
  });

  it("su aviso nombra las fuentes que NO están conectadas", () => {
    expect(SYNTHETIC_DESCRIPTION.disclosure).toContain("GA4");
    expect(SYNTHETIC_DESCRIPTION.disclosure).toContain("Search Console");
    expect(SYNTHETIC_DESCRIPTION.disclosure.length).toBeGreaterThan(60);
  });

  it("sirve la portada con el payload del contrato", async () => {
    const dashboard = await repository.dashboard({ project: "all", market: "all", period: "28d" });
    expect(dashboard.mode).toBe("synthetic");
    expect(dashboard.metrics.length).toBeGreaterThan(0);
  });

  it("sirve la visión transversal y respeta el año de planificación del contexto", async () => {
    const portfolio = await repository.portfolio(filters, { ...context, planningYear: 2027 });
    expect(portfolio.brands).toHaveLength(8);
    expect(portfolio.editorialPlanningYear).toBe(2027);
  });

  it("es determinista: dos lecturas del mismo corte devuelven lo mismo", async () => {
    const [first, second] = await Promise.all([repository.portfolio(filters, context), repository.portfolio(filters, context)]);
    expect(first).toEqual(second);
  });
});

describe("origen PostgreSQL", () => {
  const repository = createPostgresRepository();

  it("se declara como origen de dato real, pero sin fuentes conectadas todavía", () => {
    const description = repository.describe();
    expect(description.mode).toBe("database");
    expect(description.realData).toBe(true);
    expect(description.connectedSources).toEqual([]);
  });

  it("falla con un error identificable y un remedio, no con un error genérico", async () => {
    await expect(repository.dashboard({ project: "all", market: "all", period: "28d" })).rejects.toThrow(RepositoryUnavailableError);
    const thrown = await repository.portfolio(filters, context).then(
      () => null,
      (caught: unknown) => caught,
    );
    expect(thrown).toBeInstanceOf(RepositoryUnavailableError);
    const error = thrown as RepositoryUnavailableError;
    expect(error.mode).toBe("database");
    expect(error.message).toContain("P3.2");
    expect(error.remedy).toContain("sintético");
  });

  it("NO devuelve datos sintéticos como sustituto", async () => {
    await expect(repository.dashboard({ project: "all", market: "all", period: "28d" })).rejects.toThrow();
  });
});

describe("selección de origen", () => {
  it("sin variable de entorno usa el sintético", () => {
    expect(resolveRepository({}).describe().mode).toBe("synthetic");
    expect(resolveRepository({ [REPOSITORY_ENV_VAR]: "" }).describe().mode).toBe("synthetic");
    expect(resolveRepository({ [REPOSITORY_ENV_VAR]: "   " }).describe().mode).toBe("synthetic");
  });

  it("elige el origen pedido", () => {
    expect(resolveRepository({ [REPOSITORY_ENV_VAR]: "synthetic" }).describe().mode).toBe("synthetic");
    expect(resolveRepository({ [REPOSITORY_ENV_VAR]: "database" }).describe().mode).toBe("database");
  });

  it("una errata NO cae al sintético: falla diciendo qué valores admite", () => {
    // El fallo que esta capa existe para impedir: creer que se lee dato real.
    expect(() => resolveRepository({ [REPOSITORY_ENV_VAR]: "postgress" })).toThrow(RepositoryUnavailableError);
    try {
      resolveRepository({ [REPOSITORY_ENV_VAR]: "postgress" });
    } catch (caught) {
      const error = caught as RepositoryUnavailableError;
      expect(error.message).toContain("postgress");
      expect(error.message).toContain("synthetic");
      expect(error.remedy).toContain("a propósito");
    }
  });

  it("el origen local se declara pero todavía no se puede usar", () => {
    expect(isRepositoryMode("local")).toBe(true);
    expect(() => resolveRepository({ [REPOSITORY_ENV_VAR]: "local" })).toThrow(/P5/);
  });

  it("reconoce exactamente los tres modos declarados", () => {
    for (const mode of ["synthetic", "local", "database"]) expect(isRepositoryMode(mode), mode).toBe(true);
    for (const mode of ["postgres", "mock", "cloud", ""]) expect(isRepositoryMode(mode), mode).toBe(false);
  });
});

describe("los dos orígenes cumplen la misma interfaz", () => {
  const repositories: Array<[string, MetricsRepository]> = [
    ["synthetic", createSyntheticRepository()],
    ["database", createPostgresRepository()],
  ];

  it("todos exponen describe, dashboard y portfolio", () => {
    for (const [name, repository] of repositories) {
      expect(typeof repository.describe, name).toBe("function");
      expect(typeof repository.dashboard, name).toBe("function");
      expect(typeof repository.portfolio, name).toBe("function");
    }
  });

  it("cada origen declara un modo distinto y una procedencia escrita", () => {
    const modes = repositories.map(([, repository]) => repository.describe().mode);
    expect(new Set(modes).size).toBe(modes.length);
    for (const [name, repository] of repositories) {
      expect(repository.describe().disclosure.length, name).toBeGreaterThan(40);
      expect(repository.describe().label.length, name).toBeGreaterThan(3);
    }
  });
});
