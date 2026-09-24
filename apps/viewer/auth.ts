import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

const devBypass = process.env.NODE_ENV !== "production" && process.env.DEV_AUTH_BYPASS === "true";

/**
 * Acceso público TEMPORAL del visor desplegado (D-035). Mientras no se registre
 * la aplicación en Microsoft Entra, el visor se publica sin login para validar
 * el despliegue con dato real. Es una decisión explícita, por entorno: nunca se
 * activa sola, y la cabecera `X-Robots-Tag: noindex` sigue impidiendo que se
 * indexe. Quitar la variable devuelve el login obligatorio sin tocar código.
 */
export const publicAccess = process.env.PUBLIC_ACCESS === "true";
const allowlist = new Set((process.env.ALLOWED_ENTRA_OBJECT_IDS ?? "").split(",").map((value) => value.trim()).filter(Boolean));

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [MicrosoftEntraID({
    clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID ?? "not-configured",
    clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET ?? "not-configured",
    issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
  })],
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/login" },
  callbacks: {
    authorized({ auth: session }) {
      return publicAccess || devBypass || Boolean(session?.user);
    },
    signIn({ profile }) {
      if (devBypass) return true;
      const objectId = typeof profile?.oid === "string" ? profile.oid : "";
      return allowlist.size > 0 && allowlist.has(objectId);
    },
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" ? "__Secure-seo.session-token" : "seo.session-token",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" },
    },
  },
});
