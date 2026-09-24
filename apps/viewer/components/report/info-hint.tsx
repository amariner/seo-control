"use client";

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Fuente y definición de un indicador junto a su título (D-045). Sustituye a la
 * línea de fuente bajo el título sin perder la procedencia: se abre con el
 * ratón, el teclado o un toque.
 */
export function InfoHint({
  title,
  source,
  text,
}: {
  title: string;
  source: string;
  text: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="brand-info-hint"
          aria-label={`Qué mide ${title}: ${source}. ${text}`}
        >
          <Info size={14} aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-72">
        <strong>{source}</strong> · {text}
      </TooltipContent>
    </Tooltip>
  );
}
