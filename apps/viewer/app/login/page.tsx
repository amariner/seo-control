import { signIn, signInProviders } from "@/auth";

/* Auth.js redirige aquí con `?error=`. `AccessDenied` es la cuenta que se
   autentica bien pero no está en la lista de acceso (D-047). */
const ERRORS: Record<string, string> = {
  AccessDenied: "Esta cuenta no tiene acceso. Pide al responsable que la añada a la lista de usuarios autorizados.",
  Configuration: "El acceso no está bien configurado en el servidor. Avisa al responsable.",
};

/** Auth.js envía `callbackUrl` absoluto; se conserva solo la ruta para no salir nunca del visor. */
function internalPath(callbackUrl: string | undefined): string {
  if (!callbackUrl) return "/";
  try {
    const url = new URL(callbackUrl, "http://visor.local");
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; callbackUrl?: string }> }) {
  const { error, callbackUrl } = await searchParams;
  const message = error ? ERRORS[error] ?? "No se ha podido iniciar sesión. Vuelve a intentarlo." : null;
  const redirectTo = internalPath(callbackUrl);

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand-mark">P</div>
        <p className="eyebrow">Acceso restringido</p>
        <h1>SEO Intelligence</h1>
        <p>Datos confidenciales del grupo Porcelanosa. Accede con una cuenta autorizada.</p>
        {message ? <p className="login-error" role="alert">{message}</p> : null}
        {signInProviders.length === 0 ? (
          <p className="login-error" role="alert">No hay ningún método de acceso configurado.</p>
        ) : (
          signInProviders.map((provider) => (
            <form key={provider.id} action={async () => { "use server"; await signIn(provider.id, { redirectTo }); }}>
              <button className="button button-primary" type="submit">Continuar con {provider.name}</button>
            </form>
          ))
        )}
      </section>
    </main>
  );
}
