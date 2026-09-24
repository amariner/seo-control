import { unstable_cache } from "next/cache";
import { liveCutoff } from "@seo/repository";

/**
 * Caché compartida del origen `live` (D-034).
 *
 * Una portada en frío hace ~40 llamadas a Google y tarda 5–12 s. La caché de
 * datos de Next persiste entre instancias en Vercel, así que el primer
 * visitante de cada filtro paga la lectura y el resto no. Dos reglas:
 *
 * - La clave incluye el corte del dato: al cambiar el día, la ventana cambia y
 *   no puede servirse la de ayer como si fuera la de hoy.
 * - Un resultado con alguna fuente caída **no se cachea**. Si se guardara, un
 *   fallo de token de cinco minutos dejaría la tarjeta en «error» seis horas.
 *   Se sirve a quien lo pidió y la siguiente petición vuelve a intentarlo.
 */
const LIVE_REVALIDATE_SECONDS = 6 * 60 * 60;

export async function cachedLive<T>(keyParts: string[], run: () => Promise<T>, healthy: (value: T) => boolean): Promise<T> {
  let unhealthy: { value: T } | null = null;
  try {
    return await unstable_cache(
      async () => {
        const value = await run();
        if (!healthy(value)) {
          unhealthy = { value };
          throw new Error("live: resultado parcial, no se cachea");
        }
        return value;
      },
      ["live", liveCutoff(), ...keyParts],
      { revalidate: LIVE_REVALIDATE_SECONDS, tags: ["live-metrics"] },
    )();
  } catch (error) {
    if (unhealthy) return (unhealthy as { value: T }).value;
    throw error;
  }
}
