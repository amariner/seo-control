"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Copia el brief como texto plano, con el título delante. */
export function BriefCopy({ title, text }: { title: string | null; text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(title ? `${title}\n\n${text}` : text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  return (
    <button type="button" className="brand-brief-copy" onClick={copy} aria-live="polite">
      {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}
