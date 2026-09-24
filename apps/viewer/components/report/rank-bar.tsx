"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type RankSegment = {
  /** Clase de color del tramo: `is-${key}`. */
  key: "top3" | "top20" | "rest";
  label: string;
  count: number;
};

const number = new Intl.NumberFormat("es-ES", {
  useGrouping: "always" as unknown as boolean,
});

/**
 * Reparto de keywords por posición (D-045). Sin leyenda fija: cada tramo
 * enseña su cifra al pasar el ratón o al enfocarlo con el teclado.
 */
export function RankBar({
  segments,
  total,
  unit = "keywords",
  label = "Keywords por posición media en Google",
}: {
  segments: RankSegment[];
  total: number;
  /** Lo que se cuenta en cada tramo, para el tooltip. */
  unit?: string;
  label?: string;
}) {
  const share = (count: number) => (total ? (count / total) * 100 : 0);
  return (
    <div className="brand-rank-bar" role="group" aria-label={label}>
      {segments.map((item) =>
        item.count ? (
          <Tooltip key={item.key}>
            <TooltipTrigger asChild>
              <span
                className={`brand-rank-segment is-${item.key}`}
                style={{ width: `${share(item.count)}%` }}
                tabIndex={0}
                aria-label={`${item.label}: ${number.format(item.count)} ${unit}, ${Math.round(share(item.count))} %`}
              />
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <strong>{item.label}</strong> · {number.format(item.count)} {unit}{" "}
              · {Math.round(share(item.count))} %
            </TooltipContent>
          </Tooltip>
        ) : null,
      )}
    </div>
  );
}
