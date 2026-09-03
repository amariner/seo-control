"use client";

/**
 * Error de una ruta editorial. No se muestran datos parciales como si fueran
 * completos: se explica el fallo y se ofrece reintentar sin perder los filtros.
 */
export default function EditorialError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="page" id="contenido">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Editorial · Error</p>
          <h1>No se pudo leer el dataset editorial</h1>
          <p className="lede">El snapshot importado no ha pasado la validación de contratos o no está disponible. No se muestran datos parciales para evitar conclusiones sobre información incompleta.</p>
        </div>
      </header>
      <div className="ds-notice ds-notice-danger" role="alert">
        {error.message || "Error desconocido al cargar el dataset."}
        {error.digest ? <><br />Referencia técnica: {error.digest}</> : null}
      </div>
      <p style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <button className="ds-button ds-button-primary" type="button" onClick={reset}>Reintentar</button>
        <a className="ds-button" href="/api/v1/editorial/import-report">Ver informe de importación</a>
      </p>
      <p className="ds-meta" style={{ marginTop: 16 }}>Si el error persiste, vuelve a ejecutar la importación con <code>pnpm editorial:import</code> en el workbench local y revisa los rechazos del informe.</p>
    </main>
  );
}
