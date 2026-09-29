"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ExternalLink,
  FileBarChart,
  FolderOpen,
  House,
  NotebookPen,
  ScanSearch,
  CalendarRange,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useEffect, type CSSProperties, type ReactNode } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

/**
 * Shell del workbench (D-077): el mismo marco que el visor (D-044) —barra
 * lateral de papel mineral, lienzo blanco en inset y cabecera fija— para que
 * las dos aplicaciones se lean como un producto. Lo que las distingue queda a
 * la vista: la marca dice «Workbench · Local» y la cabecera, «Entorno local».
 */

type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAVIGATION: Array<{ label: string; items: NavItem[] }> = [
  { label: "Preparación", items: [{ href: "/", label: "Inicio", icon: House }] },
  {
    label: "Editorial",
    items: [
      { href: "/editorial/plan", label: "Plan editorial", icon: CalendarRange },
      { href: "/editorial", label: "Curación", icon: NotebookPen },
    ],
  },
  {
    label: "Informes",
    items: [
      { href: "/informes", label: "Informes", icon: FileBarChart },
      { href: "/informes/adicionales", label: "Adicionales", icon: FolderOpen },
    ],
  },
  {
    label: "Técnico",
    items: [
      { href: "/crawls", label: "Crawls", icon: ScanSearch },
      { href: "/herramientas", label: "Herramientas", icon: Wrench },
    ],
  },
];

const ALL = NAVIGATION.flatMap((group) => group.items);

/** El destino activo es el de ruta más larga que contiene la actual («/informes/adicionales» no activa «/informes»). */
export function activeHref(pathname: string): string | null {
  const matches = ALL.filter((item) => (item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`)));
  return matches.sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;
}

export const labelOf = (href: string | null) => ALL.find((item) => item.href === href)?.label ?? null;

function WorkbenchSidebar({ viewerUrl }: { viewerUrl: string }) {
  const pathname = usePathname();
  const active = activeHref(pathname);
  const { isMobile, setOpenMobile } = useSidebar();
  const closeMobile = () => {
    if (isMobile) setOpenMobile(false);
  };
  return (
    <Sidebar collapsible="offcanvas" variant="inset" role="complementary" aria-label="Barra lateral del workbench">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="h-auto gap-3 p-2 hover:bg-transparent">
              <Link href="/" onNavigate={closeMobile}>
                <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-ink font-serif text-base text-white">
                  P
                </span>
                <span className="grid min-w-0 leading-tight">
                  <strong className="truncate text-sm font-semibold text-foreground">SEO Workbench</strong>
                  <span className="truncate text-xs tracking-[0.08em] text-muted-foreground uppercase">Porcelanosa · local</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <nav aria-label="Secciones del workbench" className="contents">
          {NAVIGATION.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const current = item.href === active;
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={current}
                          tooltip={item.label}
                          className="h-10 font-medium text-sidebar-foreground data-[active=true]:bg-background data-[active=true]:text-primary data-[active=true]:shadow-xs"
                        >
                          <Link href={item.href} aria-current={current ? "page" : undefined} onNavigate={closeMobile}>
                            <Icon aria-hidden />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Abrir el visor local" className="h-10 font-medium text-sidebar-foreground">
                    <a href={viewerUrl} target="_blank" rel="noopener">
                      <ExternalLink aria-hidden />
                      <span>Abrir el visor</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </nav>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-3 rounded-lg p-2">
          <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-sidebar-accent text-xs font-bold text-foreground">
            WB
          </span>
          <span className="grid min-w-0 flex-1 leading-tight">
            <span className="truncate text-sm font-medium text-foreground">Entorno local</span>
            <span className="truncate text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">Solo este equipo</span>
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function WorkbenchHeader({ crumb, actions }: { crumb?: string; actions?: ReactNode }) {
  const pathname = usePathname();
  const section = labelOf(activeHref(pathname));
  /* Las barras fijas de cada vista (p. ej. la de guardar) se colocan bajo la cabecera. */
  useEffect(() => {
    const header = document.querySelector<HTMLElement>("[data-workbench-header]");
    if (!header) return;
    const observer = new ResizeObserver(() =>
      document.documentElement.style.setProperty("--app-header-offset", `${Math.round(header.getBoundingClientRect().height)}px`),
    );
    observer.observe(header);
    return () => observer.disconnect();
  }, []);
  return (
    <header
      data-workbench-header
      className="sticky top-0 z-20 flex min-h-(--header-height) shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b bg-background px-(--app-gutter) py-2 md:rounded-t-xl"
    >
      <SidebarTrigger className="-ml-1" aria-label="Mostrar u ocultar la navegación" />
      <nav aria-label="Ruta" className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
        <span>Workbench</span>
        {section ? (
          <>
            <span aria-hidden className="mx-2 text-border">/</span>
            <span className={crumb ? undefined : "font-medium text-foreground"}>{section}</span>
          </>
        ) : null}
        {crumb ? (
          <>
            <span aria-hidden className="mx-2 text-border">/</span>
            <span className="font-medium text-foreground">{crumb}</span>
          </>
        ) : null}
      </nav>
      {actions}
      <span className="rounded-full border px-2.5 py-1 text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase">Entorno local</span>
    </header>
  );
}

export function WorkbenchShell({ children, crumb, actions, viewerUrl }: { children: ReactNode; crumb?: string; actions?: ReactNode; viewerUrl: string }) {
  return (
    <SidebarProvider className="app-shell" style={{ "--sidebar-width": "16.5rem", "--header-height": "3.5rem" } as CSSProperties}>
      <WorkbenchSidebar viewerUrl={viewerUrl} />
      <SidebarInset className="min-w-0">
        <WorkbenchHeader crumb={crumb} actions={actions} />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
