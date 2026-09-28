import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findBrand, isPilotProject, projectSlugSchema } from "@seo/contracts";
import { getPublishedAudit } from "@seo/site-audit/published";
import { BRAND_LOGOS } from "@/components/report/brand-report";
import { ProjectDeck } from "@/components/report/project-deck";
import { getBrandReport, projectEditorial } from "@/lib/brand-report";
import { rootLabelOf } from "@/lib/page-analysis";
import { buildProjectReport } from "@/lib/project-report";

/**
 * Informe del proyecto (D-073): presentación a pantalla completa, sin shell.
 * `?pdf=1` abre el diálogo de impresión al cargar (PDF al estilo de la V1).
 * Periodo y mercado llegan en la URL, igual que en la ficha del proyecto.
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

/** Nombre del PDF, como en la V1: el navegador propone `document.title` al guardar. */
function filenameOf(report: NonNullable<Awaited<ReturnType<typeof getBrandReport>>>) {
  const brand = findBrand(report.brand)!;
  const market = report.markets.find((item) => item.code === report.market)?.name ?? "Todos los mercados";
  return `informe-seo-${slugify(brand.name)}-${slugify(market)}-${report.window.start}_${report.window.end}`;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = projectSlugSchema.safeParse(rawSlug);
  if (!slug.success || !isPilotProject(slug.data)) return {};
  const report = await getBrandReport(slug.data, await searchParams);
  return report ? { title: { absolute: filenameOf(report) } } : {};
}

export default async function ProjectReportPage({
  params,
  searchParams,
}: Props) {
  const { slug: rawSlug } = await params;
  const slug = projectSlugSchema.safeParse(rawSlug);
  if (!slug.success || !isPilotProject(slug.data)) notFound();
  const filters = await searchParams;
  const report = await getBrandReport(slug.data, filters);
  if (!report) notFound();
  const editorial = await projectEditorial(slug.data);
  const audit = getPublishedAudit(slug.data);
  const slides = buildProjectReport({
    report,
    pieces: editorial.pieces,
    audit,
    rootLabel: rootLabelOf(report.markets),
    today: new Date().toISOString().slice(0, 10),
  });
  const brand = findBrand(report.brand)!;
  const marketName = report.markets.find((item) => item.code === report.market)?.name ?? "Todos los mercados";
  const pdf = (Array.isArray(filters.pdf) ? filters.pdf[0] : filters.pdf) === "1";
  const back = new URLSearchParams(
    Object.entries(filters).flatMap(([key, value]) =>
      key === "pdf" || value === undefined ? [] : [[key, Array.isArray(value) ? value[0]! : value]],
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
    />
  );
}
