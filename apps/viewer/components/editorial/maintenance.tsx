import { findBrand } from "@seo/contracts";
import { BOOST_REASONS, CHANGE_LABEL, MAINTENANCE_THRESHOLDS, RETIRE_SIGNALS, type BoostReason, type RecentChange, type RetireSignal } from "@seo/reports/content-maintenance";
import { EmptyState, Notice, StatusBadge, type Tone } from "@seo/ui";
import { ReportDataTable, type ReportDataColumn } from "@seo/ui/data-table";
import type { ReactNode } from "react";
import { boostRows, retireRows, type BrandMaintenance } from "@/lib/content-maintenance";
import "./maintenance.css";

/**
 * «Mantenimiento» del plan editorial (D-095): lo publicado o actualizado, los
 * posts que potenciar y los candidatos a retirar. Solo lectura: las decisiones
 * se toman en el CMS y se siguen desde el chat (D-082, D-090).
 */

const nf = (value: number | null | undefined, digits = 0) => (value === null || value === undefined ? "—" : value.toLocaleString("es-ES", { maximumFractionDigits: digits, useGrouping: "always" as unknown as boolean }));
const day = (value: string) => new Date(value.length === 10 ? `${value}T00:00:00Z` : value).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const nameOf = (slug: string) => findBrand(slug)?.name ?? slug;
const host = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "");
/** «Xtone · nueva estructura de URLs» → «nueva estructura de URLs»: la marca ya encabeza la línea. */
const withoutBrand = (label: string) => label.replace(/^[^·]+·\s*/, "");

const REASON_TONE: Record<BoostReason, Tone> = { pierde: "warn", ctr: "info", primera: "info", segunda: "neutral" };
const SIGNAL_TONE: Record<RetireSignal, Tone> = { "sin-clics": "warn", "sin-impresiones": "neutral" };

function Head({ id, title, children, action }: { id: string; title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <header className="maintenance-head">
      <div>
        <h2 id={id}>{title}</h2>
        <p>{children}</p>
      </div>
      {action}
    </header>
  );
}

function PostCell({ url, path, detail }: { url: string; path: string; detail?: ReactNode }) {
  return (
    <span className="maintenance-cell">
      <a href={url} target="_blank" rel="noopener noreferrer">
        {path}
      </a>
      {detail ? <small>{detail}</small> : null}
    </span>
  );
}

/** Qué hacer según el motivo: una vez, encima de la tabla, en vez de repetirlo en cada fila. */
function Legend<K extends string>({ label, items, tones }: { label: string; items: Record<K, { label: string; action: string }>; tones: Record<K, Tone> }) {
  return (
    <dl className="maintenance-legend" aria-label={label}>
      {(Object.keys(items) as K[]).map((key) => (
        <div key={key}>
          <dt>
            <StatusBadge tone={tones[key]}>{items[key].label}</StatusBadge>
          </dt>
          <dd>{items[key].action}</dd>
        </div>
      ))}
    </dl>
  );
}

export function MaintenanceView({
  brand,
  changes,
  maintenance,
  exportQuery,
}: {
  /** Marca elegida o todas. */
  brand: string;
  changes: RecentChange[];
  /** Una entrada por marca del piloto en el filtro; vacío fuera del piloto. */
  maintenance: BrandMaintenance[];
  /** `?brand=` para las descargas. */
  exportQuery: string;
}) {
  const multi = brand === "all";
  const ok = maintenance.flatMap((item) => (item.status === "ok" ? [{ brand: item.brand, digest: item.digest }] : []));
  const boost = ok.flatMap(({ brand: slug, digest }) => digest.boost.map((candidate) => ({ brand: slug, candidate }))).sort((a, b) => b.candidate.atStake - a.candidate.atStake);
  const retire = ok.flatMap(({ brand: slug, digest }) => (digest.retire.available ? digest.retire.candidates.map((candidate) => ({ brand: slug, candidate })) : []));
  const brandColumn: ReportDataColumn[] = multi ? [{ key: "brand", label: "Marca" }] : [];
  const brandFilter = (names: string[]) => {
    const unique = [...new Set(names)];
    return multi && unique.length > 1 ? [{ key: "brand", label: "Marca", options: unique.map((name) => ({ value: name, label: name })), allLabel: "Todas" }] : [];
  };
  const analytic = maintenance.length > 0;
  const T = MAINTENANCE_THRESHOLDS;

  return (
    <div className="maintenance">
      {/* ------------------------------------------------------------------ */}
      <section className="maintenance-section" aria-labelledby="mantenimiento-cambios">
        <Head id="mantenimiento-cambios" title="Publicados y actualizados">
          Piezas del plan publicadas, nuevas o actualizaciones de un contenido que ya existía, con su resultado en Search Console a 28, 90 y 180 días.
        </Head>
        {!changes.length ? (
          <EmptyState title={`Ninguna pieza publicada en el plan${multi ? "" : ` de ${nameOf(brand)}`} todavía`}>
            Aparecen aquí al marcarlas como publicadas, con fecha, en la hoja del plan o en el visor.
          </EmptyState>
        ) : (
        <ReportDataTable
          id="mantenimiento-cambios"
          caption="Publicados y actualizados"
          searchPlaceholder="Buscar pieza o URL…"
          pageSize={10}
          columns={[
            { key: "date", label: "Publicada" },
            ...brandColumn,
            { key: "title", label: "Pieza" },
            { key: "kind", label: "Cambio" },
            { key: "type", label: "Tipo" },
            { key: "result", label: "Resultado" },
          ]}
          filters={[
            { key: "kind", label: "Cambio", options: Object.values(CHANGE_LABEL).map((label) => ({ value: label, label })), allLabel: "Todos" },
            ...brandFilter(changes.map((item) => item.brand)),
          ]}
          rows={changes.map((item) => ({
            id: item.id,
            searchText: `${item.title} ${item.url ?? ""} ${item.keyword ?? ""}`,
            values: { date: item.publicationDate, brand: item.brand, title: item.title, kind: CHANGE_LABEL[item.kind], type: item.type, result: item.result },
            cells: {
              date: day(item.publicationDate),
              title: (
                <span className="maintenance-cell">
                  <strong>{item.title}</strong>
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                      {host(item.url)}
                    </a>
                  ) : (
                    <small>{item.keyword ? `keyword «${item.keyword}»` : "sin URL"}</small>
                  )}
                </span>
              ),
              kind: <StatusBadge tone={item.kind === "actualizacion" ? "info" : "good"}>{CHANGE_LABEL[item.kind]}</StatusBadge>,
              result: item.result ?? <span className="maintenance-muted">sin medir</span>,
            },
          }))}
          note={
            <>
              Hoja «Plan editorial» del equipo con la curación del workbench y los cambios del visor. Solo aparece lo que el equipo registra en el plan; la medición es la de Search Console de cada URL (D-079).
            </>
          }
        />
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="maintenance-section" aria-labelledby="mantenimiento-potenciar">
        <Head id="mantenimiento-potenciar" title="Posts que potenciar">
          Posts del blog que pierden clics o que tienen clics en juego por la posición de su búsqueda principal sin marca, en los últimos 90 días. Los clics en juego ordenan la lista; no son una previsión.
        </Head>
        {!analytic ? (
          <Notice tone="info">
            {nameOf(brand)} no tiene datos de Search Console en V2 (fuera del piloto): sus posts se repasarán con la expansión de P11.
          </Notice>
        ) : (
          <>
            <ul className="maintenance-coverage">
              {maintenance.map((item) => (
                <li key={item.brand}>
                  <strong>{nameOf(item.brand)}</strong>
                  {item.status !== "ok" ? (
                    <> · {item.status === "error" ? `Search Console no ha respondido (${item.note}). Se vuelve a intentar en la próxima visita.` : item.note}</>
                  ) : (
                    <>
                      {" "}
                      · {item.digest.label}: {nf(item.digest.boost.length)} que potenciar de {nf(item.digest.boostBase)} posts
                      {item.digest.boostScope === "sitemaps" ? ` en los sitemaps del crawl del ${day(item.digest.retire.crawl ?? item.digest.generatedAt)}` : " con impresiones en 12 meses"}
                      {!item.digest.decayComparable && item.digest.migration ? ` · ${withoutBrand(item.digest.migration.label)} el ${day(item.digest.migration.date)}: no se compara con los 90 días anteriores` : ""}
                      {item.digest.coverage.queries.limitReached ? " · búsquedas: cuentan las 25.000 combinaciones con más clics" : ""} · corte del {day(item.digest.cutoff)}.
                    </>
                  )}
                </li>
              ))}
            </ul>
            <Legend label="Qué hacer según el motivo" items={BOOST_REASONS} tones={REASON_TONE} />
            <ReportDataTable
              id="mantenimiento-potenciar"
              caption="Posts que potenciar"
              searchPlaceholder="Buscar post o búsqueda…"
              pageSize={25}
              exportHref={`/api/v1/editorial/export/mantenimiento-potenciar.csv${exportQuery}`}
              exportLabel="Descargar CSV"
              columns={[
                { key: "post", label: "Post" },
                ...brandColumn,
                { key: "reason", label: "Motivo" },
                { key: "query", label: "Búsqueda principal" },
                { key: "clicks", label: "Clics 90 días", numeric: true },
                { key: "atStake", label: "Clics en juego", numeric: true },
              ]}
              filters={[
                { key: "reason", label: "Motivo", options: Object.values(BOOST_REASONS).map(({ label }) => ({ value: label, label })), allLabel: "Todos" },
                ...brandFilter(boost.map((item) => nameOf(item.brand))),
              ]}
              rows={boostRows(boost).map((row, index) => {
                const { candidate } = boost[index]!;
                return {
                  ...row,
                  cells: {
                    post: <PostCell url={candidate.page} path={candidate.path} />,
                    reason: <StatusBadge tone={REASON_TONE[candidate.reason]}>{BOOST_REASONS[candidate.reason].label}</StatusBadge>,
                    query: candidate.topQuery ? (
                      <span className="maintenance-cell">
                        «{candidate.topQuery.query}»<small>posición {nf(candidate.topQuery.position, 1)}</small>
                      </span>
                    ) : (
                      "—"
                    ),
                    clicks: (
                      <span className="maintenance-cell maintenance-number">
                        {nf(candidate.clicks)}
                        <small>antes {nf(candidate.previousClicks)}</small>
                      </span>
                    ),
                    atStake: nf(candidate.atStake),
                  },
                };
              })}
              note={
                <>
                  Search Console, búsquedas sin marca y la curva de CTR del propio sitio (D-036). «Pierde clics»: al menos {T.decayMinPrevious} clics en los 90 días anteriores y una caída del {T.decayDropPct} % o más. El resto: {T.boostMinPotential} o más clics en juego hasta la segunda página.
                </>
              }
            />
          </>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="maintenance-section" aria-labelledby="mantenimiento-retirar">
        <Head id="mantenimiento-retirar" title="Candidatos a retirar">
          Posts que declaran los sitemaps sin clics y con menos de {T.retireMaxImpressions} impresiones en 12 meses. Antes de borrar, comprueba sus enlaces externos: V2 no los tiene hasta conectar SEMrush.
        </Head>
        {!analytic ? (
          <Notice tone="info">{nameOf(brand)} no tiene datos de Search Console en V2 (fuera del piloto).</Notice>
        ) : (
          <>
            <ul className="maintenance-coverage">
              {maintenance.map((item) => {
                if (item.status !== "ok")
                  return (
                    <li key={item.brand}>
                      <strong>{nameOf(item.brand)}</strong> · {item.status === "error" ? "sin datos de Search Console en esta visita." : item.note}
                    </li>
                  );
                const { retire, label, migration } = item.digest;
                return (
                  <li key={item.brand}>
                    <strong>{nameOf(item.brand)}</strong>{" "}
                    {retire.available ? (
                      <>
                        · {label}: {nf(retire.candidates.length)} {retire.candidates.length === 1 ? "candidato" : "candidatos"} de {nf(retire.declared)} posts en los sitemaps del crawl del {day(retire.crawl!)} · {nf(retire.alive)} con tráfico
                        {retire.shortHistory ? ` · ${nf(retire.shortHistory)} con menos de 90 días de datos${migration ? ` (URL nuevas desde el ${day(migration.date)})` : ""}, aún sin juzgar` : ""}
                        {retire.excludedByPlan ? ` · ${nf(retire.excludedByPlan)} fuera por estar publicados en el plan hace menos de 12 meses` : ""}
                        {retire.truncated ? " · inventario parcial: los sitemaps declaran más URL de las que guarda el crawl" : ""}.
                      </>
                    ) : (
                      <>
                        · {retire.missing}
                        {retire.searchConsoleOnly !== null ? ` Search Console ya ve ${nf(retire.searchConsoleOnly)} posts del ${label} sin clics en 12 meses (orientativo: puede contar URL ya retiradas).` : ""} Pídelo en el chat: «Lanza un crawl de {nameOf(item.brand).toLowerCase()}» y después «Publica el crawl de {nameOf(item.brand).toLowerCase()}».
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
            {retire.length ? <Legend label="Qué hacer según la señal" items={RETIRE_SIGNALS} tones={SIGNAL_TONE} /> : null}
            {retire.length ? (
              <ReportDataTable
                id="mantenimiento-retirar"
                caption="Candidatos a retirar"
                searchPlaceholder="Buscar post…"
                pageSize={25}
                exportHref={`/api/v1/editorial/export/mantenimiento-retirar.csv${exportQuery}`}
                exportLabel="Descargar CSV"
                columns={[
                  { key: "post", label: "Post" },
                  ...brandColumn,
                  { key: "signal", label: "Señal" },
                  { key: "yearImpressions", label: "Impresiones 12 meses", numeric: true },
                  { key: "sitemap", label: "Sitemap" },
                ]}
                filters={[
                  { key: "signal", label: "Señal", options: Object.values(RETIRE_SIGNALS).map(({ label }) => ({ value: label, label })), allLabel: "Todas" },
                  ...brandFilter(retire.map((item) => nameOf(item.brand))),
                ]}
                rows={retireRows(retire).map((row, index) => {
                  const { candidate } = retire[index]!;
                  return {
                    ...row,
                    cells: {
                      post: <PostCell url={candidate.page} path={candidate.path} />,
                      signal: <StatusBadge tone={SIGNAL_TONE[candidate.signal]}>{RETIRE_SIGNALS[candidate.signal].label}</StatusBadge>,
                      yearImpressions: nf(candidate.yearImpressions),
                    },
                  };
                })}
                note={<>Inventario: sitemaps del crawl publicado. Cifras: Search Console de los últimos 12 meses. No entran los posts con menos de 90 días de datos ni los publicados en el plan hace menos de 12 meses.</>}
              />
            ) : null}
          </>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="maintenance-section" aria-labelledby="mantenimiento-actuar">
        <Head id="mantenimiento-actuar" title="Cómo actuar">
          Esta pantalla solo muestra. Las decisiones se toman en el CMS y se siguen desde el chat, con responsable, plazo y resultado medido.
        </Head>
        <dl className="maintenance-steps">
          <div>
            <dt>Planificar una actualización</dt>
            <dd>Añade una pieza «Reedición» con la URL del post en la hoja del plan o en la curación del workbench. Al publicarla, aparece arriba con su medición.</dd>
          </div>
          <div>
            <dt>Seguir la decisión</dt>
            <dd>
              En el chat: «¿Qué acciones propone {multi ? "<marca>" : nameOf(brand)}?» y «Sigue la acción editorial:posts-potenciar de {multi ? "<marca>" : nameOf(brand)}: responsable…, plazo…» (o <code>editorial:posts-retirar</code>). Comando: <code>pnpm action:track -- --project {multi ? "<marca>" : brand}</code>. Se ve en la pestaña «Acciones» de la marca.
            </dd>
          </div>
          <div>
            <dt>Retirar un post</dt>
            <dd>En el CMS: redirección 301 al post más cercano o 410 si no hay sustituto. Después, un crawl nuevo lo saca de esta lista.</dd>
          </div>
          <div>
            <dt>Actualizar el inventario</dt>
            <dd>
              «Lanza un crawl de {multi ? "<marca>" : nameOf(brand).toLowerCase()}» y «Publica el crawl…»: <code>pnpm crawl -- --project {multi ? "<marca>" : brand}</code> y <code>pnpm crawl:publish -- --project {multi ? "<marca>" : brand}</code>.
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
