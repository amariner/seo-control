import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileDown, RefreshCw, RotateCcw, Save, Trash2 } from "lucide-react";
import { brandSlugSchema, findBrand } from "@seo/contracts";
import { isStaleSnapshot, parsePeriod, reportIdOf, rowKeyFor, type DeckSlide, type ReportSlideCuration } from "@seo/reports";
import { FlashMessages } from "@/components/flash-messages";
import { SubmitButton } from "@/components/submit-button";
import { WorkbenchFrame } from "@/components/workbench-frame";
import { editableReport, viewerReportUrl } from "@/lib/reports";
import { readReports } from "@seo/reports/store";
import { discardSnapshot, regenerateReport, resetReportCuration, saveReportCuration } from "../../actions";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ brand: string; period: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { brand, period } = await params;
  return { title: `${findBrand(brand)?.name ?? brand} · ${parsePeriod(period)?.label ?? period} · Informes` };
}

const when = (iso: string) =>
  new Date(iso).toLocaleString("es-ES", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
const PRIORITIES = [
  ["urgente", "Urgente"],
  ["alta", "Alta"],
  ["media", "Media"],
  ["baja", "Baja"],
] as const;

/**
 * Personalizar un informe (D-076): sobre la versión congelada se decide qué
 * apartados, cifras, gráficos, tablas y filas se muestran, se añade una
 * puntualización por apartado y acciones propias al plan. Las cifras no se
 * editan: se muestran u ocultan.
 */
export default async function ReportEditorPage({ params, searchParams }: Props) {
  const { brand: rawBrand, period: rawPeriod } = await params;
  const slug = brandSlugSchema.safeParse(rawBrand);
  const period = parsePeriod(rawPeriod);
  if (!slug.success || !period) notFound();
  const brand = findBrand(slug.data)!;
  const id = reportIdOf(slug.data, period.id);
  const query = await searchParams;
  const flash = (key: string) => {
    const value = query[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const path = `/informes/${slug.data}/${period.id}`;
  const editable = editableReport(id);
  const meta = readReports().reports[id];

  return (
    <WorkbenchFrame
      eyebrow={`Informes · ${brand.name}`}
      title={`Informe ${period.kind === "quarter" ? "trimestral" : "mensual"} · ${period.label}`}
      description="Elige qué se muestra en el informe del visor y añade las puntualizaciones del equipo SEO. Las cifras vienen de la versión congelada y no se editan."
      crumb={`${brand.name} · ${period.label}`}
      aside={
        <div className="rp-editor-links">
          <Link className="button button-small button-ghost" href={`/informes?marca=${slug.data}`}>
            <ArrowLeft size={14} aria-hidden /> Informes de {brand.name}
          </Link>
          {brand.pilot ? (
            <>
              <a className="button button-small" href={viewerReportUrl(slug.data, period.id)} target="_blank" rel="noopener">
                <ExternalLink size={14} aria-hidden /> Presentación
              </a>
              <a className="button button-small" href={viewerReportUrl(slug.data, period.id, true)} target="_blank" rel="noopener">
                <FileDown size={14} aria-hidden /> PDF
              </a>
            </>
          ) : null}
        </div>
      }
    >
      <FlashMessages ok={flash("ok")} error={flash("error")} />

      {!brand.pilot ? (
        <p className="notice">{brand.name} no tiene datos analíticos en V2: entra con la expansión de P11. No hay informe que congelar.</p>
      ) : (
        <section className="wb-card panel rp-status" aria-label="Versión">
          <div>
            <p className="eyebrow">Versión</p>
            {meta?.snapshot ? (
              <>
                <h2>Congelada el {when(meta.snapshot.generatedAt)}</h2>
                <p className="tool-note">
                  Por {meta.snapshot.generatedBy}. Datos reales de GA4 y Search Console hasta el {meta.snapshot.cutoff}; plan editorial y crawl de ese momento.
                  {isStaleSnapshot(meta.snapshot) ? " Se generó con un contrato anterior del informe: regenera para usar el actual." : ""}
                </p>
              </>
            ) : (
              <>
                <h2>Sin congelar</h2>
                <p className="tool-note">El visor calcula este informe en vivo. Congélalo para fijar sus cifras y poder personalizarlo apartado a apartado.</p>
              </>
            )}
          </div>
          <div className="rp-status-actions">
            <form action={regenerateReport}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="returnTo" value={path} />
              <SubmitButton className="button button-primary" pending="Congelando…">
                <RefreshCw size={15} aria-hidden /> {meta?.snapshot ? "Regenerar con datos de hoy" : "Congelar ahora"}
              </SubmitButton>
            </form>
            {meta?.snapshot ? (
              <form action={discardSnapshot}>
                <input type="hidden" name="id" value={id} />
                <SubmitButton className="button button-ghost" pending="Retirando…">
                  <Trash2 size={15} aria-hidden /> Retirar versión
                </SubmitButton>
              </form>
            ) : null}
          </div>
        </section>
      )}

      {editable ? (
        <form action={saveReportCuration} className="rp-editor">
          <input type="hidden" name="id" value={id} />
          <div className="rp-editor-bar">
            <span>
              {editable.curation ? `Última edición: ${when(editable.curation.updatedAt)} · ${editable.curation.updatedBy}` : "Sin puntualizaciones: el informe se muestra completo."}
            </span>
            <SubmitButton className="button button-primary" pending="Guardando…">
              <Save size={15} aria-hidden /> Guardar puntualizaciones
            </SubmitButton>
          </div>

          <ol className="rp-slides">
            {editable.slides.map((slide, index) => (
              <SlideEditor key={slide.id} slide={slide} index={index} curation={editable.curation?.slides[slide.id]} />
            ))}
          </ol>

          <fieldset className="wb-card rp-slide rp-team">
            <legend>
              <span className="rp-slide-num">+</span> Acciones del equipo SEO
            </legend>
            <p className="tool-note">Entran en el plan de acción y en las prioridades del resumen ejecutivo con su prioridad, por delante de las que proponen las reglas. Deja el título vacío para quitar una.</p>
            <div className="rp-team-grid">
              {[...(editable.curation?.actions ?? []), ...Array.from({ length: Math.max(2, 3 - (editable.curation?.actions.length ?? 0)) }, () => null)]
                .slice(0, 12)
                .map((action, index) => (
                  <div className="rp-team-row" key={index}>
                    <label className="field">
                      <span>Prioridad</span>
                      <select className="input" name={`action:${index}:priority`} defaultValue={action?.priority ?? "media"}>
                        {PRIORITIES.map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Acción</span>
                      <input className="input" name={`action:${index}:title`} defaultValue={action?.title ?? ""} maxLength={200} placeholder="p. ej. Redirigir /pt a /pt-pt con 301" />
                    </label>
                    <label className="field">
                      <span>Motivo</span>
                      <input className="input" name={`action:${index}:why`} defaultValue={action?.why ?? ""} maxLength={400} placeholder="La cifra o decisión que la justifica" />
                    </label>
                  </div>
                ))}
            </div>
          </fieldset>

          <div className="rp-editor-bar rp-editor-bar-end">
            <span>Se guarda en local. Para llevarlo al visor desplegado, pide «sube los informes» en el chat.</span>
            <SubmitButton className="button button-primary" pending="Guardando…">
              <Save size={15} aria-hidden /> Guardar puntualizaciones
            </SubmitButton>
          </div>
        </form>
      ) : null}

      {editable?.curation ? (
        <form action={resetReportCuration} className="rp-reset">
          <input type="hidden" name="id" value={id} />
          <SubmitButton className="button button-ghost" pending="Quitando…">
            <RotateCcw size={15} aria-hidden /> Quitar todas las puntualizaciones
          </SubmitButton>
        </form>
      ) : null}
    </WorkbenchFrame>
  );
}

function SlideEditor({ slide, index, curation }: { slide: DeckSlide; index: number; curation?: ReportSlideCuration }) {
  const hiddenMetrics = new Set(curation?.hiddenMetrics ?? []);
  const hiddenLists = new Set(curation?.hiddenLists ?? []);
  const hiddenRows = new Set(curation?.hiddenRows ?? []);
  return (
    <li>
      <fieldset className={`wb-card rp-slide ${curation?.hidden ? "is-hidden" : ""}`}>
        <legend>
          <span className="rp-slide-num">{String(index + 1).padStart(2, "0")}</span> {slide.title}
        </legend>
        <label className="rp-check rp-check-main">
          <input type="checkbox" name={`show:${slide.id}`} defaultChecked={!curation?.hidden} />
          Mostrar este apartado
        </label>
        <p className="rp-source">{slide.source}</p>
        {slide.verdict ? <p className="rp-auto"><strong>{slide.verdict.headline}.</strong> {slide.verdict.detail}</p> : <p className="rp-auto">{slide.note}</p>}
        {slide.reading ? (
          <label className="rp-check rp-reading">
            <input type="checkbox" name={`reading:${slide.id}`} defaultChecked={!curation?.hideReading} />
            <span>
              <strong>Lectura SEO</strong> {slide.reading}
            </span>
          </label>
        ) : null}
        <label className="field rp-note">
          <span>Puntualización del equipo SEO</span>
          <textarea className="textarea" name={`note:${slide.id}`} defaultValue={curation?.note ?? ""} maxLength={1200} rows={2} placeholder="Contexto que las cifras no cuentan: una incidencia conocida, una decisión, qué mirar…" />
        </label>

        {slide.metrics.length ? (
          <div className="rp-group">
            <span className="rp-group-title">Cifras</span>
            <div className="rp-chips">
              {slide.metrics.map((metric) => (
                <label className="rp-chip" key={metric.label}>
                  <input type="checkbox" name={`metric:${slide.id}`} value={metric.label} defaultChecked={!hiddenMetrics.has(metric.label)} />
                  <span>
                    {metric.label} <strong>{metric.value}</strong>
                    {metric.change ? <em className={`tone-${metric.change.tone}`}> {metric.change.text}</em> : null}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {slide.bars || (slide.series && slide.series.length > 1) ? (
          <div className="rp-group">
            <span className="rp-group-title">Gráficos</span>
            <div className="rp-chips">
              {slide.series && slide.series.length > 1 ? (
                <label className="rp-chip">
                  <input type="checkbox" name={`list:${slide.id}`} value="__series" defaultChecked={!hiddenLists.has("__series")} />
                  <span>Evolución de clics del periodo</span>
                </label>
              ) : null}
              {slide.bars ? (
                <label className="rp-chip">
                  <input type="checkbox" name={`list:${slide.id}`} value="__bars" defaultChecked={!hiddenLists.has("__bars")} />
                  <span>{slide.bars.title}</span>
                </label>
              ) : null}
            </div>
          </div>
        ) : null}

        {slide.points?.length ? (
          <p className="tool-note rp-points">Ideas clave: {slide.points.length} apartados. Si ocultas un apartado, su idea clave desaparece también de aquí.</p>
        ) : null}

        {slide.lists.map((list) => (
          <div className="rp-group" key={list.title}>
            <label className="rp-check">
              <input type="checkbox" name={`list:${slide.id}`} value={list.title} defaultChecked={!hiddenLists.has(list.title)} />
              <span className="rp-group-title">Tabla «{list.title}»</span>
              <span className="rp-muted">{list.rows.length} {list.rows.length === 1 ? "fila" : "filas"}</span>
            </label>
            {list.rows.length ? (
              <details className="rp-rows" open={list.rows.some((row) => hiddenRows.has(rowKeyFor(list, row)))}>
                <summary>Elegir filas</summary>
                <table className="rp-rows-table">
                  <thead>
                    <tr>
                      <th><span className="sr-only">Mostrar</span></th>
                      {list.head.map((cell) => (
                        <th key={cell}>{cell}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {list.rows.map((row, rowIndex) => {
                      const key = rowKeyFor(list, row);
                      return (
                        <tr key={`${key}-${rowIndex}`}>
                          <td>
                            <input type="hidden" name={`rowset:${slide.id}`} value={key} />
                            <input type="checkbox" name={`row:${slide.id}`} value={key} defaultChecked={!hiddenRows.has(key)} aria-label={`Mostrar ${row[list.toneColumn === 0 ? 1 : 0] ?? "fila"}`} />
                          </td>
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex}>{cell}</td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </details>
            ) : null}
          </div>
        ))}
      </fieldset>
    </li>
  );
}
