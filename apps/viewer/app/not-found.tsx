import { Suspense } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";

/**
 * 404 del visor dentro del shell: mismo marco, título y salida clara. Sin él,
 * Next pintaba su página por defecto sin `main`, sin salto al contenido y con
 * contraste insuficiente (axe, D-078).
 */
export default function NotFound() {
  // AppShell lee la query string: en el 404 prerenderizado necesita Suspense.
  return (
    <Suspense>
    <AppShell showGlobalFilters={false}>
      <main className="page page-reading" id="contenido">
        <header className="page-heading">
          <div>
            <p className="eyebrow">Error 404</p>
            <h1>Página no encontrada</h1>
            <p className="lede">La dirección no existe o el elemento ya no está en los datos actuales (por ejemplo, un identificador del origen sintético).</p>
          </div>
        </header>
        <p>
          <Link className="section-link" href="/">Volver al inicio</Link>
        </p>
      </main>
    </AppShell>
    </Suspense>
  );
}
