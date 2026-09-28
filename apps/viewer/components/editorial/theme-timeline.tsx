import type { CSSProperties } from "react";
import { EDITORIAL_BRANDS, type EditorialDataset } from "@seo/contracts";
import type { EditorialPlanRow } from "@/lib/brand-report";
import { brandColor } from "@/lib/editorial";

type Theme = EditorialDataset["calendar"]["themes"][number];

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * Temas del semestre del plan general (D-060, D-061): línea de tiempo sobria bajo
 * la tabla. Un mes por línea con su tema, los subtemas como etiquetas suaves y,
 * a la derecha, las piezas del mes con los colores de las marcas que las firman.
 */
export function ThemeTimeline({ themes, pieces, currentMonth }: { themes: Theme[]; pieces: EditorialPlanRow[]; currentMonth: string }) {
  if (!themes.length) return null;
  const sorted = [...themes].sort((a, b) => a.year - b.year || a.month - b.month);
  return (
    <section className="themes" aria-labelledby="temas-titulo">
      <h3 id="temas-titulo">Temas del semestre</h3>
      <ol className="themes-list">
        {sorted.map((theme) => {
          const key = `${theme.year}-${pad(theme.month)}`;
          const state = key < currentMonth ? "is-past" : key === currentMonth ? "is-current" : "is-next";
          const [head, ...rest] = theme.theme.split(/\s+-\s+/);
          const tail = rest.join(" - ");
          const numbered = /^\d+$/.test(tail);
          const monthPieces = pieces.filter((piece) => piece.month === key);
          const brands = EDITORIAL_BRANDS.filter((brand) => monthPieces.some((piece) => piece.brandSlug === brand.slug));
          return (
            <li key={theme.id} className={state} aria-current={state === "is-current" ? "date" : undefined}>
              <span className="themes-rail" aria-hidden />
              <span className="themes-month">
                {new Date(`${key}-01T00:00:00Z`).toLocaleDateString("es-ES", { month: "long", timeZone: "UTC" })}
                {state === "is-current" ? <em>Este mes</em> : null}
              </span>
              <div className="themes-body">
                <strong>
                  {numbered ? `${head} ${tail}` : head}
                  {tail && !numbered ? <span> · {tail}</span> : null}
                </strong>
                <ul className="themes-tags">
                  {theme.subthemes.map((subtheme) => (
                    <li key={subtheme}>{subtheme}</li>
                  ))}
                </ul>
              </div>
              <span className="themes-count" title={brands.map((brand) => `${brand.name}: ${monthPieces.filter((piece) => piece.brandSlug === brand.slug).length}`).join(" · ") || undefined}>
                {brands.length ? (
                  <span className="themes-dots" aria-hidden>
                    {brands.map((brand) => (
                      <i key={brand.slug} style={{ "--brand-color": brandColor(brand.slug) } as CSSProperties} />
                    ))}
                  </span>
                ) : null}
                {monthPieces.length ? `${monthPieces.length} ${monthPieces.length === 1 ? "pieza" : "piezas"}` : "Sin piezas"}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
