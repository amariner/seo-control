"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  FileDown,
  Maximize,
} from "lucide-react";

/**
 * Mandos de la presentación del informe (D-073): teclado (flechas, AvPág,
 * espacio, Inicio/Fin, F), pantalla completa y PDF. El PDF es la impresión del
 * navegador, como en la V1: `document.title` da el nombre del fichero y, con
 * `?pdf=1`, el diálogo se abre solo al cargar.
 */
export function DeckControls({
  filename,
  autoPrint,
  backHref,
  total,
}: {
  filename: string;
  autoPrint: boolean;
  backHref: string;
  total: number;
}) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const previous = document.title;
    document.title = filename;
    return () => {
      document.title = previous;
    };
  }, [filename]);

  useEffect(() => {
    if (!autoPrint) return;
    let cancelled = false;
    // Espera a las fuentes y a un fotograma para que la maquetación esté cerrada.
    document.fonts.ready.then(() =>
      window.setTimeout(() => {
        if (!cancelled) window.print();
      }, 300),
    );
    return () => {
      cancelled = true;
    };
  }, [autoPrint]);

  useEffect(() => {
    const slides = [...document.querySelectorAll<HTMLElement>(".deck-slide")];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting)
            setCurrent(slides.indexOf(entry.target as HTMLElement));
      },
      { threshold: 0.6 },
    );
    slides.forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const go = (index: number) => {
      const slides = document.querySelectorAll<HTMLElement>(".deck-slide");
      slides[Math.max(0, Math.min(slides.length - 1, index))]?.scrollIntoView({
        behavior: "smooth",
      });
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select")) return;
      const slides = [...document.querySelectorAll<HTMLElement>(".deck-slide")];
      const index = slides.findIndex((slide) => {
        const box = slide.getBoundingClientRect();
        return box.top > -box.height / 2 && box.top < box.height / 2;
      });
      const at = index < 0 ? 0 : index;
      if (["ArrowDown", "ArrowRight", "PageDown", " "].includes(event.key)) {
        event.preventDefault();
        go(at + 1);
      } else if (["ArrowUp", "ArrowLeft", "PageUp"].includes(event.key)) {
        event.preventDefault();
        go(at - 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        go(0);
      } else if (event.key === "End") {
        event.preventDefault();
        go(slides.length - 1);
      } else if (event.key === "f" || event.key === "F") {
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const step = (delta: number) => {
    const slides = document.querySelectorAll<HTMLElement>(".deck-slide");
    slides[
      Math.max(0, Math.min(slides.length - 1, current + delta))
    ]?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav className="deck-controls" aria-label="Controles de la presentación">
      <Link className="deck-control" href={backHref} title="Volver al proyecto">
        <ArrowLeft size={16} aria-hidden />
        <span className="deck-control-text">Volver</span>
      </Link>
      <button
        type="button"
        className="deck-control"
        onClick={() => step(-1)}
        disabled={current === 0}
        aria-label="Diapositiva anterior"
      >
        <ChevronUp size={16} aria-hidden />
      </button>
      <span className="deck-counter" aria-live="polite">
        {current + 1} / {total}
      </span>
      <button
        type="button"
        className="deck-control"
        onClick={() => step(1)}
        disabled={current >= total - 1}
        aria-label="Diapositiva siguiente"
      >
        <ChevronDown size={16} aria-hidden />
      </button>
      <button
        type="button"
        className="deck-control"
        onClick={toggleFullscreen}
        title="Pantalla completa (F)"
        aria-label="Pantalla completa"
      >
        <Maximize size={16} aria-hidden />
      </button>
      <button
        type="button"
        className="deck-control is-primary"
        onClick={() => window.print()}
        title="Descargar como PDF (elige «Guardar como PDF» en el diálogo)"
      >
        <FileDown size={16} aria-hidden />
        <span className="deck-control-text">PDF</span>
      </button>
    </nav>
  );
}

function toggleFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen?.();
}
