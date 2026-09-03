import { auth } from "./auth";

export default auth;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login|api/v1/service).*)"],
};
