import { describe, expect, it } from "vitest";
import { buildBreadcrumb } from "./navigation";

describe("buildBreadcrumb", () => {
  it("nombra la sección en las vistas de primer nivel", () => {
    expect(buildBreadcrumb("/")).toEqual([{ label: "Inicio" }]);
    expect(buildBreadcrumb("/projects")).toEqual([{ label: "Proyectos" }]);
    expect(buildBreadcrumb("/data")).toEqual([{ label: "Datos y cobertura" }]);
  });

  it("añade la marca en la ficha de proyecto", () => {
    expect(buildBreadcrumb("/projects/xtone")).toEqual([
      { label: "Proyectos", href: "/projects" },
      { label: "XTONE" },
    ]);
  });

  it("usa la pestaña editorial como último nivel", () => {
    expect(buildBreadcrumb("/editorial/backlog")).toEqual([
      { label: "Editorial", href: "/editorial/calendario" },
      { label: "Backlog y plan" },
    ]);
  });

  it("cuelga las fichas de detalle de su sección con el título recibido", () => {
    expect(buildBreadcrumb("/reports/r-1", "Informe mensual")).toEqual([
      { label: "Informes", href: "/reports" },
      { label: "Informe mensual" },
    ]);
    expect(buildBreadcrumb("/issues/i-1", "Canonical roto")).toEqual([
      { label: "Proyectos", href: "/projects" },
      { label: "Canonical roto" },
    ]);
    expect(buildBreadcrumb("/queries/azulejos", "azulejos")).toEqual([
      { label: "Evidencias", href: "/insights" },
      { label: "azulejos" },
    ]);
  });

  it("no inventa un último nivel sin título", () => {
    expect(buildBreadcrumb("/reports/r-1")).toEqual([{ label: "Informes" }]);
  });
});
