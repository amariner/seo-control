import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, extname } from "node:path";
import { safeAdditionalPath } from "@/lib/additional-reports";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  ".csv": "text/csv; charset=utf-8",
  ".tsv": "text/tab-separated-values; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".pdf": "application/pdf",
};

/**
 * Descarga de un fichero de `informes-adicionales/` (D-076). Solo dentro de
 * esa carpeta; el HTML se sirve con CSP `sandbox` para que no ejecute nada en
 * el origen del workbench.
 */
export function GET(request: Request) {
  const path = new URL(request.url).searchParams.get("path") ?? "";
  const target = safeAdditionalPath(path);
  if (!target || path.split("/").length !== 3 || !existsSync(target) || !statSync(target).isFile()) return new Response("No encontrado", { status: 404 });
  const extension = extname(target).toLowerCase();
  const html = extension === ".html";
  return new Response(readFileSync(target), {
    headers: {
      "Content-Type": TYPES[extension] ?? "application/octet-stream",
      "Content-Disposition": `${html ? "inline" : "attachment"}; filename="${encodeURIComponent(basename(target))}"`,
      "X-Content-Type-Options": "nosniff",
      ...(html ? { "Content-Security-Policy": "sandbox; default-src 'none'; img-src data:; style-src 'unsafe-inline'" } : {}),
      "Cache-Control": "no-store",
    },
  });
}
