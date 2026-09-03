import type { Metadata } from "next";
import "@seo/ui/tokens.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SEO Intelligence", template: "%s · SEO Intelligence" },
  description: "Panel corporativo de seguimiento SEO del grupo Porcelanosa",
  robots: { index: false, follow: false, noarchive: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body><a className="ds-skip-link" href="#contenido">Saltar al contenido</a>{children}</body></html>;
}
