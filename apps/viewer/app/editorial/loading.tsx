/** Estado de carga compartido por las tres rutas editoriales. */
export default function EditorialLoading() {
  return (
    <main className="page" id="contenido" aria-busy="true">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Ocho marcas del grupo</p>
          <h1>Cargando el snapshot editorial</h1>
          <p className="lede">Se está validando el dataset importado y comprobando la integridad de los briefs.</p>
        </div>
      </header>
      <div className="ds-empty" role="status">Preparando calendario, backlog y propuestas…</div>
    </main>
  );
}
