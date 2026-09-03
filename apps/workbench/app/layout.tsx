import type { Metadata } from "next";
import "@seo/ui/tokens.css";
import "./globals.css";

export const metadata: Metadata = { title: "SEO Workbench · Local", robots: { index: false, follow: false } };
export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="es"><body>{children}</body></html>; }
