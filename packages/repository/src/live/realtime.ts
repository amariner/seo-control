import { PILOT_PROJECTS, type BrandSlug } from "@seo/contracts";
import { resolveLiveBrands } from "./brands";
import {
  ga4RealtimeActiveUsers,
  parseServiceAccount,
  type Env,
} from "./google";

/**
 * Visitas en tiempo real de la cabecera del visor (D-044).
 *
 * Es la única cifra que no sale del informe: usuarios activos en los últimos
 * 30 minutos según GA4 Realtime. Esa API no distingue canal ni sección de la
 * web, así que es el tráfico **total** de la propiedad de cada marca, no el
 * orgánico ni el del mercado filtrado. La etiqueta de la cabecera lo dice.
 *
 * Solo se lee con el origen `live`: con el sintético no hay dato real que
 * enseñar y un número inventado en tiempo real no puede declararse como tal
 * en un punto verde.
 */
export type RealtimeStatus = "ok" | "parcial" | "no_configurado" | "error";

export type RealtimeSnapshot = {
  status: RealtimeStatus;
  activeUsers: number | null;
  brands: Array<{ slug: BrandSlug; activeUsers: number | null }>;
  windowMinutes: 30;
  fetchedAt: string;
  source: "GA4 Realtime";
  note: string;
};

type Reader = (env: Env, propertyId: string) => Promise<number>;

const TTL_MS = 30_000;
const cache = new Map<string, { at: number; value: RealtimeSnapshot }>();

export function realtimeScope(project: string): BrandSlug[] {
  if (project === "all") return PILOT_PROJECTS.map((brand) => brand.slug);
  return PILOT_PROJECTS.some((brand) => brand.slug === project)
    ? [project as BrandSlug]
    : [];
}

export async function readRealtime(
  project: string,
  env: Env = process.env,
  read: Reader = ga4RealtimeActiveUsers,
  now: () => number = Date.now,
): Promise<RealtimeSnapshot> {
  const empty = (status: RealtimeStatus, note: string): RealtimeSnapshot => ({
    status,
    activeUsers: null,
    brands: [],
    windowMinutes: 30,
    fetchedAt: new Date(now()).toISOString(),
    source: "GA4 Realtime",
    note,
  });

  if (env.SEO_DATA_SOURCE?.trim() !== "live")
    return empty(
      "no_configurado",
      "El tiempo real solo se lee con el origen de datos en directo.",
    );
  if (!parseServiceAccount(env))
    return empty("no_configurado", "Falta la cuenta de servicio de GA4.");

  const scope = realtimeScope(project);
  const brands = resolveLiveBrands(env).filter(
    (brand) => scope.includes(brand.slug) && brand.propertyId,
  );
  if (!brands.length)
    return empty(
      "no_configurado",
      "Esta marca no tiene propiedad GA4 conectada.",
    );

  const key = brands.map((brand) => brand.propertyId).join(",");
  const hit = cache.get(key);
  if (hit && now() - hit.at < TTL_MS) return hit.value;

  const results = await Promise.all(
    brands.map(async (brand) => {
      try {
        return {
          slug: brand.slug,
          activeUsers: await read(env, brand.propertyId!),
        };
      } catch {
        return { slug: brand.slug, activeUsers: null };
      }
    }),
  );
  const ok = results.filter((item) => item.activeUsers !== null);
  const value: RealtimeSnapshot = {
    status:
      ok.length === results.length ? "ok" : ok.length ? "parcial" : "error",
    activeUsers: ok.length
      ? ok.reduce((sum, item) => sum + (item.activeUsers ?? 0), 0)
      : null,
    brands: results,
    windowMinutes: 30,
    fetchedAt: new Date(now()).toISOString(),
    source: "GA4 Realtime",
    note:
      ok.length === results.length
        ? "Usuarios activos en los últimos 30 minutos, todo el tráfico."
        : "Alguna propiedad GA4 no respondió; la cifra no incluye esas marcas.",
  };
  // Un fallo total no se cachea: el siguiente sondeo vuelve a intentarlo.
  if (value.status !== "error") cache.set(key, { at: now(), value });
  return value;
}

/** Solo para pruebas. */
export function clearRealtimeCache() {
  cache.clear();
}
