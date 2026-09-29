import type { EditorialPlanRow } from "./rows";

/**
 * «Resultado de lo publicado» (P3.5, D-079): las piezas publicadas con su
 * medición real de Search Console en 28, 90 y 180 días frente a la misma
 * ventana antes de publicar. Sin cálculo en el cliente: lo trae el dataset.
 */
const nf = (value: number) => new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(value);
const day = (value: string) => new Date(`${value}T00:00:00Z`).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const CONFIDENCE = { alta: "Confianza alta", media: "Confianza media", baja: "Confianza baja" } as const;

export function PlanMeasurements({ rows, showBrand = true }: { rows: EditorialPlanRow[]; showBrand?: boolean }) {
  const measured = rows.filter((row) => row.measurements?.length).sort((a, b) => (b.publicationDate ?? "").localeCompare(a.publicationDate ?? ""));
  if (!measured.length) return null;
  const cutoff = measured.flatMap((row) => row.measurements ?? []).find((item) => item.cutoff)?.cutoff;
  return (
    <section className="plan-measure" aria-labelledby="plan-measure-title">
      <div className="plan-measure-head">
        <h3 id="plan-measure-title">Resultado de lo publicado</h3>
        <p>
          Clics de Search Console de cada pieza publicada en los 28, 90 y 180 días desde su publicación, frente a los mismos días justo antes. Se mide la URL exacta o, sin URL, la keyword.
          {cutoff ? ` Dato hasta el ${day(cutoff)}.` : ""}
        </p>
      </div>
      <div className="plan-measure-wrap" role="region" aria-label="Resultado de lo publicado" tabIndex={0}>
        <table className="plan-measure-table">
          <thead>
            <tr>
              <th>Pieza</th>
              {showBrand ? <th>Marca</th> : null}
              <th>Publicada</th>
              <th>28 días</th>
              <th>90 días</th>
              <th>180 días</th>
            </tr>
          </thead>
          <tbody>
            {measured.map((row) => (
              <tr key={row.id}>
                <td>
                  <strong>{row.title ?? row.keyword ?? "Pieza sin título"}</strong>
                  {row.url ? (
                    <a href={row.url} target="_blank" rel="noreferrer">
                      {row.url.replace(/^https?:\/\/(www\.)?/, "")}
                    </a>
                  ) : (
                    <span>keyword «{row.keyword}»</span>
                  )}
                </td>
                {showBrand ? <td>{row.brand}</td> : null}
                <td>{row.publicationDate ? day(row.publicationDate) : "—"}</td>
                {[28, 90, 180].map((window) => {
                  const item = row.measurements!.find((measurement) => measurement.windowDays === window);
                  if (!item || item.status === "pendiente" || item.result === null)
                    return (
                      <td key={window} className="plan-measure-empty">
                        pendiente
                      </td>
                    );
                  const diff = item.baseline ? Math.round(((item.result - item.baseline) / item.baseline) * 100) : null;
                  return (
                    <td key={window} title={item.interpretation ?? undefined}>
                      <strong>{nf(item.result)}</strong> {item.result === 1 ? "clic" : "clics"}
                      <span className={diff === null ? "" : diff > 0 ? "is-up" : diff < 0 ? "is-down" : ""}>
                        {diff === null ? `antes ${nf(item.baseline ?? 0)}` : `${diff > 0 ? "+" : ""}${diff} % vs. antes`}
                      </span>
                      <small>
                        {item.status === "en_curso" ? `en curso · ${item.coveredDays} de ${window} días` : item.confidence ? CONFIDENCE[item.confidence] : ""}
                      </small>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
