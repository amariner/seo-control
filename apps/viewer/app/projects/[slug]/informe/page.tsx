import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findBrand, isPilotProject, projectSlugSchema, type BrandReport, type BrandSlug } from "@seo/contracts";
import { getPublishedAudit } from "@seo/site-audit/published";
import { BRAND_LOGOS } from "@/components/report/brand-report";
import { ProjectDeck } from "@/components/report/project-deck";
import { getBrandReport, projectEditorial } from "@/lib/brand-report";
import { buildCuratedReport, parsePeriod, periodIdOf, reportIdOf, snapshotInput } from "@seo/reports";
import { rootLabelOf } from "@seo/reports/page-analysis";
import { getPublishedReport, getPublishedSnapshot } from "@seo/reports/published";

/**
 * Informe del proyecto (D-073): presentación a pantalla completa, sin shell.
 * `?pdf=1` abre el diálogo de impresión al cargar (PDF al estilo de la V1).
 * Periodo y mercado llegan en la URL, igual que en la ficha del proyecto.
 *
 * D-076: con `?periodo=2026-Q2` y todos los mercados se sirve la versión
 * congelada en el workbench si existe; si no, el informe en vivo de ese
 * periodo. En los dos casos se aplican las puntualizaciones del equipo.
 */
const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const pickOne = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

type Loaded = { report: BrandReport; input: Parameters<typeof buildCuratedReport>[0] | null; frozen?: { generatedBy: string } };

/** Versión congelada del periodo pedido (solo con todos los mercados) o informe en vivo. */
async function loadReport(slug: BrandSlug, filters: Record<string, string | string[] | undefined>): Promise<Loaded | null> {
  const periodo = pickOne(filters.periodo);
  const period = periodo ? parsePeriod(periodo) : null;
  const market = pickOne(filters.market);
  const snapshot = period && (!market || market === "all") ? getPublishedSnapshot(slug, period.id) : null;
  if (snapshot) return { report: snapshot.report, input: snapshotInput(snapshot), frozen: { generatedBy: snapshot.generatedBy } };
  const live = period ? { ...filters, range: "custom", from: period.start, to: period.end } : filters;
  const report = await getBrandReport(slug, live);
  return report ? { report, input: null } : null;
}

/** Nombre del PDF, como en la V1: el navegador propone `document.title` al guardar. */
function filenameOf(report: BrandReport) {
  const brand = findBrand(report.brand)!;
  const market = report.markets.find((item) => item.code === report.market)?.name ?? "Todos los mercados";
  return `informe-seo-${slugify(brand.name)}-${slugify(market)}-${report.window.start}_${report.window.end}`;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = projectSlugSchema.safeParse(rawSlug);
  if (!slug.success || !isPilotProject(slug.data)) return {};
  const loaded = await loadReport(slug.data, await searchParams);
  return loaded ? { title: { absolute: filenameOf(loaded.report) } } : {};
}

export default async function ProjectReportPage({
  params,
  searchParams,
}: Props) {
  const { slug: rawSlug } = await params;
  const slug = projectSlugSchema.safeParse(rawSlug);
  if (!slug.success || !isPilotProject(slug.data)) notFound();
  const filters = await searchParams;
  const loaded = await loadReport(slug.data, filters);
  if (!loaded) notFound();
  const { report } = loaded;
  const input = loaded.input ?? {
    report,
    pieces: (await projectEditorial(slug.data)).pieces,
    audit: getPublishedAudit(slug.data),
    rootLabel: rootLabelOf(report.markets),
    today: new Date().toISOString().slice(0, 10),
  };
  const periodId = periodIdOf(report.window.start, report.window.end);
  const curation = periodId ? getPublishedReport(reportIdOf(slug.data, periodId))?.curation : undefined;
  const slides = buildCuratedReport(input, curation);
  const brand = findBrand(report.brand)!;
  const marketName = report.markets.find((item) => item.code === report.market)?.name ?? "Todos los mercados";
  const pdf = (Array.isArray(filters.pdf) ? filters.pdf[0] : filters.pdf) === "1";
  const back = new URLSearchParams(
    Object.entries(filters).flatMap(([key, value]) =>
      key === "pdf" || key === "periodo" || value === undefined ? [] : [[key, Array.isArray(value) ? value[0]! : value]],
    ),
  );
  back.set("tab", "informes");
  return (
    <ProjectDeck
      report={report}
      slides={slides}
      logo={BRAND_LOGOS[brand.slug]}
      marketName={marketName}
      filename={filenameOf(report)}
      autoPrint={pdf}
      backHref={`/projects/${slug.data}?${back}`}
      periodLabel={periodId ? parsePeriod(periodId)?.label : undefined}
      frozen={loaded.frozen}
    />
  );
}
