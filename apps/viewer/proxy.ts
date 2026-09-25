import { NextResponse } from "next/server";
import { auth, publicAccess } from "./auth";

/* Con acceso público temporal (D-035) no se consulta la sesión: el proxy deja
   pasar todo y el visor sigue siendo de solo lectura. */
export default publicAccess ? () => NextResponse.next() : auth;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login|api/auth|api/v1/service).*)"],
};
