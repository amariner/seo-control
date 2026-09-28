import "@/components/report/project-deck.css";


/** Carga del informe sin el shell de la ficha: la presentación ocupa toda la pantalla. */
export default function Loading() {
  return (
    <div className="deck-loading" role="status">
      Preparando el informe…
    </div>
  );
}
