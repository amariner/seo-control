import { CheckCircle2, TriangleAlert } from "lucide-react";

/** Resultado de la última acción, que las Server Actions devuelven en la URL (`?ok=` / `?error=`). */
export function FlashMessages({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  return (
    <div className="flash-stack">
      {ok ? (
        <p className="flash flash-ok" role="status">
          <CheckCircle2 size={16} aria-hidden /> {ok}
        </p>
      ) : null}
      {error ? (
        <p className="flash flash-error" role="alert">
          <TriangleAlert size={16} aria-hidden /> {error}
        </p>
      ) : null}
    </div>
  );
}
