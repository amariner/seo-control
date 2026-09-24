"use client";

import { useSearchParams } from "next/navigation";
import { DataSkeleton, Skeleton } from "@seo/ui/skeleton";
import { AppShell } from "@/components/app-shell";
import styles from "./project-state.module.css";

export default function ProjectLoading() {
  const params = useSearchParams();
  const content = (
    <main id="contenido" className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Proyectos</p>
        <h1>Informe del proyecto</h1>
        <p
          className={styles.status}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          Cargando datos del proyecto…
        </p>
      </header>

      <div aria-hidden="true" aria-busy="true">
        <div className={styles.filters}>
          <Skeleton className={styles.filter} />
          <Skeleton className={styles.filter} />
        </div>
        <div className={styles.tabs}>
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} style={{ width: 76, height: 16 }} />
          ))}
        </div>
        <div className={styles.metrics}>
          {Array.from({ length: 4 }, (_, index) => (
            <div className={styles.metric} key={index}>
              <Skeleton style={{ width: "70%", height: 16 }} />
              <Skeleton style={{ width: "40%", height: 12, marginTop: 8 }} />
              <DataSkeleton variant="metric" />
            </div>
          ))}
        </div>
        <section className={styles.chart}>
          <Skeleton style={{ width: 160, height: 24, marginBottom: 24 }} />
          <DataSkeleton variant="chart" />
        </section>
      </div>
    </main>
  );

  return params.get("modo") === "presentacion" ? (
    <div className="report-present-shell">{content}</div>
  ) : (
    <AppShell showGlobalFilters={false}>{content}</AppShell>
  );
}
