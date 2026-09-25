"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Check, ChevronsUpDown, LoaderCircle, LogOut } from "lucide-react";
import { EXPANSION_PROJECTS, PILOT_PROJECTS, findBrand } from "@seo/contracts";
import { useEffect, useState, useTransition, type ComponentProps } from "react";
import { signOutAction } from "@/lib/auth-actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  NAVIGATION,
  SECONDARY_NAVIGATION,
  isActive,
  type NavItem,
} from "@/lib/navigation";
import {
  NavigationLinkContent,
  type NavigationStatusChange,
} from "./navigation-feedback";

/*
 * D-043: al navegar desde la hoja móvil, el foco vuelve al botón del menú.
 * Cada página monta su propio AppShell, así que la intención se guarda aquí y
 * la aplica la cabecera de destino al montarse.
 */
let restoreMenuFocus = false;
const focusMenuTrigger = () =>
  document
    .querySelector<HTMLButtonElement>('[data-sidebar="trigger"]')
    ?.focus();

export function useRestoreMenuFocus() {
  useEffect(() => {
    if (!restoreMenuFocus) return;
    restoreMenuFocus = false;
    focusMenuTrigger();
  }, []);
}

export function AppSidebar({
  suffix,
  onNavigationStatus,
  ...props
}: ComponentProps<typeof Sidebar> & {
  /** Filtros globales que se propagan a cada destino. */
  suffix: string;
  onNavigationStatus: NavigationStatusChange;
}) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  const closeMobile = () => {
    if (!isMobile) return;
    setOpenMobile(false);
    restoreMenuFocus = true;
    requestAnimationFrame(focusMenuTrigger);
  };

  const renderItem = (item: NavItem) => {
    if (item.href === "/projects")
      return (
        <ProjectSelector
          key={item.href}
          item={item}
          suffix={suffix}
          onNavigationStatus={onNavigationStatus}
          onNavigate={closeMobile}
        />
      );
    const { href, label, icon, match } = item;
    const active = isActive(pathname, href, match);
    return (
      <SidebarMenuItem key={href}>
        <SidebarMenuButton
          asChild
          isActive={active}
          tooltip={label}
          className="h-10 font-medium text-sidebar-foreground data-[active=true]:bg-background data-[active=true]:text-primary data-[active=true]:shadow-xs"
        >
          <Link
            href={`${href}${suffix}`}
            aria-current={active ? "page" : undefined}
            onNavigate={closeMobile}
          >
            <NavigationLinkContent
              href={`${href}${suffix}`}
              label={label}
              icon={icon}
              iconSize={16}
              onStatusChange={onNavigationStatus}
            />
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="h-auto gap-3 p-2 hover:bg-transparent"
            >
              <Link href={`/${suffix}`}>
                <span
                  aria-hidden
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-ink font-serif text-base text-white"
                >
                  P
                </span>
                <span className="grid min-w-0 leading-tight">
                  <strong className="truncate text-sm font-semibold text-foreground">
                    SEO Intelligence
                  </strong>
                  <span className="truncate text-xs tracking-[0.08em] text-muted-foreground uppercase">
                    Porcelanosa Grupo
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <nav
          id="navegacion-principal"
          aria-label="Navegación principal"
          className="contents"
        >
          {NAVIGATION.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>{group.items.map(renderItem)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <SidebarMenu>{SECONDARY_NAVIGATION.map(renderItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </nav>
      </SidebarContent>
      <SidebarFooter>
        <SessionFooter />
      </SidebarFooter>
    </Sidebar>
  );
}

/**
 * «Proyectos» como selector (D-044): el botón muestra la marca abierta y la
 * lista permite cambiar de marca o volver al listado. Sustituye a la miga de
 * pan de la cabecera como indicación de dónde está el usuario.
 */
function ProjectSelector({
  item,
  suffix,
  onNavigationStatus,
  onNavigate,
}: {
  item: NavItem;
  suffix: string;
  onNavigationStatus: NavigationStatusChange;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const slug = pathname.match(/^\/projects\/([^/]+)/)?.[1];
  const selected = slug ? findBrand(slug) : null;
  const active = isActive(pathname, item.href);
  const label = selected?.name ?? item.label;
  const Icon = item.icon;

  useEffect(() => {
    onNavigationStatus(item.href, "Proyectos", pending);
  }, [item.href, onNavigationStatus, pending]);

  const go = (href: string) => {
    onNavigate();
    startTransition(() => router.push(`${href}${suffix}`));
  };

  const option = (href: string, name: string, current: boolean) => (
    <DropdownMenuItem key={href} onSelect={() => go(href)}>
      <span className="flex-1">{name}</span>
      {current ? <Check className="text-primary" aria-hidden /> : null}
    </DropdownMenuItem>
  );

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            isActive={active}
            tooltip={label}
            aria-label={`Proyecto: ${label}. Cambiar de proyecto`}
            className="h-10 font-medium text-sidebar-foreground data-[active=true]:bg-background data-[active=true]:text-primary data-[active=true]:shadow-xs"
          >
            {pending ? (
              <LoaderCircle className="navigation-spinner" aria-hidden />
            ) : (
              <Icon aria-hidden />
            )}
            <span className="flex-1 truncate">{label}</span>
            <ChevronsUpDown className="ml-auto size-4 opacity-60" aria-hidden />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="min-w-56">
          {option("/projects", "Todos los proyectos", active && !selected)}
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Con serie analítica
            </DropdownMenuLabel>
            {PILOT_PROJECTS.map((brand) =>
              option(
                `/projects/${brand.slug}`,
                brand.name,
                brand.slug === slug,
              ),
            )}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Sin serie analítica todavía
            </DropdownMenuLabel>
            {EXPANSION_PROJECTS.map((brand) =>
              option(
                `/projects/${brand.slug}`,
                brand.name,
                brand.slug === slug,
              ),
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}

/**
 * Pie con la cuenta en sesión y la salida (D-047). La sesión se lee de
 * `/api/auth/session` para no convertir cada AppShell en dinámico. Sin sesión
 * (acceso público temporal o bypass de desarrollo) no se ofrece «Cerrar sesión».
 */
function SessionFooter() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session")
      .then((response) => (response.ok ? response.json() : null))
      .then((session: { user?: { email?: string } } | null) => {
        if (!cancelled) setEmail(session?.user?.email ?? null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex items-center gap-3 rounded-lg p-2">
      <span
        aria-hidden
        className="grid size-8 shrink-0 place-items-center rounded-full bg-sidebar-accent text-xs font-bold text-foreground"
      >
        {email ? email.slice(0, 1).toUpperCase() : "SEO"}
      </span>
      <span className="grid min-w-0 flex-1 leading-tight">
        <span className="truncate text-sm font-medium text-foreground">
          {email ?? "Sesión corporativa"}
        </span>
        <span className="truncate text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          Confidencial
        </span>
      </span>
      {email ? (
        <form action={signOutAction}>
          <button
            type="submit"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
          >
            <LogOut className="size-4" aria-hidden />
          </button>
        </form>
      ) : null}
    </div>
  );
}
