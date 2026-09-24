import { privateJson } from "@/lib/http";
import { findReport } from "@/lib/reports";

/**
 * Un informe con su cadena de versiones y los capítulos que declara (P2.3). Lee
 * del archivo, no del payload de la portada: si leyera de allí conocería solo
 * los informes recientes y devolvería 404 para los que la pantalla sí muestra.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = findReport(id);
  return report ? privateJson(report) : privateJson({ error: "Informe no encontrado" }, { status: 404 });
}
