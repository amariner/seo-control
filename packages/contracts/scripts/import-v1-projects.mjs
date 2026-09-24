/**
 * Archiva la configuración de proyectos de V1 (`src/lib/config/projects.ts`)
 * como snapshot JSON, igual que `import:v1` hace con el plan editorial.
 *
 * El snapshot es la ENTRADA de la importación, no su resultado: `sites.ts` es
 * la traducción revisada a mano al modelo de V2, y `sites.test.ts` comprueba
 * que no se ha perdido ni inventado nada por el camino. Sin este archivo la
 * comprobación dependería de tener V1 en el disco, que es justo lo que la
 * migración va a dejar de garantizar.
 *
 * Uso: pnpm --filter @seo/contracts import:v1-projects [--source <carpeta V1>]
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = resolve(PACKAGE_ROOT, "../..");

const args = process.argv.slice(2);
const sourceIndex = args.indexOf("--source");
const sourceDir = sourceIndex >= 0 && args[sourceIndex + 1]
  ? resolve(args[sourceIndex + 1])
  : resolve(REPO_ROOT, "../seo-dashboard");

const sourceFile = join(sourceDir, "src/lib/config/projects.ts");
const archiveFile = join(PACKAGE_ROOT, "data/archive/v1/projects.json");

let source;
try {
  source = readFileSync(sourceFile, "utf8");
} catch {
  console.error(`No se encontró la configuración de proyectos de V1 en ${sourceFile}.`);
  console.error("Pasa la carpeta con --source si V1 vive en otro sitio.");
  process.exit(1);
}

// V1 es TypeScript sin dependencias: basta transpilarlo para poder leer el dato.
const work = mkdtempSync(join(tmpdir(), "v1-projects-"));
try {
  execFileSync(join(REPO_ROOT, "node_modules/.bin/esbuild"), [
    sourceFile,
    "--format=esm",
    `--outfile=${join(work, "projects.mjs")}`,
    "--log-level=error",
  ]);
  const { PROJECTS } = await import(pathToFileURL(join(work, "projects.mjs")).href);

  const projects = PROJECTS.map((project) => ({
    key: project.key,
    label: project.label,
    summary: project.summary,
    hasData: project.hasData,
    // V1 solo declara `sources` cuando difiere del monolito `hasData`. Lo
    // resolvemos aquí para que el snapshot diga qué estaba conectado de verdad
    // y el test no tenga que repetir la regla de resolución de V1.
    sources: {
      ga4: project.sources ? (project.sources.ga4 ?? false) : project.hasData,
      gsc: project.sources ? (project.sources.gsc ?? false) : project.hasData,
      semrush: project.sources ? (project.sources.semrush ?? false) : project.hasData,
      siteAudit: project.sources ? (project.sources.siteAudit ?? false) : project.hasData,
    },
    sourcesDeclared: Boolean(project.sources),
    brandTerms: project.brandTerms ?? null,
    suggestedExclusions: project.suggestedExclusions ?? null,
    markets: Object.entries(project.markets ?? {}).map(([code, market]) => ({ code, ...market })),
  }));

  const snapshot = {
    source: "seo-dashboard/src/lib/config/projects.ts",
    sourceSha256: createHash("sha256").update(source).digest("hex"),
    importedAt: new Date().toISOString(),
    projectCount: projects.length,
    marketCount: projects.reduce((total, project) => total + project.markets.length, 0),
    projects,
  };

  const previous = (() => {
    try {
      return JSON.parse(readFileSync(archiveFile, "utf8"));
    } catch {
      return null;
    }
  })();

  if (previous && previous.sourceSha256 === snapshot.sourceSha256) {
    console.log(`Sin cambios: la huella ${snapshot.sourceSha256.slice(0, 12)}… coincide con el snapshot del ${previous.importedAt}.`);
    process.exit(0);
  }

  writeFileSync(archiveFile, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`Snapshot de proyectos V1 · ${snapshot.importedAt}`);
  console.log(`Huella de entrada: ${snapshot.sourceSha256}`);
  console.log("");
  console.log("Proyecto          mercados  fuentes");
  for (const project of projects) {
    const active = Object.entries(project.sources).filter(([, on]) => on).map(([key]) => key).join("+") || "ninguna";
    console.log(`${project.key.padEnd(17)} ${String(project.markets.length).padStart(8)}  ${active}`);
  }
  console.log("");
  console.log(`${snapshot.projectCount} proyectos · ${snapshot.marketCount} mercados`);
  console.log(`Escrito: ${archiveFile}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
