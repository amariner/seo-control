"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { LoaderCircle } from "lucide-react";
import { DataSkeleton, Skeleton } from "@seo/ui/skeleton";
import {
  reportNavigationTarget,
  reportPendingMessage,
  reportZonePending,
  type ReportNavigationUpdate,
  type ReportPendingScope,
  type ReportTarget,
} from "./report-navigation-model";
import "./report-navigation.css";

type ReportNavigation = {
  pending: boolean;
  showSkeleton: boolean;
  slow: boolean;
  target: ReportTarget | null;
  navigate: (update: ReportNavigationUpdate) => void;
  refresh: () => void;
};
const NavigationContext = createContext<ReportNavigation | null>(null);
export const useReportNavigation = () => useContext(NavigationContext);

/** Client boundary around server-rendered report slots; the router still owns all data fetching. */
export function ReportNavigationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<ReportTarget | null>(null);
  const requested = useRef<ReportTarget | null>(null);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!pending) {
      requested.current = null;
      setTarget(null);
      setShowSkeleton(false);
      setSlow(false);
      return;
    }
    const skeletonTimer = window.setTimeout(() => setShowSkeleton(true), 160);
    const slowTimer = window.setTimeout(() => setSlow(true), 6000);
    return () => {
      window.clearTimeout(skeletonTimer);
      window.clearTimeout(slowTimer);
    };
  }, [pending]);

  function navigate(update: ReportNavigationUpdate) {
    const next = reportNavigationTarget(
      params.toString(),
      requested.current,
      update,
    );
    if (requested.current?.query === next.query) return;
    // Re-selecting the applied option is a no-op, unless it cancels a pending selection.
    if (
      !requested.current &&
      !next.changes.market &&
      !next.changes.period &&
      !next.changes.tab
    )
      return;
    requested.current = next;
    setTarget(next);
    startTransition(() =>
      router.push(`${pathname}?${next.query}`, { scroll: false }),
    );
  }

  function refresh() {
    const next: ReportTarget = {
      query: params.toString(),
      changes: { market: false, period: false, tab: false, refresh: true },
    };
    requested.current = next;
    setTarget(next);
    startTransition(() => router.refresh());
  }

  return (
    <NavigationContext
      value={{
        pending,
        showSkeleton,
        slow,
        target: pending ? target : null,
        navigate,
        refresh,
      }}
    >
      {children}
    </NavigationContext>
  );
}

export function ReportUpdateStatus() {
  const navigation = useReportNavigation();
  const active = navigation?.pending && navigation.target;
  return (
    <div
      className="report-update-status no-print"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {active ? (
        <>
          <LoaderCircle size={16} aria-hidden className="report-update-icon" />
          <span>
            {reportPendingMessage(active)}
            {navigation.slow && (
              <small>Está tardando más de lo habitual.</small>
            )}
          </span>
        </>
      ) : null}
    </div>
  );
}

/** Preserve each zone's measured layout and mounted chart/table state while concealing stale values. */
export function ReportPendingZone({
  children,
  scope = "selection",
  variant = "table",
  className = "",
}: {
  children: ReactNode;
  scope?: ReportPendingScope;
  variant?: "metric" | "chart" | "table" | "rows";
  className?: string;
}) {
  const navigation = useReportNavigation();
  const busy = Boolean(
    navigation?.pending && reportZonePending(scope, navigation.target),
  );
  const skeleton = busy && navigation?.showSkeleton;
  return (
    <div
      className={`report-pending-zone ${className}`}
      aria-busy={busy}
      data-pending={busy ? (skeleton ? "skeleton" : "waiting") : undefined}
    >
      <div
        className="report-pending-content"
        aria-hidden={busy || undefined}
        inert={busy || undefined}
      >
        {children}
      </div>
      {skeleton && (
        <div className="report-pending-placeholder" aria-hidden>
          <DataSkeleton variant={variant} />
        </div>
      )}
    </div>
  );
}

export function ReportPendingMeta({
  children,
  scope = "selection",
}: {
  children: ReactNode;
  scope?: ReportPendingScope;
}) {
  const navigation = useReportNavigation();
  const busy = Boolean(
    navigation?.pending && reportZonePending(scope, navigation.target),
  );
  return (
    <span
      className="report-pending-meta"
      data-pending={busy || undefined}
      aria-busy={busy}
    >
      <span aria-hidden={busy || undefined}>{children}</span>
      {busy && <Skeleton className="report-pending-meta-line" />}
    </span>
  );
}

export function ReportMarketLabel({ children }: { children: ReactNode }) {
  const navigation = useReportNavigation();
  return (
    <>
      <span className="no-print">
        {navigation?.target?.market?.name ?? children}
      </span>
      <span className="report-applied-print-market">{children}</span>
    </>
  );
}

export function ReportTabLink({
  href,
  tab,
  label,
  active,
  className,
}: {
  href: string;
  tab: string;
  label: string;
  active: boolean;
  className?: string;
}) {
  const navigation = useReportNavigation();
  const opening = navigation?.pending && navigation.target?.tabLabel === label;
  return (
    <Link
      className={className}
      href={href}
      aria-current={active ? "page" : undefined}
      aria-busy={opening || undefined}
      onClick={(event) => {
        if (
          !navigation ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        )
          return;
        event.preventDefault();
        navigation.navigate({ params: { tab }, tabLabel: label });
      }}
    >
      {label}
      {opening && (
        <LoaderCircle className="report-update-icon" size={13} aria-hidden />
      )}
    </Link>
  );
}

export function ReportRetryButton() {
  const navigation = useReportNavigation();
  return (
    <button
      type="button"
      className="ds-button ds-button-compact report-retry"
      onClick={navigation?.refresh}
      disabled={!navigation || navigation.pending}
    >
      {navigation?.pending ? "Actualizando…" : "Reintentar"}
    </button>
  );
}
