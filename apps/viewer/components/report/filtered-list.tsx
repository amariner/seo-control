"use client";

import { Fragment, useState, type ReactNode } from "react";
import { ExpandableList } from "./expandable-table";

/**
 * Lista compacta con filtro por tipo encima. Las filas llegan ya renderizadas
 * del servidor; aquí solo se filtran. Los tipos sin filas no se ofrecen.
 */
export function FilteredList({
  label,
  options,
  rows,
  head,
}: {
  label: string;
  options: Array<{ key: string; label: string }>;
  rows: Array<{ id: string; kind: string; node: ReactNode }>;
  head: ReactNode;
}) {
  const [kind, setKind] = useState("all");
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.kind, (counts.get(row.kind) ?? 0) + 1);
  const visible =
    kind === "all" ? rows : rows.filter((row) => row.kind === kind);
  return (
    <>
      <div className="brand-list-filter" role="group" aria-label={label}>
        <button
          type="button"
          aria-pressed={kind === "all"}
          onClick={() => setKind("all")}
        >
          Todas <span>{rows.length}</span>
        </button>
        {options
          .filter((item) => counts.get(item.key))
          .map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={kind === item.key}
              onClick={() => setKind(item.key)}
            >
              {item.label} <span>{counts.get(item.key)}</span>
            </button>
          ))}
      </div>
      {head}
      <ExpandableList
        key={kind}
        className="brand-list"
        visible={8}
        rows={visible.map((row) => (
          <Fragment key={row.id}>{row.node}</Fragment>
        ))}
      />
    </>
  );
}
