/**
 * Reglas de acceso del visor (D-047). Se aíslan de `auth.ts` para probarlas sin
 * levantar Auth.js: la decisión de quién entra no puede depender de un mock.
 */

/** Lista separada por comas → conjunto normalizado (sin vacíos, en minúsculas). */
export function parseAllowlist(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * Google: entra solo un email verificado por Google y presente en la lista.
 * Una lista vacía no deja entrar a nadie: el acceso nunca se abre por omisión.
 */
export function isAllowedGoogleProfile(
  profile: Record<string, unknown> | undefined,
  allowlist: Set<string>,
): boolean {
  if (!profile || profile.email_verified !== true) return false;
  if (typeof profile.email !== "string") return false;
  return allowlist.size > 0 && allowlist.has(profile.email.trim().toLowerCase());
}

/** Entra ID: entra solo un `oid` presente en la lista (se conserva de D-035). */
export function isAllowedEntraProfile(
  profile: Record<string, unknown> | undefined,
  allowlist: Set<string>,
): boolean {
  const objectId = typeof profile?.oid === "string" ? profile.oid.toLowerCase() : "";
  return allowlist.size > 0 && allowlist.has(objectId);
}

/** Las rutas de API responden 401 en JSON; las páginas redirigen al login. */
export function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}
