import type { CSSProperties } from "react";
import "./skeleton.css";

export type SkeletonProps = {
  className?: string;
  style?: CSSProperties;
};

/** Visual placeholder only. Its enclosing region owns the loading announcement. */
export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={["ds-skeleton", className].filter(Boolean).join(" ")}
      style={style}
    />
  );
}

export type DataSkeletonProps = {
  variant: "metric" | "chart" | "table" | "rows";
  rows?: number;
};

/** Shared report shapes; no values, labels, or illustrative data are fabricated. */
export function DataSkeleton({ variant, rows = 6 }: DataSkeletonProps) {
  const rowCount = Number.isFinite(rows)
    ? Math.min(100, Math.max(1, Math.trunc(rows)))
    : 6;

  if (variant === "metric") {
    return (
      <div className="ds-data-skeleton ds-data-skeleton-metric" aria-hidden="true">
        <Skeleton className="ds-skeleton-value" />
        <Skeleton className="ds-skeleton-comparison" />
        <Skeleton className="ds-skeleton-comparison ds-skeleton-comparison-short" />
      </div>
    );
  }

  if (variant === "chart") {
    return (
      <div className="ds-data-skeleton ds-data-skeleton-chart" aria-hidden="true">
        <div className="ds-skeleton-chart-legend">
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
        <div className="ds-skeleton-chart-frame">
          <Skeleton className="ds-skeleton-chart-surface" />
        </div>
        <div className="ds-skeleton-chart-axis">
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`ds-data-skeleton ds-data-skeleton-${variant}`}
      aria-hidden="true"
    >
      {variant === "table" && (
        <div className="ds-skeleton-table-heading">
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      )}
      {Array.from({ length: rowCount }, (_, index) => (
        <div key={index} className="ds-skeleton-data-row">
          <Skeleton />
          {variant === "table" && (
            <>
              <Skeleton />
              <Skeleton />
            </>
          )}
        </div>
      ))}
    </div>
  );
}
