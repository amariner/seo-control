import type { ReportOpportunityKind } from "@seo/contracts";

/** Tipos de oportunidad en el orden en que conviene atacarlos. */
export const OPPORTUNITY_KINDS: Array<{
  key: ReportOpportunityKind;
  /** Etiqueta corta del filtro; `name` es la completa para el detalle. */
  label: string;
  name: string;
}> = [
  { key: "ctr", label: "CTR bajo", name: "CTR bajo en top 3" },
  { key: "primera", label: "1.ª página", name: "Primera página" },
  { key: "segunda", label: "2.ª página", name: "Segunda página" },
  { key: "lejos", label: "21–30", name: "Posición 21–30" },
  { key: "defender", label: "Defender", name: "Defender top 3" },
];
