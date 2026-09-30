"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy } from "lucide-react";
import { Button } from "@seo/ui";
import { PRIORITY_LABEL, PRIORITY_ORDER, type ActionTab, type Priority, type ProjectAction, type ReviewSection } from "@seo/reports";

/**
 * Pestaña «Acciones» (D-088, D-089): una sola lista de tareas ordenada por
 * prioridad, filtrable por área y copiable para repartirla al equipo; debajo,
 * una línea por apartado con lo que dicen sus datos. Las reglas y sus umbrales
 * están en `packages/reports/src/project-actions.ts`.
 */
const PRIORITIES: Priority[] = ["urgente", "alta", "media", "baja"];

type Row = ProjectAction & { section: string };

export function ActionsReview({
  sections,
  links,
  marketFiltered,
  context,
}: {
  sections: ReviewSection[];
  /** Enlace a cada pestaña con el periodo y el mercado actuales. */
  links: Record<ActionTab, string>;
  marketFiltered: boolean;
  /** Marca, periodo y mercado: encabezan la lista copiada. */
  context: string;
}) {
  const [area, setArea] = useState("all");
  const [copied, setCopied] = useState<"idle" | "ok" | "error">("idle");
  const rows: Row[] = sections
    .flatMap((section) => section.actions.map((action) => ({ ...action, section: section.label })))
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  const areas = [...new Set(rows.map((row) => row.area))];
  const visible = area === "all" ? rows : rows.filter((row) => row.area === area);
  const groups = PRIORITIES.map((priority) => ({ priority, rows: visible.filter((row) => row.priority === priority) })).filter((group) => group.rows.length);

  async function copy() {
    const url = (row: Row) => new URL(links[row.tab], window.location.origin).toString();
    const title = `Acciones SEO · ${context}${area === "all" ? "" : ` · ${area}`}`;
    const text = [
      title,
      ...groups.flatMap((group) => [
        "",
        PRIORITY_LABEL[group.priority].toUpperCase(),
        ...group.rows.map((row) => `[ ] ${row.title}\n    ${row.why}\n    ${row.area} · ${row.source} · ${url(row)}`),
      ]),
    ].join("\n");
    const html = `<p><strong>${escape(title)}</strong></p>${groups
      .map(
        (group) =>
          `<p><strong>${PRIORITY_LABEL[group.priority]}</strong></p><ul>${group.rows
            .map((row) => `<li><a href="${escape(url(row))}">${escape(row.title)}</a><br>${escape(row.why)}<br><em>${escape(`${row.area} · ${row.source}`)}</em></li>`)
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
            <Button compact onClick={copy} aria-live="polite">
              {copied === "ok" ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
              {copied === "ok" ? "Copiada" : copied === "error" ? "No se pudo copiar" : "Copiar lista"}
            </Button>
          </div>
          <div className="brand-actions">
            {groups.map((group) => (
              <section key={group.priority} className={`brand-actions-group is-${group.priority}`} aria-labelledby={`acciones-${group.priority}`}>
                <h3 id={`acciones-${group.priority}`}>
                  {PRIORITY_LABEL[group.priority]} <span>{group.rows.length}</span>
                </h3>
                <ol className="brand-actions-list">
                  {group.rows.map((row) => (
                    <li key={row.title} className="brand-actions-row">
                      <div>
                        <p className="brand-actions-title">{row.title}</p>
                        <p className="brand-actions-why">{row.why}</p>
                        <p className="brand-actions-meta">
                          {row.area} · {row.source}
                          {row.inReport ? <span className="brand-actions-tag">En el informe</span> : null}
                        </p>
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
          </div>
        </>
      ) : (
        <p className="brand-actions-empty">Sin acciones: los datos de ningún apartado superan los umbrales en este periodo.</p>
      )}
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
        <p className="brand-actions-note">Calculadas con reglas sobre los datos de cada apartado, sin IA; el motivo cita la cifra que las justifica. «En el informe»: forma parte del plan de acción del informe del periodo.</p>
      </section>
    </>
  );
}

const escape = (value: string) => value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]!);
