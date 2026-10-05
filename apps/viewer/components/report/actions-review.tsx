"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy } from "lucide-react";
import { Button } from "@seo/ui";
import {
  PRIORITY_LABEL,
  PRIORITY_ORDER,
  TRACKED_STATUS_LABEL,
  VERDICT_LABEL,
  dueState,
  dueText,
  formatMetricValue,
  isClosedStatus,
  resultOf,
  shortDate,
  type ActionTab,
  type Priority,
  type ProjectAction,
  type ReviewSection,
  type TrackedAction,
} from "@seo/reports";
import type { ActionPiece } from "@seo/reports/action-journey";

/**
 * Pestaña «Acciones» (D-088, D-089, D-090): una sola lista de tareas ordenada
 * por prioridad, filtrable por área y por seguimiento y copiable para
 * repartirla al equipo. Las que el equipo sigue muestran estado, responsable,
 * plazo, criterio de éxito y último resultado medido; las que sigue y este
 * periodo ya no propone van aparte. Debajo, una línea por apartado con lo que
 * dicen sus datos. Las reglas y sus umbrales están en
 * `packages/reports/src/project-actions.ts`; el seguimiento, en
 * `action-tracking.ts`, y se escribe desde el chat (`pnpm action:track`).
 */
const PRIORITIES: Priority[] = ["urgente", "alta", "media", "baja"];

type Row = ProjectAction & { section: string };
type Follow = "all" | "tracked" | "untracked";

export function ActionsReview({
  sections,
  links,
  marketFiltered,
  context,
  tracked,
  elsewhere,
  linkedPieces,
  today,
}: {
  sections: ReviewSection[];
  /** Enlace a cada pestaña con el periodo y el mercado actuales. */
  links: Record<ActionTab, string>;
  marketFiltered: boolean;
  /** Marca, periodo y mercado: encabezan la lista copiada. */
  context: string;
  /** Seguimiento de las acciones propuestas, por clave. */
  tracked: Record<string, TrackedAction>;
  /** En seguimiento, pero estos datos ya no las proponen. */
  elsewhere: TrackedAction[];
  /** Piezas del plan que enlazan cada acción seguida, por clave (D-092). */
  linkedPieces: Record<string, ActionPiece[]>;
  /** Día de referencia de los plazos (servidor). */
  today: string;
}) {
  const [area, setArea] = useState("all");
  const [follow, setFollow] = useState<Follow>("all");
  const [copied, setCopied] = useState<"idle" | "ok" | "error">("idle");
  const rows: Row[] = sections
    .flatMap((section) => section.actions.map((action) => ({ ...action, section: section.label })))
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  const areas = [...new Set(rows.map((row) => row.area))];
  const trackedCount = rows.filter((row) => tracked[row.key]).length;
  const followed = Object.values(tracked).concat(elsewhere);
  const overdue = followed.filter((record) => dueState(record, today).state === "vencida").length;
  const visible = rows.filter((row) => (area === "all" || row.area === area) && (follow === "all" || (follow === "tracked") === Boolean(tracked[row.key])));
  const groups = PRIORITIES.map((priority) => ({ priority, rows: visible.filter((row) => row.priority === priority) })).filter((group) => group.rows.length);
  const tabLabel = (tab: ActionTab) => sections.find((section) => section.tab === tab)?.label ?? tab;

  async function copy() {
    const url = (tab: ActionTab) => new URL(links[tab], window.location.origin).toString();
    const title = `Acciones SEO · ${context}${area === "all" ? "" : ` · ${area}`}${follow === "all" ? "" : follow === "tracked" ? " · en seguimiento" : " · sin asignar"}`;
    const followLine = (record: TrackedAction | undefined) =>
      record ? `${TRACKED_STATUS_LABEL[record.status]} · ${record.owner ?? "sin responsable"} · ${dueText(record, today)}` : null;
    const text = [
      title,
      ...groups.flatMap((group) => [
        "",
        PRIORITY_LABEL[group.priority].toUpperCase(),
        ...group.rows.map((row) => {
          const record = tracked[row.key];
          return [
            `[${record?.status === "completada" ? "x" : " "}] ${row.title}`,
            `    ${row.why}`,
            followLine(record) ? `    ${followLine(record)}` : null,
            `    ${row.area} · ${row.source} · ${url(row.tab)}`,
          ]
            .filter(Boolean)
            .join("\n");
        }),
      ]),
    ].join("\n");
    const html = `<p><strong>${escape(title)}</strong></p>${groups
      .map(
        (group) =>
          `<p><strong>${PRIORITY_LABEL[group.priority]}</strong></p><ul>${group.rows
            .map((row) => {
              const line = followLine(tracked[row.key]);
              return `<li><a href="${escape(url(row.tab))}">${escape(row.title)}</a><br>${escape(row.why)}${line ? `<br>${escape(line)}` : ""}<br><em>${escape(`${row.area} · ${row.source}`)}</em></li>`;
            })
            .join("")}</ul>`,
      )
      .join("")}`;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([text], { type: "text/plain" }),
          "text/html": new Blob([html], { type: "text/html" }),
        }),
      ]);
      setCopied("ok");
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        setCopied("ok");
      } catch {
        setCopied("error");
      }
    }
    window.setTimeout(() => setCopied("idle"), 2500);
  }

  return (
    <>
      {rows.length ? (
        <>
          <div className="brand-actions-toolbar">
            <div className="brand-actions-filters">
              <div className="brand-list-filter" role="group" aria-label="Filtrar acciones por área">
                <button type="button" aria-pressed={area === "all"} onClick={() => setArea("all")}>
                  Todas <span>{rows.length}</span>
                </button>
                {areas.map((item) => (
                  <button key={item} type="button" aria-pressed={area === item} onClick={() => setArea(item)}>
                    {item} <span>{rows.filter((row) => row.area === item).length}</span>
                  </button>
                ))}
              </div>
              {followed.length ? (
                // Conmutadores: pulsar el activo vuelve a mostrar todas.
                <div className="brand-list-filter brand-actions-follow-filter" role="group" aria-label="Filtrar acciones por seguimiento">
                  <button type="button" aria-pressed={follow === "tracked"} onClick={() => setFollow(follow === "tracked" ? "all" : "tracked")}>
                    En seguimiento <span>{trackedCount}</span>
                  </button>
                  <button type="button" aria-pressed={follow === "untracked"} onClick={() => setFollow(follow === "untracked" ? "all" : "untracked")}>
                    Sin asignar <span>{rows.length - trackedCount}</span>
                  </button>
                </div>
              ) : null}
            </div>
            <Button compact onClick={copy} aria-live="polite">
              {copied === "ok" ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
              {copied === "ok" ? "Copiada" : copied === "error" ? "No se pudo copiar" : "Copiar lista"}
            </Button>
          </div>
          <p className="brand-actions-summary">
            {followed.length
              ? `${followed.length} en seguimiento${overdue ? `, ${overdue} ${overdue === 1 ? "vencida" : "vencidas"}` : ""} · ${rows.length - trackedCount} propuestas sin asignar.`
              : "Ninguna en seguimiento todavía."}{" "}
            El equipo asigna responsable, plazo y estado desde el chat del workbench («sigue la acción … de la marca»).
          </p>
          <div className="brand-actions">
            {groups.map((group) => (
              <section key={group.priority} className={`brand-actions-group is-${group.priority}`} aria-labelledby={`acciones-${group.priority}`}>
                <h3 id={`acciones-${group.priority}`}>
                  {PRIORITY_LABEL[group.priority]} <span>{group.rows.length}</span>
                </h3>
                <ol className="brand-actions-list">
                  {group.rows.map((row) => (
                    <li key={row.key} className="brand-actions-row">
                      <div>
                        <p className="brand-actions-title">{row.title}</p>
                        <p className="brand-actions-why">{row.why}</p>
                        <p className="brand-actions-meta">
                          {row.area} · {row.source}
                          {row.inReport ? <span className="brand-actions-tag">En el informe</span> : null}
                        </p>
                        {tracked[row.key] ? <Tracking record={tracked[row.key]!} pieces={linkedPieces[row.key] ?? []} today={today} /> : null}
                      </div>
                      <Link href={links[row.tab]} className="brand-actions-link">
                        {row.section}
                        <ArrowRight size={14} aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
            {!groups.length ? <p className="brand-actions-empty">Ninguna acción con este filtro.</p> : null}
          </div>
        </>
      ) : (
        <p className="brand-actions-empty">Sin acciones: los datos de ningún apartado superan los umbrales en este periodo.</p>
      )}
      {elsewhere.length ? (
        <section className="brand-actions-elsewhere" aria-labelledby="acciones-fuera">
          <h3 id="acciones-fuera">
            En seguimiento que este periodo ya no propone <span>{elsewhere.length}</span>
          </h3>
          <p className="brand-actions-note">
            Las sigue el equipo, pero los datos del periodo y mercado elegidos ya no las proponen: puede que estén resueltas o que el periodo sea otro. Su resultado se mide con la ventana con la que empezaron.
          </p>
          <ol className="brand-actions-list">
            {elsewhere.map((record) => (
              <li key={record.key} className="brand-actions-row">
                <div>
                  <p className="brand-actions-title">{record.title}</p>
                  <p className="brand-actions-why">{record.why}</p>
                  <p className="brand-actions-meta">
                    {PRIORITY_LABEL[record.priority]} · {record.area} · {record.source}
                  </p>
                  <Tracking record={record} pieces={linkedPieces[record.key] ?? []} today={today} />
                </div>
                <Link href={links[record.tab]} className="brand-actions-link">
                  {tabLabel(record.tab)}
                  <ArrowRight size={14} aria-hidden />
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      <section className="brand-actions-status" aria-labelledby="acciones-apartados">
        <h3 id="acciones-apartados">Cómo está cada apartado</h3>
        <ul>
          {sections.map((section) => (
            <li key={section.tab}>
              <Link href={links[section.tab]}>{section.label}</Link>
              <span>
                {section.finding ?? "Sin datos para este periodo."}
                {marketFiltered && section.tab === "mercados" ? " Con un mercado elegido, el reparto solo es contexto y no propone acciones." : ""}
              </span>
              <em>{section.actions.length ? `${section.actions.length} ${section.actions.length === 1 ? "acción" : "acciones"}` : "Nada que hacer"}</em>
            </li>
          ))}
        </ul>
        <p className="brand-actions-note">
          Calculadas con reglas sobre los datos de cada apartado, sin IA; el motivo cita la cifra que las justifica. «En el informe»: forma parte del plan de acción del informe del periodo. El seguimiento guarda la cifra al empezar y la vuelve a medir con datos reales de la misma ventana; un resultado con días anteriores a la acción, o sin crawl posterior, es provisional.
        </p>
      </section>
    </>
  );
}

/**
 * Estado, responsable y plazo; debajo, criterio y último resultado frente al
 * punto de partida, y las piezas del plan que el equipo ha enlazado a la acción
 * con su propia medición (recorrido oportunidad → pieza → acción → resultado).
 */
function Tracking({ record, pieces, today }: { record: TrackedAction; pieces: ActionPiece[]; today: string }) {
  const due = dueState(record, today);
  const reading = resultOf(record);
  const unit = record.metric?.unit ?? "";
  return (
    <div className="brand-actions-track">
      <p className="brand-actions-follow">
        <span className={`brand-actions-state is-${record.status}`}>{TRACKED_STATUS_LABEL[record.status]}</span>
        <span>{record.owner ?? "Sin responsable"}</span>
        <span className={due.state === "vencida" ? "is-overdue" : undefined}>{dueText(record, today)}</span>
      </p>
      <p className="brand-actions-result">
        <strong>Criterio:</strong> {record.criterion}.{" "}
        {record.metric ? (
          <>
            Al empezar ({shortDate(record.baseline.cutoff)}): {formatMetricValue(record.baseline.value, unit)}
            {record.result ? `; última medición (${shortDate(record.result.cutoff)}): ${formatMetricValue(record.result.value, unit)}` : "; sin medir todavía"}.
          </>
        ) : record.result ? (
          `Última medición (${shortDate(record.result.cutoff)}): ${record.result.proposed ? "los datos aún la proponen" : "los datos ya no la proponen"}.`
        ) : (
          "Sin medir todavía."
        )}
        {reading ? (
          <span className={`brand-actions-verdict is-${reading.verdict}`}>
            {VERDICT_LABEL[reading.verdict]}
            {reading.provisional ? " · provisional" : ""}
          </span>
        ) : null}
      </p>
      {reading?.provisional ? <p className="brand-actions-aside">{reading.provisional}</p> : null}
      {record.note ? <p className="brand-actions-aside">Nota: {record.note}</p> : null}
      {record.learning && isClosedStatus(record.status) ? <p className="brand-actions-aside">Aprendizaje: {record.learning}</p> : null}
      {pieces.length ? (
        <div className="brand-actions-pieces">
          <p>
            <strong>{pieces.length === 1 ? "Pieza del plan" : `${pieces.length} piezas del plan`}</strong>
          </p>
          <ul>
            {pieces.map((piece) => (
              <li key={piece.id}>
                <Link href={piece.href}>{piece.title}</Link>
                <span>
                  {piece.status}
                  {piece.publicationDate ? ` · ${shortDate(piece.publicationDate)}` : ""}
                  {piece.result ? ` · ${piece.result}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

const escape = (value: string) => value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]!);
