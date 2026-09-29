import type { ComponentProps } from "react";
import { DeckDocument } from "./deck-document";
import { DeckControls } from "./project-deck-controls";
import "./project-deck.css";

/**
 * Informe del proyecto (D-073, D-074). En pantalla es una presentación: una
 * diapositiva por apartado, a pantalla completa y con teclado. Al imprimir, la
 * misma estructura sale como PDF al estilo de la V1 (portada, una página por
 * apartado, cabecera repetida y nombre de fichero desde `document.title`).
 */
export function ProjectDeck({
  filename,
  autoPrint,
  backHref,
  ...document
}: Omit<ComponentProps<typeof DeckDocument>, "controls" | "stamp"> & {
  /** Sin extensión: el navegador lo propone al guardar como PDF. */
  filename: string;
  autoPrint: boolean;
  backHref: string;
}) {
  return (
    <DeckDocument
      {...document}
      controls={
        <DeckControls
          filename={filename}
          autoPrint={autoPrint}
          backHref={backHref}
          total={document.slides.length + 1}
        />
      }
    />
  );
}
