"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useEffect, useRef } from "react";
import {
  EXPANSION_PROJECTS,
  MARKETS,
  PERIODS,
  PILOT_PROJECTS,
} from "@seo/contracts";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useRestoreMenuFocus } from "./app-sidebar";
import { RealtimeVisitors } from "./realtime-visitors";

export function SiteHeader({
  showGlobalFilters,
  crumb,
  controls,
  onSearch,
  searchTrigger,
}: {
  showGlobalFilters: boolean;
  crumb?: string;
  controls?: React.ReactNode;
  onSearch: () => void;
  searchTrigger: React.Ref<HTMLButtonElement>;
}) {
  useRestoreMenuFocus();
  const header = useRef<HTMLElement>(null);
  /* Las pestañas fijas y el panel de detalle se colocan bajo la cabecera, cuya
     altura cambia cuando los filtros pasan a una segunda fila. */
  useEffect(() => {
    const element = header.current;
    if (!element) return;
    const root = document.documentElement;
    const observer = new ResizeObserver(() =>
      root.style.setProperty(
        "--app-header-offset",
        `${Math.round(element.getBoundingClientRect().height)}px`,
      ),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const project = params.get("project") ?? "all";
  const market = params.get("market") ?? "all";
  const period = params.get("period") ?? "28d";
  /* En la ficha de una marca, el tiempo real es el de esa marca; en el resto,
     el del proyecto filtrado o el del conjunto medido. */
  const projectRoute = pathname.match(/^\/projects\/([^/]+)/)?.[1];
  const realtimeProject = projectRoute ?? project;

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    next.set(key, value);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return (
    <header
      ref={header}
      className="no-print sticky top-0 z-20 flex min-h-(--header-height) shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b bg-background px-(--app-gutter) py-2 md:rounded-t-xl"
    >
      <div className="flex min-w-0 flex-[1_1_0%] items-center gap-1 lg:gap-2">
        <SidebarTrigger
          className="-ml-3 size-10"
          aria-label="Abrir o cerrar menú"
          aria-controls="navegacion-principal"
        />
      </div>
      <div
        className={cn(
          "ml-auto flex items-center gap-2 lg:order-last",
          (showGlobalFilters || controls) && "lg:ml-0",
        )}
      >
        <RealtimeVisitors project={realtimeProject} />
        <Button
          ref={searchTrigger}
          variant="ghost"
          size="icon"
          className="-mr-3 size-10"
          aria-label="Buscar en informes, insights, URLs e incidencias"
          onClick={onSearch}
        >
          <Search />
        </Button>
      </div>
      {showGlobalFilters ? (
        <div
          className="grid w-full grid-cols-3 gap-2 lg:ml-auto lg:flex lg:w-auto"
          role="region"
          aria-label="Filtros globales"
        >
          {/* Las ocho marcas son elegibles (D-033), en dos grupos porque no
                son equivalentes: solo el piloto tiene serie analítica. */}
          <Select
            value={project}
            onValueChange={(value) => update("project", value)}
          >
            <SelectTrigger
              aria-label="Proyecto"
              className="h-10 w-full min-w-0 bg-background lg:w-auto lg:min-w-40"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              <SelectItem value="all">Conjunto</SelectItem>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>Con serie analítica</SelectLabel>
                {PILOT_PROJECTS.map((item) => (
                  <SelectItem key={item.slug} value={item.slug}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>Sin serie analítica todavía</SelectLabel>
                {EXPANSION_PROJECTS.map((item) => (
                  <SelectItem key={item.slug} value={item.slug}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            value={market}
            onValueChange={(value) => update("market", value)}
          >
            <SelectTrigger
              aria-label="Mercado"
              className="h-10 w-full min-w-0 bg-background lg:w-auto lg:min-w-40"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              <SelectItem value="all">Tier 1 · Todos</SelectItem>
              {MARKETS.map((item) => (
                <SelectItem key={item.code} value={item.code}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={period}
            onValueChange={(value) => update("period", value)}
          >
            <SelectTrigger
              aria-label="Periodo"
              className="h-10 w-full min-w-0 bg-background lg:w-auto lg:min-w-40"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              {PERIODS.map((item) => (
                <SelectItem key={item.key} value={item.key}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {controls ? (
        <div
          className="header-controls w-full lg:ml-auto lg:w-auto"
          role="region"
          aria-label="Periodo y mercado del informe"
        >
          {controls}
        </div>
      ) : null}
    </header>
  );
}
