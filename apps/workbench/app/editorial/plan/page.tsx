import type { Metadata } from "next";
import { generalCalendar, generalPlanRows } from "@seo/editorial-ui";
import { EditorialPlan } from "@seo/editorial-ui/plan";
import { ThemeTimeline } from "@seo/editorial-ui/theme-timeline";
import { PlanMeasurements } from "@seo/editorial-ui/plan-measurements";
import { Gauge } from "lucide-react";
import { readMeasurementStore } from "@seo/editorial/measurement-store";
import { FlashMessages } from "@/components/flash-messages";
import { SubmitButton } from "@/components/submit-button";
import { WorkbenchFrame } from "@/components/workbench-frame";
import { getDataset } from "@/lib/editorial";
import { editPieceInWorkbench } from "../actions";
import { measurePublishedPieces } from "./actions";

export const metadata: Metadata = { title: "Plan editorial" };

/**
 * Plan editorial general en el workbench (D-067): el mismo calendario, la misma
 * tabla y los mismos temas que el visor, desde `@seo/editorial-ui`, sobre la
 * curación local. Aquí se trabaja; la sincronización con el visor se pide a
 * Claude Code en el chat (`pnpm editorial:pull` y despliegue), sin botón.
 */
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function WorkbenchPlanPage({ searchParams }: Props) {
  const params = await searchParams;
  const flash = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const measurement = readMeasurementStore();
  const dataset = getDataset();
  const pieces = generalPlanRows(dataset, "all");
  const calendar = generalCalendar(dataset, "all");
  const importedAt = dataset.report.importedAt.slice(0, 10);

  return (
    <WorkbenchFrame
      eyebrow="Workbench · Editorial"
      title="Plan editorial"
      description="Ocho marcas del grupo. Copia de trabajo del plan del visor: estado y fecha de publicación se editan en la tabla."
      aside={
        <form action={measurePublishedPieces} className="wb-card preflight">
          <div className="preflight-head">
            <span className="eyebrow" style={{ margin: 0 }}>Medición de lo publicado</span>
          </div>
          <strong>{measurement ? `${Object.keys(measurement.pieces).length} piezas medidas` : "Sin medir"}</strong>
          <small>{measurement ? `Search Console hasta el ${measurement.cutoff} · ${new Date(measurement.generatedAt).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}` : "Ventanas de 28, 90 y 180 días con dato real"}</small>
          <SubmitButton className="button button-small" pending="Midiendo…">
            <Gauge size={14} aria-hidden /> Medir publicaciones
          </SubmitButton>
        </form>
      }
    >
      <FlashMessages ok={flash("ok")} error={flash("error")} />
      <section className="plan-general" aria-label="Plan editorial de las ocho marcas">
        <EditorialPlan
          pieces={pieces}
          caption="Plan editorial de las ocho marcas"
          origin={{ label: `hoja «Plan editorial» del equipo, importada el ${importedAt}, con la curación local` }}
          calendar={calendar}
          filterable
          showPast
          edit={editPieceInWorkbench}
          exportHref="/api/editorial/plan.xlsx"
          after={<><PlanMeasurements rows={pieces} /><ThemeTimeline themes={dataset.calendar.themes} pieces={pieces} currentMonth={new Date().toISOString().slice(0, 7)} /></>}
        />
      </section>
    </WorkbenchFrame>
  );
}
