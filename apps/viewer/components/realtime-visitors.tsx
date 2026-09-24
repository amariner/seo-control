"use client";

import { useEffect, useState } from "react";
import { BRANDS } from "@seo/contracts";
import type { RealtimeSnapshot } from "@seo/repository";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const POLL_MS = 60_000;
const RETRY_MS = 10_000;
const number = new Intl.NumberFormat("es-ES", {
  useGrouping: "always" as unknown as boolean,
});
const brandName = (slug: string) =>
  BRANDS.find((brand) => brand.slug === slug)?.name ?? slug;

/**
 * Usuarios activos ahora (D-044). Sondea la API propia cada minuto mientras la
 * pestaña está visible. El punto verde solo parpadea con una lectura real; sin
 * conexión se muestra gris y lo dice.
 */
export function RealtimeVisitors({ project }: { project: string }) {
  const [snapshot, setSnapshot] = useState<RealtimeSnapshot | null>(null);

  useEffect(() => {
    let timer: number | undefined;
    let retry: number | undefined;
    let controller: AbortController | null = null;
    const load = () => {
      window.clearTimeout(retry);
      controller?.abort();
      const current = new AbortController();
      controller = current;
      fetch(`/api/v1/realtime?project=${encodeURIComponent(project)}`, {
        signal: current.signal,
      })
        .then((response) => {
          if (!response.ok) throw new Error(String(response.status));
          return response.json() as Promise<RealtimeSnapshot>;
        })
        .then((body) => setSnapshot(body))
        .catch(() => {
          /* Un fallo puntual (servidor ocupado generando un informe) no debe
             dejar el punto en gris hasta el siguiente minuto. */
          if (!current.signal.aborted) retry = window.setTimeout(load, RETRY_MS);
        });
    };
    const schedule = () => {
      window.clearInterval(timer);
      if (document.visibilityState !== "visible") return;
      load();
      timer = window.setInterval(load, POLL_MS);
    };
    schedule();
    document.addEventListener("visibilitychange", schedule);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(retry);
      controller?.abort();
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [project]);

  const live =
    snapshot?.activeUsers !== null &&
    snapshot?.activeUsers !== undefined &&
    (snapshot.status === "ok" || snapshot.status === "parcial");
  const value = live ? number.format(snapshot.activeUsers!) : "—";
  const label = !snapshot
    ? "Cargando usuarios en tiempo real"
    : live
      ? `${value} usuarios activos en los últimos 30 minutos`
      : "Tiempo real no disponible";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex h-10 items-center gap-2 rounded-md px-2 text-sm whitespace-nowrap text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          tabIndex={0}
        >
          <span
            aria-hidden
            className={cn(
              "size-2 shrink-0 rounded-full",
              live ? "animate-live-blink bg-live" : "bg-graphite",
            )}
          />
          <span className="sr-only">{label}</span>
          <span aria-hidden>
            <strong className="font-semibold text-foreground tabular-nums">
              {value}
            </strong>
            <span className="hidden sm:inline">
              {" "}
              {live ? "activos ahora" : "tiempo real"}
            </span>
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="end" className="max-w-72">
        {snapshot ? (
          <div className="grid gap-1">
            <strong>
              {live
                ? "Usuarios activos · últimos 30 min"
                : "Tiempo real no disponible"}
            </strong>
            <span>{snapshot.note}</span>
            {live && snapshot.brands.length > 1
              ? snapshot.brands.map((brand) => (
                  <span key={brand.slug}>
                    {brandName(brand.slug)}:{" "}
                    {brand.activeUsers === null
                      ? "sin respuesta"
                      : number.format(brand.activeUsers)}
                  </span>
                ))
              : null}
            <span className="opacity-80">
              {snapshot.source} ·{" "}
              {new Date(snapshot.fetchedAt).toLocaleTimeString("es-ES", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        ) : (
          "Cargando…"
        )}
      </TooltipContent>
    </Tooltip>
  );
}
