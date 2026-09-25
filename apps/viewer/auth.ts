import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { isAllowedEntraProfile, isAllowedGoogleProfile, isApiPath, parseAllowlist } from "@/lib/access";

const devBypass = process.env.NODE_ENV !== "production" && process.env.DEV_AUTH_BYPASS === "true";

/**
 * Acceso público TEMPORAL del visor desplegado (D-035). Mientras no se registre
 * la aplicación en Microsoft Entra, el visor se publica sin login para validar
 * el despliegue con dato real. Es una decisión explícita, por entorno: nunca se
 * activa sola, y la cabecera `X-Robots-Tag: noindex` sigue impidiendo que se
 * indexe. Quitar la variable devuelve el login obligatorio sin tocar código.
 */
export const publicAccess = process.env.PUBLIC_ACCESS === "true";

/*
 * Proveedores por entorno (D-047). Google es el acceso vigente porque el
 * responsable puede gestionarlo sin IT; Entra ID queda preparado para cuando se
 * registre la aplicación. Cada uno se activa solo si tiene su client ID.
 * `AUTH_GOOGLE_*` no reutiliza `GOOGLE_CLIENT_*`: esas son las credenciales de
 * solo lectura de GSC (D-034) y no deben servir para iniciar sesión.
 */
const googleAllowlist = parseAllowlist(process.env.ALLOWED_GOOGLE_EMAILS);
const entraAllowlist = parseAllowlist(process.env.ALLOWED_ENTRA_OBJECT_IDS);

const providers: Provider[] = [];
/** Proveedores activos, para que el login muestre solo los botones que funcionan. */
export const signInProviders: { id: string; name: string }[] = [];
if (process.env.AUTH_GOOGLE_ID) {
  providers.push(Google({
    clientId: process.env.AUTH_GOOGLE_ID,
    clientSecret: process.env.AUTH_GOOGLE_SECRET,
    authorization: { params: { prompt: "select_account" } },
  }));
  signInProviders.push({ id: "google", name: "Google" });
}
if (process.env.AUTH_MICROSOFT_ENTRA_ID_ID) {
  providers.push(MicrosoftEntraID({
    clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
    clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
    issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
  }));
  signInProviders.push({ id: "microsoft-entra-id", name: "Microsoft" });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    authorized({ auth: session, request }) {
      if (publicAccess || devBypass || session?.user) return true;
      if (isApiPath(request.nextUrl.pathname)) {
        return Response.json({ error: "No autenticado" }, { status: 401 });
      }
      return false;
    },
    signIn({ account, profile }) {
      if (devBypass) return true;
      if (account?.provider === "google") return isAllowedGoogleProfile(profile, googleAllowlist);
      if (account?.provider === "microsoft-entra-id") return isAllowedEntraProfile(profile, entraAllowlist);
      return false;
    },
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" ? "__Secure-seo.session-token" : "seo.session-token",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" },
    },
  },
});
