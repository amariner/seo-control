import type { ReactNode } from "react";
import { AppShell } from "./app-shell";

export function PageFrame({
  eyebrow,
  title,
  description,
  generatedAt,
  aside,
  children,
  showGlobalFilters = true,
}: {
  eyebrow: string;
  title: string;
  description: string;
  generatedAt: string;
  aside?: ReactNode;
  children: ReactNode;
  showGlobalFilters?: boolean;
}) {
  return (
    <AppShell generatedAt={generatedAt} showGlobalFilters={showGlobalFilters}>
      <main className="page" id="contenido">
        <header className="page-heading">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p className="lede">{description}</p>
          </div>
          {aside ?? (
            <div className="date-context">
              Última actualización
              <br />
              <strong>
                {new Date(generatedAt).toLocaleString("es-ES", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </strong>
            </div>
          )}
        </header>
        {children}
      </main>
    </AppShell>
  );
}
