/**
 * Rutas críticas de V1 y su destino en V2 (P1.3, P2.2 y P2.3).
 *
 * Es la única fuente de la compatibilidad de navegación: `next.config.ts`
 * declara las redirecciones y una prueba (`legacy-routes.test.ts`) falla si las
 * dos listas dejan de coincidir. Antes esto vivía solo en el comentario del
 * config y en la matriz de paridad, que se desincronizan en silencio.
 *
 * `kind` distingue dos situaciones que no se deben confundir:
 *
 * - `equivalent`: el destino cubre la capacidad de V1. No hace falta avisar.
 * - `partial`: el destino es lo más cercano que existe hoy, pero el capítulo
 *   completo llega en una fase posterior. La ruta redirige para no dejar un
 *   enlace muerto **y** el destino lo declara en pantalla; ninguna de las dos
 *   cosas basta por separado. Redirigir en silencio a algo que no es lo mismo
 *   sería peor que un 404.
 */

export type LegacyRoute = {
  /** Valor de `?from=` que el destino reconoce. */
  key: string;
  v1Route: string;
  destination: string;
  kind: "equivalent" | "partial";
  /** Fase en que el destino definitivo existirá. `null` si ya existe. */
  phase: string | null;
  /** Qué falta respecto de V1. Obligatorio en `partial`. */
  missing: string | null;
};

export const LEGACY_ROUTES: LegacyRoute[] = [
  {
    key: "plan-editorial",
    v1Route: "/conjunto/plan-editorial",
    destination: "/editorial/calendario",
    kind: "equivalent",
    phase: null,
    missing: null,
  },
  {
    key: "conjunto",
    v1Route: "/conjunto",
    destination: "/portfolio",
    kind: "equivalent",
    phase: null,
    missing: null,
  },
  {
    key: "pilar-contenidos",
    v1Route: "/tracking/pilar-contenidos",
    destination: "/editorial/backlog",
    kind: "partial",
    phase: "P6",
    missing:
      "V1 redirigía esta ruta a su panel de autoridad temática: árbol comercial, pilares, clusters, gaps y quick wins. En V2 eso llega con P6. Lo más cercano que existe hoy es el backlog editorial con su temática y subtemática, que es donde se decide qué contenido se crea.",
  },
  {
    key: "insights-llm",
    v1Route: "/insights/llm",
    destination: "/insights",
    kind: "partial",
    phase: "P8",
    missing:
      "V1 redirigía esta ruta a su capítulo GEO. En V2 el capítulo GEO/AEO completo —prompts versionados, citación por asistente y visibilidad posclic— llega con P8. Hoy existen las conclusiones aprobadas y el bloque GEO de la portada.",
  },
];

export function findLegacyRoute(from: string | string[] | undefined): LegacyRoute | null {
  const key = Array.isArray(from) ? from[0] : from;
  if (!key) return null;
  const entry = LEGACY_ROUTES.find((route) => route.key === key);
  // Solo se avisa de lo que de verdad pierde capacidad: un destino equivalente
  // no necesita explicarse, y un `from` inventado no debe pintar nada.
  return entry && entry.kind === "partial" ? entry : null;
}
