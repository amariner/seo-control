"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  Database,
  FileText,
  History,
  House,
  Layers,
  Lightbulb,
  ListChecks,
  Menu,
  Search,
  X,
} from "lucide-react";
import {
  EXPANSION_PROJECTS,
  MARKETS,
  PERIODS,
  PILOT_PROJECTS,
} from "@seo/contracts";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  NavigationFeedback,
  NavigationLinkContent,
  type NavigationDestination,
} from "./navigation-feedback";

const navigation = [
  { href: "/", label: "Inicio", icon: House },
  { href: "/portfolio", label: "Conjunto", icon: Layers },
  { href: "/projects", label: "Proyectos", icon: BarChart3 },
  {
    href: "/editorial/calendario",
    label: "Editorial",
    icon: CalendarDays,
    match: "/editorial",
  },
  { href: "/insights", label: "Evidencias", icon: Lightbulb },
  { href: "/reports", label: "Informes", icon: FileText },
  { href: "/actions", label: "Acciones", icon: ListChecks },
  { href: "/cronologia", label: "Cronología", icon: History },
  { href: "/data", label: "Datos", icon: Database },
];

function isActive(pathname: string, href: string, match?: string) {
  const base = match ?? href;
  return base === "/" ? pathname === "/" : pathname.startsWith(base);
}

/** Los filtros globales (proyecto/mercado/periodo) solo aplican a capítulos de métricas. */
const GLOBAL_FILTER_KEYS = ["project", "market", "period"] as const;

export function AppShell({
  children,
  generatedAt,
  showGlobalFilters = true,
}: {
  children: ReactNode;
  generatedAt?: string;
  showGlobalFilters?: boolean;
}) {
  const searchDialog = useRef<HTMLElement>(null);
  const searchTrigger = useRef<HTMLButtonElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
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
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const project = params.get("project") ?? "all";
  const market = params.get("market") ?? "all";
  const period = params.get("period") ?? "28d";
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!searchOpen && !menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen, menuOpen]);

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

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    next.set(key, value);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  /** Solo se propagan los filtros globales; los filtros locales de cada sección no contaminan otras rutas. */
  const globalQuery = new URLSearchParams();
  for (const key of GLOBAL_FILTER_KEYS) {
    const value = params.get(key);
    if (value) globalQuery.set(key, value);
  }
  const suffix = globalQuery.toString() ? `?${globalQuery.toString()}` : "";

  return (
    <div className={`app-shell ${menuOpen ? "nav-open" : ""}`}>
      <NavigationFeedback destination={destination} />
      <header className="topbar">
        <button
          ref={menuTrigger}
          className="nav-toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="navegacion-principal"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden>
            P
          </span>
          <span className="brand-copy">
            <strong>SEO Intelligence</strong>
            <span>Porcelanosa Grupo</span>
          </span>
        </Link>
        <nav
          className="nav"
          id="navegacion-principal"
          aria-label="Navegación principal"
        >
          {navigation.map(({ href, label, icon: Icon, match }) => (
            <Link
              key={href}
              href={`${href}${suffix}`}
              className={`nav-link ${isActive(pathname, href, match) ? "nav-link-active" : ""}`}
              aria-current={
                isActive(pathname, href, match) ? "page" : undefined
              }
              onNavigate={() => {
                if (menuOpen) {
                  setMenuOpen(false);
                  menuTrigger.current?.focus();
                }
              }}
            >
              <NavigationLinkContent
                href={`${href}${suffix}`}
                label={label}
                icon={Icon}
                onStatusChange={onNavigationStatus}
              />
            </Link>
          ))}
        </nav>
        <div className="topbar-actions">
          <button
            ref={searchTrigger}
            className="search-trigger"
            aria-label="Buscar en informes, insights, URLs e incidencias"
            onClick={() => setSearchOpen(true)}
          >
            <Search size={16} />
          </button>
          <span className="confidential">Confidencial</span>
          <span className="avatar" title="Sesión corporativa">
            SEO
          </span>
        </div>
      </header>
      {showGlobalFilters ? (
        <div className="filterbar" role="region" aria-label="Filtros globales">
          {/* Las ocho marcas son elegibles (D-033). Van en dos grupos porque no son
              equivalentes: las del piloto tienen serie analítica y las otras seis
              solo lo que V1 medía y el calendario editorial. Mezclarlas en una
              lista plana sugeriría que elegir Krion enseña lo mismo que elegir
              Noken, y no es así. */}
          <label className="filter-label">
            <span>Proyecto</span>
            <select
              className="ds-select filter-select"
              value={project}
              onChange={(event) => update("project", event.target.value)}
            >
              <option value="all">Conjunto</option>
              <optgroup label="Con serie analítica">
                {PILOT_PROJECTS.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Sin serie analítica todavía">
                {EXPANSION_PROJECTS.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          <label className="filter-label">
            <span>Mercado</span>
            <select
              className="ds-select filter-select"
              value={market}
              onChange={(event) => update("market", event.target.value)}
            >
              <option value="all">Tier 1 · Todos</option>
              {MARKETS.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-label">
            <span>Periodo</span>
            <select
              className="ds-select filter-select"
              value={period}
              onChange={(event) => update("period", event.target.value)}
            >
              {PERIODS.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <div className="filter-meta">
            <span className="live-dot" aria-hidden /> Último corte válido{" "}
            {generatedAt
              ? new Date(generatedAt).toLocaleDateString("es-ES", {
                  day: "2-digit",
                  month: "short",
                })
              : "—"}
          </div>
        </div>
      ) : null}
      {children}
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
    </div>
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
