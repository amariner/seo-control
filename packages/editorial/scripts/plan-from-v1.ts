import { execFileSync } from "node:child_process";
import { EDITORIAL_BRANDS, type EditorialPiece } from "@seo/contracts";
import { applyCuration, planBacklogPieces, unplanBacklogPieces } from "../src/curation";
import { readCurationStore, writeCurationStore } from "../src/curation-store";
import { getEditorialDataset } from "../src/dataset";

/**
 * Uso: pnpm editorial:plan-from-v1 -- --from 2026-10 --to 2026-12 [--brand noken…] [--dry-run] [--undo]
 *
 * Lleva al plan editorial (D-083) las piezas del plan editorial V1
 * (`/conjunto/plan-editorial`, backlog `conjunto-backlog`) de los meses que la
 * hoja «Plan editorial» del equipo todavía no cubre. Las piezas conservan su
 * procedencia V1 y quedan en la curación con autor y fecha; se editan después
 * en la tabla del plan como las demás. Se omiten las que ya están en el plan
 * (misma keyword o mismo título). `--undo` las devuelve al backlog.
 */

const args = process.argv.slice(2);
const value = (flag: string) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const values = (flag: string) => args.flatMap((arg, index) => (arg === flag && args[index + 1] ? [args[index + 1]!] : []));
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const from = value("--from");
const to = value("--to") ?? from;
if (!from || !to || !MONTH.test(from) || !MONTH.test(to) || from > to) {
  console.error("Indica el rango con --from AAAA-MM [--to AAAA-MM].");
  process.exit(1);
}
const brands = values("--brand");
const unknown = brands.filter((slug) => !EDITORIAL_BRANDS.some((brand) => brand.slug === slug));
if (unknown.length) {
  console.error(`Marca desconocida: ${unknown.join(", ")}.`);
  process.exit(1);
}
const dryRun = args.includes("--dry-run");
const undo = args.includes("--undo");

const author = (() => {
  try {
    return execFileSync("git", ["config", "user.name"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || "workbench";
  } catch {
    return "workbench";
  }
})();
const now = new Date().toISOString();
const normalize = (text: string | null) =>
  (text ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
const monthOf = (piece: EditorialPiece) =>
  piece.month.year && piece.month.month ? `${piece.month.year}-${String(piece.month.month).padStart(2, "0")}` : null;
const inScope = (piece: EditorialPiece) => {
  const month = monthOf(piece);
  return month !== null && month >= from && month <= to && (!brands.length || brands.includes(piece.brand.slug ?? ""));
};
const name = (slug: string | null) => EDITORIAL_BRANDS.find((brand) => brand.slug === slug)?.name ?? slug ?? "sin marca";
const label = (piece: EditorialPiece) => `${monthOf(piece)} · ${name(piece.brand.slug)} · ${piece.title ?? piece.keyword ?? piece.id}`;

const store = readCurationStore();
const dataset = applyCuration(getEditorialDataset(), store);

if (undo) {
  const back = dataset.plan.filter((piece) => store.planned[piece.id] && inScope(piece));
  if (!back.length) {
    console.error(`No hay piezas V1 planificadas entre ${from} y ${to}.`);
    process.exit(1);
  }
  console.log(`${dryRun ? "Volverían" : "Vuelven"} al backlog (${back.length}):\n${back.map((piece) => `  · ${label(piece)}`).join("\n")}`);
  if (!dryRun) writeCurationStore(unplanBacklogPieces(store, back.map((piece) => piece.id), now));
  console.log(dryRun ? "\n--dry-run: no se ha escrito nada." : "\nCuración actualizada.");
  process.exit(0);
}

// Solo cuenta la V1 para marcas cuyo plan sale de la hoja (D-050): el resto ya ve su backlog V1 en el plan.
const sheetBrands = new Set(dataset.plan.filter((piece) => piece.provenance.source === "plan-sheet").map((piece) => piece.brand.slug));
const candidates = dataset.backlog.filter((piece) => piece.provenance.source === "conjunto-backlog" && inScope(piece) && sheetBrands.has(piece.brand.slug));
const added: EditorialPiece[] = [];
const skipped: Array<{ piece: EditorialPiece; reason: string }> = [];
for (const piece of candidates) {
  const brandPlan = [...dataset.plan, ...added].filter((item) => item.brand.slug === piece.brand.slug);
  const twin = brandPlan.find(
    (item) => (piece.keyword && normalize(item.keyword) === normalize(piece.keyword)) || (piece.title && normalize(item.title) === normalize(piece.title)),
  );
  if (twin) skipped.push({ piece, reason: twin.provenance.source === "plan-sheet" ? "ya en la hoja del equipo" : "ya en el plan" });
  else added.push(piece);
}

const byMonth = new Map<string, EditorialPiece[]>();
for (const piece of added) byMonth.set(monthOf(piece)!, [...(byMonth.get(monthOf(piece)!) ?? []), piece]);
console.log(`Plan editorial V1 → plan · ${from} a ${to}${brands.length ? ` · ${brands.map(name).join(", ")}` : ""}`);
console.log(`${dryRun ? "Se añadirían" : "Añadidas"}: ${added.length} · ya en el plan: ${skipped.length}`);
for (const [month, pieces] of [...byMonth].sort(([a], [b]) => a.localeCompare(b))) {
  console.log(`\n${month} (${pieces.length})`);
  for (const piece of pieces) console.log(`  · ${name(piece.brand.slug)} · ${piece.title ?? piece.keyword}${piece.brief ? "" : " (sin brief)"}`);
}
if (skipped.length) console.log(`\nOmitidas:\n${skipped.map(({ piece, reason }) => `  · ${label(piece)} — ${reason}`).join("\n")}`);

// Meses y marcas del rango que siguen sin ninguna pieza en el plan.
const months: string[] = [];
for (let cursor = new Date(`${from}-01T00:00:00Z`); cursor.toISOString().slice(0, 7) <= to; cursor.setUTCMonth(cursor.getUTCMonth() + 1))
  months.push(cursor.toISOString().slice(0, 7));
const planned = [...dataset.plan, ...added];
const gaps = EDITORIAL_BRANDS.filter((brand) => !brands.length || brands.includes(brand.slug)).flatMap((brand) =>
  months.filter((month) => !planned.some((piece) => piece.brand.slug === brand.slug && monthOf(piece) === month)).map((month) => `${month} · ${brand.name}`),
);
if (gaps.length) console.log(`\nSin piezas en el plan ni propuestas V1:\n${gaps.map((gap) => `  · ${gap}`).join("\n")}`);

if (!added.length) {
  console.error("\nNada que añadir: no se ha escrito nada.");
  process.exit(1);
}
if (dryRun) {
  console.log("\n--dry-run: no se ha escrito nada.");
  process.exit(0);
}
writeCurationStore(
  planBacklogPieces(
    store,
    added.map((piece) => piece.id),
    { updatedBy: author, note: `Plan editorial V1 ${from}…${to} (D-083)`, now },
  ),
);
console.log("\nCuración actualizada. Para llevarlo al visor: «sube el plan» (commit de la curación y vercel deploy --prod).");
