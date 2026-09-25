import { NextResponse, type NextFetchEvent, type NextMiddleware, type NextRequest } from "next/server";
import { auth, publicAccess } from "./auth";
import { bypassesCrawlerBlock, crawlerBlockedResponse, isBlockedUserAgent } from "@/lib/crawlers";

/* Rutas que no exigen sesión: el login y los callbacks de Auth.js. Pasan por el
   filtro de bots, pero no por `auth`, que las redirigiría a sí mismas. */
const SESSIONLESS = ["/login", "/api/auth"];

/**
 * 1. Bots, agentes de IA y clientes automáticos reciben 403 en cualquier ruta,
 *    incluido el login (D-048).
 * 2. El resto pasa por Auth.js. Con acceso público temporal (D-035) no se
 *    consulta la sesión y el visor sigue siendo de solo lectura.
 */
export default function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;
  if (!bypassesCrawlerBlock(pathname) && isBlockedUserAgent(request.headers.get("user-agent"))) {
    return crawlerBlockedResponse();
  }
  if (publicAccess || SESSIONLESS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return NextResponse.next();
  }
  return (auth as unknown as NextMiddleware)(request, event);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|api/v1/service).*)"],
};
