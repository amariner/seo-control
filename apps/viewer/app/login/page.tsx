import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand-mark">P</div>
        <p className="eyebrow">Acceso corporativo</p>
        <h1>SEO Intelligence</h1>
        <p>Datos confidenciales del grupo Porcelanosa. Accede con una cuenta corporativa asignada.</p>
        <form action={async () => { "use server"; await signIn("microsoft-entra-id", { redirectTo: "/" }); }}>
          <button className="button button-primary" type="submit">Continuar con Microsoft</button>
        </form>
      </section>
    </main>
  );
}
