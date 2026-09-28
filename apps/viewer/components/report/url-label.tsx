/** Ruta legible de una URL; el valor completo queda en `title`. */
export function Url({ value }: { value: string | null }) {
  if (!value) return <span className="muted">—</span>;
  let label = value;
  try {
    const parsed = new URL(value);
    label = decodeURI(parsed.pathname) + parsed.search;
  } catch {
    /* La fuente también devuelve rutas relativas. */
  }
  return (
    <span className="brand-url" title={value}>
      {label}
    </span>
  );
}
