import type { Metadata } from "next";
import Link from "next/link";
import { LOCAL_TOOLS, localToolSummary, localToolsByState } from "@seo/contracts";
import { WorkbenchFrame } from "@/components/workbench-frame";

export const metadata: Metadata = { title: "Herramientas locales" };

const stateBadge = { disponible: "badge-good", bloqueada: "badge-warn", pendiente: "", "retirada-propuesta": "badge-warn" } as const;

export default function ToolsPage() {
  const groups = localToolsByState();
  const summary = localToolSummary();

  return (
    <WorkbenchFrame
      eyebrow="Workbench · Utilidades"
      title="Herramientas e importadores"
      description="Herramientas disponibles, requisitos y tareas pendientes."
      aside={
        <div className="wb-card preflight">
          <div className="preflight-head">
            <span className="eyebrow" style={{ margin: 0 }}>Estado del catálogo</span>
          </div>
          <strong>{summary.disponibles} de {summary.total} disponibles</strong>
          <small>
            {summary.bloqueadas} bloqueada(s) · {summary.pendientes} pendiente(s) · {summary.retiradasPropuestas} retirada(s) propuesta(s)
            <br />
            {summary.deV1} heredadas de V1 · {summary.total - summary.deV1} nacidas en V2
          </small>
        </div>
      }
    >
      {groups.map((group) =>
        group.tools.length ? (
          <section className="wb-card panel" key={group.state} style={{ marginBottom: 14 }} aria-labelledby={`grupo-${group.state}`}>
            <div className="panel-head">
              <div>
                <p className="eyebrow">{group.tools.length} herramienta(s)</p>
                <h2 id={`grupo-${group.state}`}>{group.label}</h2>
              </div>
              <span className={`badge ${stateBadge[group.state]}`}>{group.state.replace("-", " ")}</span>
            </div>
            <div className="tool-list">
              {group.tools.map((tool) => (
                <article className="tool" key={tool.key}>
                  <div className="tool-head">
                    <strong>{tool.label}</strong>
                    {tool.phase ? <span className="badge">{tool.phase}</span> : null}
                    {tool.v1Origin ? <code>{tool.v1Origin}</code> : <span className="tool-origin">nace en V2</span>}
                  </div>
                  <p className="tool-purpose">{tool.purpose}</p>
                  {/* «Disponible» significa ejecutable ahora, así que la
                      herramienta tiene que decir con qué se ejecuta. */}
                  {tool.entryPoint ? (
                    <p className="tool-entry">
                      <span>Se ejecuta con</span>
                      {tool.entryPoint.startsWith("/") ? <Link href={tool.entryPoint.split(" ")[0]!}>{tool.entryPoint}</Link> : <code>{tool.entryPoint}</code>}
                    </p>
                  ) : null}
                  {tool.blocker ? <p className="tool-blocker">{tool.blocker}</p> : null}
                  <p className="tool-note">{tool.note}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null,
      )}

      <details className="tool-provenance"><summary>Procedencia del catálogo</summary><p>
        Orígenes de V1 y fases de destino tomados del inventario auditado en P2.1
        (<code>docs/continuity/v1-migration-inventory.json</code>). Una prueba falla si una herramienta
        apunta a un origen no catalogado o adelanta su fase por su cuenta. Total catalogado: {LOCAL_TOOLS.length}.
      </p></details>
    </WorkbenchFrame>
  );
}
