"use client";

import { useLinkStatus } from "next/link";
import { LoaderCircle, type LucideIcon } from "lucide-react";
import { useEffect } from "react";
import "./navigation-feedback.css";

export type NavigationDestination = { href: string; label: string };
export type NavigationStatusChange = (
  href: string,
  label: string,
  pending: boolean,
) => void;

/** Next owns navigation completion, cancellation and modified clicks. */
export function NavigationLinkContent({
  href,
  label,
  icon: Icon,
  onStatusChange,
}: NavigationDestination & {
  icon: LucideIcon;
  onStatusChange: NavigationStatusChange;
}) {
  const { pending } = useLinkStatus();
  useEffect(() => {
    onStatusChange(href, label, pending);
    return () => onStatusChange(href, label, false);
  }, [href, label, pending, onStatusChange]);

  return (
    <span
      className="navigation-link-content"
      data-pending={pending || undefined}
    >
      {pending ? (
        <LoaderCircle size={14} className="navigation-spinner" aria-hidden />
      ) : (
        <Icon size={14} aria-hidden />
      )}
      <span>{label}</span>
    </span>
  );
}

export function NavigationFeedback({
  destination,
}: {
  destination: NavigationDestination | null;
}) {
  return (
    <>
      {destination && (
        <div className="navigation-progress no-print" aria-hidden>
          <span />
        </div>
      )}
      <div
        className="navigation-status no-print"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-pending={Boolean(destination) || undefined}
      >
        {destination && (
          <>
            <LoaderCircle
              size={16}
              className="navigation-spinner"
              aria-hidden
            />
            <span>Abriendo {destination.label.toLocaleLowerCase("es")}…</span>
          </>
        )}
      </div>
    </>
  );
}
