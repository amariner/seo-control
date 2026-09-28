import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import ExcelJS from "exceljs";
import { editorialBrandSlugSchema, type EditorialBrandSlug } from "@seo/contracts";
import { DEFAULT_PATHS, importV1Editorial } from "../src/import";
import type { PlanSheetSnapshot } from "../src/normalize";
import { buildPlanSheetSnapshot, CALENDAR_SHEET_PATTERN, PLAN_SHEET_NAME } from "../src/plan-sheet";

/**
 * Uso: pnpm --filter @seo/editorial import:sheet -- --file <plan.xlsx> --brand xtone [--brand noken…]
 *
 * Lee la hoja «Plan editorial», guarda el snapshot en data/sources/plan-sheet.json
 * y regenera el dataset (D-050). Las marcas activadas se acumulan entre ejecuciones:
 * solo ellas toman su plan de la hoja; el resto sigue con el plan V1.
 */

const args = process.argv.slice(2);
const values = (flag: string) => args.flatMap((arg, index) => (arg === flag && args[index + 1] ? [args[index + 1]!] : []));
const file = values("--file")[0];
if (!file) {
  console.error("Falta --file <ruta del xlsx>.");
  process.exit(1);
}
const requested = values("--brand").map((brand) => editorialBrandSlugSchema.parse(brand));

const snapshotPath = DEFAULT_PATHS.planSheetPath!;
const previous = await readFile(snapshotPath, "utf8")
  .then((text) => JSON.parse(text) as PlanSheetSnapshot)
  .catch(() => null);
const brands: EditorialBrandSlug[] = [...(previous?.brands ?? []), ...requested];
if (!brands.length) {
  console.error("Indica al menos una marca con --brand <slug>.");
  process.exit(1);
}

const buffer = await readFile(resolve(file));
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.load(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer);
const sheet = workbook.getWorksheet(PLAN_SHEET_NAME);
if (!sheet) {
  console.error(`El fichero no tiene la hoja «${PLAN_SHEET_NAME}».`);
  process.exit(1);
}
const readRows = (worksheet: ExcelJS.Worksheet) => {
  const rows: unknown[][] = [];
  worksheet.eachRow({ includeEmpty: true }, (row, number) => {
    // row.values es 1-indexado: se descarta la posición 0.
    rows[number - 1] = (row.values as unknown[]).slice(1);
  });
  return Array.from(rows, (row) => row ?? []);
};
const calendarSheet = workbook.worksheets.find((worksheet) => CALENDAR_SHEET_PATTERN.test(worksheet.name.trim()));
const calendar = calendarSheet
  ? { sheet: calendarSheet.name, year: Number(calendarSheet.name.trim().match(CALENDAR_SHEET_PATTERN)![1]), rows: readRows(calendarSheet) }
  : undefined;

const snapshot = buildPlanSheetSnapshot({ fileName: basename(file), sha256: createHash("sha256").update(buffer).digest("hex"), rows: readRows(sheet), brands, calendar });
await mkdir(dirname(snapshotPath), { recursive: true });
await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
console.log(`Hoja «${PLAN_SHEET_NAME}» de ${snapshot.origin.fileName}: ${snapshot.rows.length} filas · ${snapshot.calendar?.length ?? 0} huecos de calendario · marcas activas: ${snapshot.brands.join(", ")}`);

const result = await importV1Editorial(DEFAULT_PATHS);
if (result.status === "unchanged") {
  console.log("Dataset sin cambios.");
  process.exit(0);
}
for (const warning of result.dataset.report.warnings.filter((item) => item.startsWith("Plan de ") || item.startsWith("Calendario tomado"))) console.log(`  - ${warning}`);
console.log(`Ficheros escritos:\n${[snapshotPath, ...result.written].map((path) => `  ${path}`).join("\n")}`);
