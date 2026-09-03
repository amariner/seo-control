import { validatePublicationPackage } from "@seo/sync";
import { privateJson, serviceAuthorized } from "@/lib/http";

export async function POST(request: Request) {
  if (!serviceAuthorized(request)) return privateJson({ error: "No autorizado" }, { status: 401 });
  try {
    const pkg = validatePublicationPackage(await request.json(), process.env.PUBLISHING_PUBLIC_KEY);
    return privateJson({ accepted: true, packageId: pkg.packageId, rows: pkg.rows.length, checksum: pkg.checksum }, { status: 202 });
  } catch (error) {
    return privateJson({ accepted: false, error: error instanceof Error ? error.message : "Paquete rechazado" }, { status: 400 });
  }
}
