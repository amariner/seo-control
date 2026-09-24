import { Notice } from "@seo/ui";
import { findLegacyRoute } from "@/lib/legacy-routes";

/**
 * Aviso que aparece cuando alguien llega desde una ruta de V1 cuyo capítulo
 * equivalente todavía no existe. Se renderiza solo si el `?from=` corresponde a
 * una redirección declarada como `partial`: así un enlace antiguo nunca muere en
 * un 404, pero tampoco finge haber llegado a su destino.
 */
export function LegacyNotice({
  from,
}: {
  from: string | string[] | undefined;
}) {
  const route = findLegacyRoute(from);
  if (!route) return null;
  return (
    <Notice tone="warn">
      Vienes de <code>{route.v1Route}</code>, una ruta del dashboard anterior.{" "}
      {route.missing} Está planificado en <strong>{route.phase}</strong> del
      roadmap.
    </Notice>
  );
}
