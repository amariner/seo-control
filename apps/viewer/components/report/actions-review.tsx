import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
import { StatusBadge, type Tone } from "@seo/ui";
import { PRIORITY_LABEL, type ActionTab, type Priority, type ReviewSection } from "@seo/reports";

/**
 * Pestaña «Acciones» (D-088): repaso de cada apartado del proyecto con lo que
 * dicen sus datos y las acciones que proponen, por prioridad. Las reglas y
 * sus umbrales están en `packages/reports/src/project-actions.ts`.
 */
const TONE: Record<Priority, Tone> = { urgente: "bad", alta: "warn", media: "neutral", baja: "outline" };
const PRIORITIES: Priority[] = ["urgente", "alta", "media", "baja"];

export function ActionsReview({ sections, href, marketFiltered }: { sections: ReviewSection[]; href: (tab: ActionTab) => string; marketFiltered: boolean }) {
  const all = sections.flatMap((section) => section.actions);
  const count = (priority: Priority) => all.filter((action) => action.priority === priority).length;
  return (
    <>
      <div className="brand-actions-counts" role="list" aria-label="Acciones por prioridad">
        {PRIORITIES.map((priority) => (
          <div key={priority} role="listitem" className={`brand-actions-count is-${priority}`}>
            <strong>{count(priority)}</strong>
            <span>{PRIORITY_LABEL[priority]}</span>
          </div>
        ))}
      </div>
      <p className="brand-coverage">
        <Info size={15} aria-hidden />
        {`Acciones calculadas con reglas a partir de los datos de cada apartado, sin IA; el motivo cita la cifra que la justifica. «En el informe» indica que forma parte del plan de acción del informe del periodo.${marketFiltered ? " Con un mercado elegido, el reparto por mercados es contexto y no propone acciones." : ""}`}
      </p>
      <div className="brand-actions">
        {sections.map((section) => (
          <section key={section.tab} className="brand-actions-section" aria-labelledby={`acciones-${section.tab}`}>
            <header>
              <div>
                <h3 id={`acciones-${section.tab}`}>{section.label}</h3>
                <p>{section.finding ?? "Sin datos para este periodo."}</p>
              </div>
              <Link href={href(section.tab)} className="brand-actions-link">
                Ver {section.label}
                <ArrowRight size={14} aria-hidden />
              </Link>
            </header>
            {section.actions.length ? (
              <ol className="brand-actions-list">
                {section.actions.map((action) => (
                  <li key={action.title} className="brand-actions-row">
                    <StatusBadge tone={TONE[action.priority]}>{PRIORITY_LABEL[action.priority]}</StatusBadge>
                    <div>
                      <p className="brand-actions-title">{action.title}</p>
                      <p className="brand-actions-why">{action.why}</p>
                      <p className="brand-actions-meta">
                        {action.area} · {action.source}
                        {action.inReport ? <span className="brand-actions-tag">En el informe</span> : null}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="brand-actions-empty">
                {marketFiltered && section.tab === "mercados"
                  ? "Sin acciones: con un mercado elegido, el reparto por mercados solo es contexto."
                  : section.finding
                    ? "Sin acciones: los datos del apartado no superan ningún umbral."
                    : "Sin acciones."}
              </p>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
