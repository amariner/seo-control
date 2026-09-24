"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import {
  NavigationFeedback,
  type NavigationDestination,
} from "./navigation-feedback";
import { SiteHeader } from "./site-header";

/** Los filtros globales (proyecto/mercado/periodo) solo aplican a capítulos de métricas. */
const GLOBAL_FILTER_KEYS = ["project", "market", "period"] as const;

export function AppShell({
  children,
  showGlobalFilters = true,
  crumb,
  headerControls,
}: {
  children: ReactNode;
  /** Se conserva por compatibilidad: el corte ya no se pinta en la cabecera (D-044). */
  generatedAt?: string;
  showGlobalFilters?: boolean;
  /** Título de la ficha para el último nivel de la ruta de la cabecera. */
  crumb?: string;
  /** Controles propios de la vista en la barra superior (periodo y mercado del informe). */
  headerControls?: ReactNode;
}) {
  const searchDialog = useRef<HTMLElement>(null);
  const searchTrigger = useRef<HTMLButtonElement>(null);
  const [destination, setDestination] = useState<NavigationDestination | null>(
    null,
  );
  const onNavigationStatus = useCallback(
    (href: string, label: string, pending: boolean) => {
      setDestination((current) =>
        pending ? { href, label } : current?.href === href ? null : current,
      );
    },
    [],
  );
  const params = useSearchParams();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<
    Array<{
      type: string;
      id: string;
      title: string;
      subtitle: string;
      href: string;
    }>
  >([]);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(
      () =>
        fetch(`/api/v1/search?q=${encodeURIComponent(searchQuery)}`, {
          signal: controller.signal,
        })
          .then((response) => response.json())
          .then((body) => setResults(body.items ?? []))
          .catch(() => {}),
      180,
    );
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  useEffect(() => {
    if (!searchOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const onTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const controls = searchDialog.current?.querySelectorAll<HTMLElement>(
        'a[href], button, input, select, [tabindex="0"]',
      );
      const first = controls?.[0];
      const last = controls?.[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", onTab);
    return () => {
      window.removeEventListener("keydown", onTab);
      searchTrigger.current?.focus();
    };
  }, [searchOpen]);

  /** Solo se propagan los filtros globales; los filtros locales de cada sección no contaminan otras rutas. */
  const globalQuery = new URLSearchParams();
  for (const key of GLOBAL_FILTER_KEYS) {
    const value = params.get(key);
    if (value) globalQuery.set(key, value);
  }
  const suffix = globalQuery.toString() ? `?${globalQuery.toString()}` : "";

  const openSearch = useCallback(() => setSearchOpen(true), []);

  return (
    <SidebarProvider
      className="app-shell"
      style={
        {
          "--sidebar-width": "16.5rem",
          "--header-height": "3.5rem",
        } as CSSProperties
      }
    >
      <NavigationFeedback destination={destination} />
      <AppSidebar
        variant="inset"
        suffix={suffix}
        onNavigationStatus={onNavigationStatus}
      />
      <SidebarInset className="min-w-0">
        <SiteHeader
          showGlobalFilters={showGlobalFilters}
          crumb={crumb}
          controls={headerControls}
          onSearch={openSearch}
          searchTrigger={searchTrigger}
        />
        {children}
      </SidebarInset>
      {searchOpen ? (
        <div
          className="search-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSearchOpen(false);
          }}
        >
          <section
            ref={searchDialog}
            className="search-dialog ds-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Búsqueda cruzada"
          >
            <div className="search-input-wrap">
              <Search size={17} />
              <input
                autoFocus
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Buscar insight, informe, URL, incidencia o pieza editorial…"
                aria-label="Texto de búsqueda"
              />
              <button
                onClick={() => setSearchOpen(false)}
                aria-label="Cerrar búsqueda"
              >
                Esc
              </button>
            </div>
            <div className="search-results">
              {searchQuery.length < 2 ? (
                <p>Escribe al menos dos caracteres.</p>
              ) : results.length ? (
                results.map((result) => (
                  <Link
                    href={result.href}
                    key={`${result.type}-${result.id}`}
                    onClick={() => setSearchOpen(false)}
                  >
                    <BadgeLabel type={result.type} />
                    <span>
                      <strong>{result.title}</strong>
                      <small>{result.subtitle}</small>
                    </span>
                  </Link>
                ))
              ) : (
                <p>No hay resultados en el contenido curado.</p>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </SidebarProvider>
  );
}

function BadgeLabel({ type }: { type: string }) {
  return (
    <span className="search-type">
      {type === "page"
        ? "URL"
        : type === "issue"
          ? "Técnica"
          : type === "report"
            ? "Informe"
            : type === "editorial"
              ? "Editorial"
              : "Insight"}
    </span>
  );
}
