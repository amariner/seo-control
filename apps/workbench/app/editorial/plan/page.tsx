import type { Metadata } from "next";
import { generalCalendar, generalPlanRows } from "@seo/editorial-ui";
import { EditorialPlan } from "@seo/editorial-ui/plan";
import { ThemeTimeline } from "@seo/editorial-ui/theme-timeline";
import { WorkbenchFrame } from "@/components/workbench-frame";
import { getDataset } from "@/lib/editorial";
import { editPieceInWorkbench } from "../actions";

export const metadata: Metadata = { title: "Plan editorial · Workbench" };

/**
 * Plan editorial general en el workbench (D-067): el mismo calendario, la misma
 * tabla y los mismos temas que el visor, desde `@seo/editorial-ui`, sobre la
 * curación local. Aquí se trabaja; la sincronización con el visor se pide a
 * Claude Code en el chat (`pnpm editorial:pull` y despliegue), sin botón.
 */
export default function WorkbenchPlanPage() {
  const dataset = getDataset();
  const pieces = generalPlanRows(dataset, "all");
  const calendar = generalCalendar(dataset, "all");
  const importedAt = dataset.report.importedAt.slice(0, 10);

  return (
    <WorkbenchFrame
      eyebrow="Workbench · Editorial"
      title="Plan editorial"
      description="Ocho marcas del grupo. Copia de trabajo del plan del visor: estado y fecha de publicación se editan en la tabla."
      subtitle="Plan editorial"
      current="/editorial/plan"
    >
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
          after={<ThemeTimeline themes={dataset.calendar.themes} pieces={pieces} currentMonth={new Date().toISOString().slice(0, 7)} />}
        />
      </section>
    </WorkbenchFrame>
  );
}
