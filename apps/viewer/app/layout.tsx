import type { Metadata } from "next";
import "./tailwind.css";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: { default: "SEO Intelligence", template: "%s · SEO Intelligence" },
  description: "Panel corporativo de seguimiento SEO del grupo Porcelanosa",
  robots: {
    index: false, follow: false, noarchive: true, nosnippet: true, noimageindex: true, nocache: true, notranslate: true,
    googleBot: { index: false, follow: false, noarchive: true, nosnippet: true, noimageindex: true },
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body><a className="ds-skip-link" href="#contenido">Saltar al contenido</a><TooltipProvider delayDuration={200}>{children}</TooltipProvider></body></html>;
}
