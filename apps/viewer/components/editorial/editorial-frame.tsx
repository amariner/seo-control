import Link from "next/link";
import type { ReactNode } from "react";
import type { EditorialDataset } from "@seo/contracts";
import { StatusBadge } from "@seo/ui";
import { CalendarDays, Lightbulb, ListTodo } from "lucide-react";
import "./editorial.css";
import { AppShell } from "@/components/app-shell";

const tabs = [
  { href: "/editorial/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/editorial/backlog", label: "Backlog y plan", icon: ListTodo },
  { href: "/editorial/propuestas", label: "Propuestas", icon: Lightbulb },
] as const;

export function EditorialFrame({ dataset, current, title, description, aside, children }: { dataset: EditorialDataset; current: (typeof tabs)[number]["href"]; title: string; description: string; aside?: ReactNode; children: ReactNode }) {
  const imported = new Date(dataset.generatedAt);
  const archives = dataset.report.archives;
  const allOk = archives.every((archive) => archive.status === "ok") && dataset.report.rejections.length === 0;
  return (
    <AppShell generatedAt={dataset.generatedAt} showGlobalFilters={false}>
      <main className="page editorial-page" id="contenido">
        <header className="page-heading">
          <div>
            <p className="eyebrow">Editorial · 8 marcas</p>
            <h1>{title}</h1>
            <p className="lede">{description}</p>
          </div>
          {aside ?? (
            <div className="date-context">
              Importación V1<br />
              <strong>{imported.toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })}</strong><br />
              <StatusBadge tone={allOk ? "good" : "warn"}>{allOk ? "Importación íntegra" : "Importación con avisos"}</StatusBadge>
            </div>
          )}
        </header>
        <nav className="editorial-tabs" aria-label="Secciones editoriales">
          {tabs.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`editorial-tab ${href === current ? "editorial-tab-active" : ""}`} aria-current={href === current ? "page" : undefined}><Icon size={14} aria-hidden />{label}</Link>)}
        </nav>
        {children}
        <details className="editorial-provenance"><summary>Fuentes y cobertura de la importación</summary>
        <p className="provenance">
          <span>Procedencia:</span>
          {archives.map((archive) => <span key={archive.key}><code>{archive.fileName}</code> · {archive.importedCount}/{archive.expectedCount} · sha256 <code>{archive.sha256.slice(0, 10)}…</code></span>)}
          <Link className="ds-evidence" href="/api/v1/editorial/import-report">Informe de importación</Link>
        </p>
        </details>
      </main>
    </AppShell>
  );
}
