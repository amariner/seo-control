"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { ChevronDown, Globe2, LoaderCircle, Search } from "lucide-react";
import type { BrandReport } from "@seo/contracts";
import { ReportPendingMeta, useReportNavigation } from "./report-navigation";

/**
 * Selector de mercado del informe (D-039).
 *
 * No es un desplegable de nombres: cada mercado enseña sus visitas desde
 * buscadores en el periodo, su variación y su peso, para que quien lo abre vea
 * dónde se mueve el tráfico antes de filtrar. Cada fila dice también qué parte
 * de la web cuenta como ese mercado, porque «Reino Unido» no significa lo mismo
 * en todas las marcas (Noken: /en_gb; Xtone: /en + usuarios de Reino Unido).
 *
 * Teclado: flechas para moverse, Intro para elegir, Esc para cerrar. El
 * buscador aparece cuando la lista es larga (Porcelanosa tiene 18 mercados).
 */

type Market = BrandReport["markets"][number];

const nf = (value: number) =>
  new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 0,
    useGrouping: "always" as unknown as boolean,
  }).format(value);
const pct = (value: number, base: number) =>
  base ? ((value - base) / base) * 100 : null;
const normalize = (value: string) =>
  value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function ChangeText({ value }: { value: number | null }) {
  if (value === null) return <span className="muted">sin dato</span>;
  const sign = value > 0.05 ? "+" : value < -0.05 ? "−" : "";
  return (
    <span className={value >= 0 ? "delta-good" : "delta-bad"}>
      {sign}
      {Math.abs(value).toLocaleString("es-ES", { maximumFractionDigits: 1 })} %
    </span>
  );
}

export function MarketPicker({
  markets,
  selected,
  totalSessions,
  totalPrevious,
  comparisonLabel,
  compact = false,
  variant = "bar",
}: {
  markets: Market[];
  selected: string;
  totalSessions: number | null;
  totalPrevious: number | null;
  comparisonLabel: string;
  compact?: boolean;
  /** `header`: una sola línea en la barra superior (D-044). */
  variant?: "bar" | "header";
}) {
  const inHeader = variant === "header";
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const navigation = useReportNavigation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);

  const displayedCode = navigation?.target?.market?.code ?? selected;
  const current =
    markets.find((market) => market.code === displayedCode) ?? null;
  const displayed = navigation?.target?.market ?? current;
  const busy = Boolean(
    navigation?.pending && navigation.target?.changes.market,
  );
  const periodPending = Boolean(
    navigation?.pending &&
    (navigation.target?.changes.period || navigation.target?.changes.refresh),
  );
  const maxSessions = Math.max(1, ...markets.map((market) => market.sessions));
  const sumSessions = markets.reduce(
    (total, market) => total + market.sessions,
    0,
  );

  const groups = useMemo(() => {
    const term = normalize(query.trim());
    const match = (market: Market) =>
      !term ||
      normalize(`${market.name} ${market.code} ${market.definition}`).includes(
        term,
      );
    const sorted = (rows: Market[]) =>
      [...rows].sort((a, b) => b.sessions - a.sessions);
    return [
      {
        key: "tier1",
        label: "Mercados principales",
        rows: sorted(markets.filter((market) => market.tier1 && match(market))),
      },
      {
        key: "otros",
        label: "Otros mercados",
        rows: sorted(
          markets.filter((market) => !market.tier1 && match(market)),
        ),
      },
    ].filter((group) => group.rows.length);
  }, [markets, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const onClick = (event: MouseEvent) => {
      if (
        panel.current &&
        !panel.current.contains(event.target as Node) &&
        !trigger.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    // El foco entra en la opción activa: con teclado se puede elegir sin buscarla.
    requestAnimationFrame(() =>
      (
        list.current?.querySelector<HTMLButtonElement>(
          '[aria-selected="true"]',
        ) ?? list.current?.querySelector<HTMLButtonElement>("button")
      )?.focus(),
    );
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function choose(code: string) {
    const market = markets.find((item) => item.code === code);
    if (navigation) {
      navigation.navigate({
        params: { market: code === "all" ? null : code },
        market: {
          code,
          name: market?.name ?? "Todos los mercados",
          definition: market?.definition ?? "Todas las secciones de la web",
        },
      });
    } else {
      const next = new URLSearchParams(params.toString());
      if (code === "all") next.delete("market");
      else next.set("market", code);
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    }
    setOpen(false);
    trigger.current?.focus();
  }

  function onKey(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      trigger.current?.focus();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const options = [
      ...(list.current?.querySelectorAll<HTMLButtonElement>("[role=option]") ??
        []),
    ];
    const index = options.indexOf(document.activeElement as HTMLButtonElement);
    options[
      Math.max(
        0,
        Math.min(
          options.length - 1,
          index + (event.key === "ArrowDown" ? 1 : -1),
        ),
      )
    ]?.focus();
  }

  const selectedSessions = current ? current.sessions : totalSessions;
  const selectedChange = current
    ? pct(current.sessions, current.previous)
    : totalSessions !== null && totalPrevious !== null
      ? pct(totalSessions, totalPrevious)
      : null;

  return (
    <div className="market-anchor">
      <span
        className={inHeader ? "ds-sr-only" : "range-label"}
        id="mercado-label"
      >
        Mercado
      </span>
      <button
        ref={trigger}
        type="button"
        className="range-trigger market-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby="mercado-label mercado-valor"
        aria-busy={busy || undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <Globe2 size={16} aria-hidden />
        <span className="range-trigger-main" id="mercado-valor">
          <strong>{displayed?.name ?? "Todos los mercados"}</strong>
          {displayed && displayedCode !== "all" && !compact
            ? ` · ${displayed.definition}`
            : ""}
        </span>
        <span className={inHeader ? "ds-sr-only" : "range-trigger-sub"}>
          {compact ? (
            (displayed?.definition ?? "Todas las secciones de la web")
          ) : (
            <ReportPendingMeta scope="period">
              {selectedSessions === null
                ? "—"
                : `${nf(selectedSessions)} visitas desde buscadores`}{" "}
              · <ChangeText value={selectedChange} /> vs. {comparisonLabel}
            </ReportPendingMeta>
          )}
        </span>
        {busy ? (
          <LoaderCircle size={16} className="report-update-icon" aria-hidden />
        ) : (
          <ChevronDown size={16} aria-hidden />
        )}
      </button>

      {open ? (
        <div
          ref={panel}
          className="market-panel ds-overlay"
          role="dialog"
          aria-label="Elegir mercado"
          onKeyDown={onKey}
        >
          {markets.length > 7 ? (
            <label className="market-search">
              <Search size={15} aria-hidden />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar mercado o sección de la web"
                aria-label="Buscar mercado"
              />
            </label>
          ) : null}
          <div
            ref={list}
            role="listbox"
            aria-label="Mercados"
            className="market-list"
          >
            <button
              type="button"
              role="option"
              aria-selected={displayedCode === "all"}
              className={`market-option market-option-all ${displayedCode === "all" ? "is-active" : ""}`}
              onClick={() => choose("all")}
            >
              <span className="market-code">—</span>
              <span className="market-name">
                <strong>Todos los mercados</strong>
                <small>
                  Toda la web, incluidas las secciones sin mercado asignado
                </small>
              </span>
              <span className="market-value">
                <ReportPendingMeta scope="period">
                  {totalSessions === null ? "—" : nf(totalSessions)}
                </ReportPendingMeta>
              </span>
              <span className="market-change">
                <ReportPendingMeta scope="period">
                  <ChangeText
                    value={
                      totalSessions !== null && totalPrevious !== null
                        ? pct(totalSessions, totalPrevious)
                        : null
                    }
                  />
                </ReportPendingMeta>
              </span>
              <span className="market-share" aria-hidden />
            </button>
            {groups.map((group) => (
              <div key={group.key} role="group" aria-label={group.label}>
                <p className="market-group">{group.label}</p>
                {group.rows.map((market) => {
                  const share = sumSessions
                    ? (market.sessions / sumSessions) * 100
                    : 0;
                  return (
                    <button
                      key={market.code}
                      type="button"
                      role="option"
                      aria-selected={displayedCode === market.code}
                      className={`market-option ${displayedCode === market.code ? "is-active" : ""}`}
                      onClick={() => choose(market.code)}
                    >
                      <span className="market-code">{market.code}</span>
                      <span className="market-name">
                        <strong>{market.name}</strong>
                        <small>{market.definition}</small>
                      </span>
                      <span className="market-value">
                        <ReportPendingMeta scope="period">
                          {nf(market.sessions)}
                        </ReportPendingMeta>
                      </span>
                      <span className="market-change">
                        <ReportPendingMeta scope="period">
                          <ChangeText
                            value={pct(market.sessions, market.previous)}
                          />
                        </ReportPendingMeta>
                      </span>
                      <span
                        className="market-share"
                        aria-hidden={periodPending || undefined}
                        title={
                          periodPending
                            ? undefined
                            : `${share.toLocaleString("es-ES", { maximumFractionDigits: 1 })} % de las visitas de los mercados`
                        }
                      >
                        <span
                          style={{
                            width: `${(market.sessions / maxSessions) * 100}%`,
                            visibility: periodPending ? "hidden" : undefined,
                          }}
                        />
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
            {!groups.length ? (
              <p className="market-empty">
                Ningún mercado coincide con «{query}».
              </p>
            ) : null}
          </div>
          <p className="market-foot">
            {periodPending ? (
              "Actualizando las cifras del periodo seleccionado."
            ) : (
              <>
                Visitas desde buscadores del periodo y variación frente al{" "}
                {comparisonLabel}.
              </>
            )}{" "}
            Cada mercado es una sección de la web; cuando dos comparten sección,
            se separan por el país del usuario.
          </p>
        </div>
      ) : null}
    </div>
  );
}
