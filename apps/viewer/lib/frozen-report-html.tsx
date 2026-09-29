import { DeckDocument } from "@/components/report/deck-document";
import { stampLines, type ExportStamp } from "@seo/reports/export";
import { exportStyles, inlineLogo, loadFrozenReport } from "./frozen-reports";

/**
 * HTML autocontenido de un informe congelado (H11, D-081): la misma portada y
 * las mismas diapositivas que la presentación, con el CSS del sistema de
 * diseño y el logotipo incrustados y sin JavaScript. Se abre sin red, se
 * archiva o se envía como fichero; imprime igual que la presentación.
 */

/* Lo que el visor pone en la página y el informe da por hecho (reinicio de
   Tailwind y fondo del cuerpo), reducido a lo que el informe usa. */
const BASE = `*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--ds-canvas);color:var(--ds-text);font-family:var(--ds-font-sans)}
h1,h2,h3,p,ol,ul,dl,dd,figure{margin:0}
ol,ul{padding:0;list-style:none}
table{border-collapse:collapse}
img,svg{display:block;max-width:100%}
.deck-stamp{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:6px 24px;padding:14px 0;border-top:1px solid var(--ds-line);border-bottom:1px solid var(--ds-line);font-size:12px;line-height:16px}
.deck-stamp dt{color:var(--ds-muted)}
.deck-stamp dd{color:var(--ds-ink);overflow-wrap:anywhere}`;

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"]/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]!,
  );

export async function renderFrozenReportHtml(
  brand: string,
  periodId: string,
  stamp: Omit<ExportStamp, "entry">,
): Promise<{
  html: string;
  entry: NonNullable<ReturnType<typeof loadFrozenReport>>["entry"];
} | null> {
  const loaded = loadFrozenReport(brand, periodId);
  if (!loaded) return null;
  const { entry, snapshot, slides } = loaded;
  const report = snapshot.report;
  const marketName =
    report.markets.find((item) => item.code === report.market)?.name ??
    "Todos los mercados";
  // Import dinámico: Next no deja cargar `react-dom/server` en el grafo de componentes de servidor.
  const { renderToStaticMarkup } = await import("react-dom/server");
  const body = renderToStaticMarkup(
    <DeckDocument
      report={report}
      slides={slides}
      logo={inlineLogo(brand)}
      marketName={marketName}
      periodLabel={entry.period.label}
      frozen={{ generatedBy: entry.generatedBy }}
      stamp={stampLines({ ...stamp, entry })}
    />,
  );
  const title = `Informe SEO · ${entry.brandName} · ${entry.period.label}`;
  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive">
<meta name="generator" content="SEO Intelligence · visor">
<meta name="report-id" content="${escapeHtml(entry.id)}">
<meta name="report-sha256" content="${escapeHtml(entry.sha256)}">
<title>${escapeHtml(title)}</title>
<style>
${exportStyles()}
${BASE}
</style>
</head>
<body>
${body}
</body>
</html>
`;
  return { html, entry };
}
