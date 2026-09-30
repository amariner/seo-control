"use client";

import { useOptimistic, useState, useTransition } from "react";
import { EDITORIAL_STATUS_LABELS, editorialStatusSchema, type EditorialStatus } from "@seo/contracts";
import { statusTone } from "./rows";

/** Cambio de estado o de fecha de redacción o publicación de una pieza (D-067, D-084). */
export type PieceEdit = { status?: EditorialStatus; publicationDate?: string; writingDate?: string };
export type PieceEditResult = { ok: true } | { ok: false; error: string };
export type PieceEditAction = (pieceId: string, edit: PieceEdit) => Promise<PieceEditResult>;

/** Estados que se pueden elegir; «Sin estado» solo aparece si la pieza ya lo tiene. */
const CHOICES = editorialStatusSchema.options.filter((status) => status !== "desconocido");


function useEdit(pieceId: string, action: PieceEditAction) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (edit: PieceEdit, optimistic: () => void) =>
    start(async () => {
      setError(null);
      optimistic();
      const result = await action(pieceId, edit);
      if (!result.ok) setError(result.error);
    });
  return { pending, error, run };
}

/** Selector de estado en la celda de la tabla; guarda al cambiar. */
export function StatusEditor({ pieceId, value, label, action }: { pieceId: string; value: EditorialStatus; label: string; action: PieceEditAction }) {
  const [current, setCurrent] = useOptimistic(value);
  const { pending, error, run } = useEdit(pieceId, action);
  return (
    <span className={`plan-status plan-edit is-${statusTone(current)}${pending ? " is-saving" : ""}${error ? " is-error" : ""}`} title={error ?? undefined}>
      <select
        className="plan-status-select"
        value={current}
        aria-label={`Estado de «${label}»`}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value as EditorialStatus;
          run({ status: next }, () => setCurrent(next));
        }}
      >
        {current === "desconocido" ? <option value="desconocido" disabled>{EDITORIAL_STATUS_LABELS.desconocido}</option> : null}
        {CHOICES.map((status) => (
          <option key={status} value={status}>
            {EDITORIAL_STATUS_LABELS[status]}
          </option>
        ))}
      </select>
      {error ? <span className="plan-edit-error" role="alert">{error}</span> : null}
    </span>
  );
}

const validDate = (value: string) => /^20\d{2}-\d{2}-\d{2}$/.test(value);

type DateEditorProps = { pieceId: string; value: string | null; label: string; action: PieceEditAction };

/** Fecha de publicación en la celda; al fijarla, la pieza entra en el calendario. */
export const PublicationDateEditor = (props: DateEditorProps) => <DateEditor {...props} field="publicationDate" />;

/** Fecha de redacción en la celda (D-084). */
export const WritingDateEditor = (props: DateEditorProps) => <DateEditor {...props} field="writingDate" />;

const FIELD_LABEL = { publicationDate: "Fecha de publicación", writingDate: "Fecha de redacción" } as const;

/**
 * Fecha editable en la celda. Guarda al salir del campo o con Intro: Chrome
 * emite `change` por cada dígito del año («0002», «0020»…) y guardar en
 * `change` escribiría fechas a medias.
 */
function DateEditor({ pieceId, value, label, action, field }: DateEditorProps & { field: keyof typeof FIELD_LABEL }) {
  const [draft, setDraft] = useState(value ?? "");
  const [saved, setSaved] = useOptimistic(value ?? "");
  const { pending, error, run } = useEdit(pieceId, action);
  const commit = () => {
    // Vaciar la fecha no se guarda: el plan importado puede traer una y desde aquí no se borra.
    if (!validDate(draft) || draft === saved) return setDraft(saved);
    run({ [field]: draft }, () => setSaved(draft));
  };
  return (
    <span className={`plan-edit${pending ? " is-saving" : ""}${error ? " is-error" : ""}`} title={error ?? undefined}>
      <input
        type="date"
        className="plan-date-input"
        value={draft}
        min="2020-01-01"
        max="2100-12-31"
        aria-label={`${FIELD_LABEL[field]} de «${label}»`}
        disabled={pending}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
          if (event.key === "Escape") setDraft(saved);
        }}
      />
      {error ? <span className="plan-edit-error" role="alert">{error}</span> : null}
    </span>
  );
}
