"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import styles from "./project-state.module.css";

export default function ProjectError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const params = useSearchParams();
  const content = (
    <main id="contenido" className={styles.page}>
      <p className={styles.eyebrow}>Proyectos</p>
      <section className={styles.error} aria-labelledby="project-error-title">
        <div role="alert">
          <h1 id="project-error-title">No hemos podido cargar los datos</h1>
          <p>Vuelve a intentarlo en unos instantes.</p>
        </div>
        <div className={styles.actions}>
          <button
            className="ds-button ds-button-primary"
            type="button"
            onClick={() => retry()}
          >
            Reintentar
          </button>
          <Link className="ds-button" href="/projects">
            Volver a proyectos
          </Link>
        </div>
      </section>
    </main>
  );

  return params.get("modo") === "presentacion" ? (
    <div className="report-present-shell">{content}</div>
  ) : (
    <AppShell showGlobalFilters={false}>{content}</AppShell>
  );
}
