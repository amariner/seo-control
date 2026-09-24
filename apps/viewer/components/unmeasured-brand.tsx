import Link from "next/link";
import {
  SOURCE_LABELS,
  findBrand,
  findSite,
  marketPath,
  type BrandSourceMap,
} from "@seo/contracts";
import { Card, Notice } from "@seo/ui";
import { AppShell } from "./app-shell";

/**
 * Portada de una marca elegible que todavía no tiene serie analítica (D-033).
 *
 * Desde que las ocho marcas son seleccionables, elegir Krion tenía que llevar a
 * algún sitio. Podía llevar a un panel de métricas en blanco, pero un panel
 * vacío no distingue «no hay dato» de «el dato es cero», y el repositorio ya
 * declara la diferencia: las fuentes llegan en `no_configurado`, no a cero.
 *
 * Así que la pantalla no intenta ser la portada sin datos: dice qué falta, por
 * qué y hasta cuándo, y enseña lo que de esta marca sí se sabe —los mercados y
 * las fuentes que V1 medía, importados en D-032—. Eso es bastante más que un
 * hueco, y es todo cierto.
 */
export function UnmeasuredBrand({
  slug,
  generatedAt,
}: {
  slug: string;
  generatedAt: string;
}) {
  const brand = findBrand(slug);
  const site = findSite(slug);
  if (!brand) return null;
  const sources = (
    Object.keys(SOURCE_LABELS) as Array<keyof BrandSourceMap>
  ).filter((key) => site?.sources[key]);

  return (
    <AppShell generatedAt={generatedAt}>
      <main className="page" id="contenido">
        <header className="page-heading">
          <div>
            <p className="eyebrow">Marca del grupo · Ola {brand.wave}</p>
            <h1>{brand.name}</h1>
            <p className="lede">
              La serie analítica está pendiente de conexión. El plan editorial
              ya está disponible.
            </p>
          </div>
          <div className="date-context">
            {site?.hosts[0] ?? "Dominio no declarado en V1"}
            <br />
            <strong>Sin fuentes conectadas</strong>
          </div>
        </header>

        <Notice tone="info">
          Plan editorial con datos reales.{" "}
          <Link
            className="ds-evidence"
            href={`/editorial/calendario?brands=${brand.slug}`}
          >
            Ver su actividad editorial
          </Link>{" "}
          ·{" "}
          <Link className="ds-evidence" href="/portfolio">
            Compararla en el conjunto
          </Link>
        </Notice>

        {site ? (
          <section className="section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Cobertura heredada</p>
                <h2>Cobertura registrada</h2>
                <p>Fuentes y mercados importados de la configuración de V1.</p>
              </div>
            </div>
            <div className="two-col">
              <Card className="subpage-card">
                <p className="eyebrow">Fuentes</p>
                <h3>{sources.length} de 4 conectadas en V1</h3>
                <p className="source-list" style={{ marginTop: 12 }}>
                  {sources.map((key) => (
                    <code key={key}>{SOURCE_LABELS[key]}</code>
                  ))}
                </p>
                <p className="lede" style={{ marginTop: 14 }}>
                  Conexión pendiente en V2.{" "}
                  <Link className="section-link" href="/data">
                    Estado de las fuentes →
                  </Link>
                </p>
              </Card>
              <Card className="subpage-card">
                <p className="eyebrow">Mercados</p>
                <h3>{site.markets.length} mercados en V1</h3>
                <ul className="market-chips" style={{ marginTop: 12 }}>
                  {site.markets.map((market) => (
                    <li
                      className="market-chip"
                      key={market.code}
                      title={`${market.label} · ${marketPath(market)} · SEMrush ${market.semrushDatabase}`}
                    >
                      <span aria-hidden>{market.flag}</span>
                      <span>{market.code}</span>
                    </li>
                  ))}
                </ul>
                <p className="lede" style={{ marginTop: 14 }}>
                  Cobertura histórica de la marca.{" "}
                  <Link className="section-link" href="/projects">
                    Ver todas las webs del grupo →
                  </Link>
                </p>
              </Card>
            </div>
          </section>
        ) : null}
      </main>
    </AppShell>
  );
}
