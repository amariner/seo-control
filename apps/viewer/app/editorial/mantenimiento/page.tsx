import type { Metadata } from "next";
import { EDITORIAL_BRANDS, PILOT_PROJECTS, isPilotProject, type BrandSlug, type EditorialPieceType } from "@seo/contracts";
import { generalPlanRows } from "@seo/editorial-ui";
import { recentChanges } from "@seo/reports/content-maintenance";
import { EditorialFrame } from "@/components/editorial/editorial-frame";
import { EditorialToolbar } from "@/components/editorial/editorial-toolbar";
import { MaintenanceView } from "@/components/editorial/maintenance";
import { getBrandMaintenance } from "@/lib/content-maintenance";
import { getEditorial, getLiveEditorial, parseBrand, type SearchInput } from "@/lib/editorial";

export const metadata: Metadata = { title: "Mantenimiento editorial" };

const BASE = "/editorial/mantenimiento";

/**
 * Mantenimiento del plan editorial (D-095): lo publicado o actualizado de las
 * ocho marcas y, en las del piloto, los posts que potenciar y los candidatos
 * a retirar, con Search Console y los sitemaps del crawl publicado.
 */
export default async function MaintenancePage({ searchParams }: { searchParams: Promise<SearchInput> }) {
  const input = await searchParams;
  const brand = parseBrand(input);
  const today = new Date().toISOString().slice(0, 10);
  const dataset = getEditorial();
  const live = await getLiveEditorial();
  const types = new Map<string, EditorialPieceType>([...live.dataset.plan, ...live.dataset.backlog].map((piece) => [piece.id, piece.type]));
  const changes = recentChanges(generalPlanRows(live.dataset, brand, live.pending), types, today);
  const analytic: BrandSlug[] = brand === "all" ? PILOT_PROJECTS.map((item) => item.slug) : isPilotProject(brand) ? [brand as BrandSlug] : [];
  const maintenance = await Promise.all(analytic.map((slug) => getBrandMaintenance(slug, generalPlanRows(live.dataset, slug, live.pending), today)));

  return (
    <EditorialFrame
      dataset={dataset}
      current={BASE}
      title="Mantenimiento"
      description="Lo publicado, lo que potenciar y lo que retirar de los blogs."
      simple={{
        note: "Posts del plan y de los blogs",
        meta: (
          <>
            Plan editorial del equipo<span aria-hidden>·</span>Search Console del Trendbook y los blogs del piloto<span aria-hidden>·</span>sitemaps de los crawls publicados
          </>
        ),
      }}
    >
      <EditorialToolbar
        selects={[{ key: "brand", label: "Marca", value: brand, allLabel: "Todas las marcas", options: EDITORIAL_BRANDS.map((item) => ({ value: item.slug, label: item.name })) }]}
      />
      <MaintenanceView brand={brand} changes={changes} maintenance={maintenance} exportQuery={brand === "all" ? "" : `?brand=${brand}`} />
    </EditorialFrame>
  );
}
