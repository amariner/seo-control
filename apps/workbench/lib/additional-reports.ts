import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, relative, resolve, sep } from "node:path";
import { BRANDS } from "@seo/contracts";
import { repositoryRoot } from "@seo/reports/store";

/**
 * Informes adicionales (D-076 sobre la convención de
 * `informes-adicionales/README.md`): análisis puntuales que se quedan siempre
 * en este equipo. El workbench los lista, los enseña y crea solicitudes;
 * nunca los sube (la carpeta está en .gitignore y el visor no la lee).
 */

export const ADDITIONAL_PROJECTS = [...BRANDS.map((brand) => ({ slug: brand.slug, name: brand.name })), { slug: "conjunto", name: "Conjunto" }] as const;

export function additionalRoot() {
  return resolve(repositoryRoot(), "informes-adicionales");
}

export type AdditionalFile = { name: string; path: string; size: number; kind: "csv" | "md" | "text" | "html" | "code" | "other" };
export type AdditionalReport = {
  /** `<proyecto>/<YYYY-MM-DD>-<tema>` */
  path: string;
  project: string;
  projectName: string;
  date: string | null;
  topic: string;
  title: string;
  status: "solicitado" | "en curso" | "entregado";
  period: string | null;
  source: string | null;
  /** Real, sintético o sin declarar, según la línea «Fuente(s)» del README. */
  data: "real" | "sintético" | "mixto" | "sin declarar";
  question: string | null;
  files: AdditionalFile[];
  updatedAt: string;
};

const KIND: Record<string, AdditionalFile["kind"]> = {
  ".csv": "csv",
  ".tsv": "csv",
  ".md": "md",
  ".txt": "text",
  ".json": "text",
  ".html": "html",
  ".ts": "code",
  ".mjs": "code",
  ".js": "code",
  ".py": "code",
  ".sql": "code",
};

const field = (readme: string, name: string) => {
  const match = new RegExp(`^\\*\\*${name}\\*\\*\\s*:\\s*(.+(?:\\n(?!\\*\\*|\\n|#).+)*)`, "mi").exec(readme);
  return match ? match[1]!.replace(/\s*\n\s*/g, " ").replace(/\*\*|`/g, "").trim() : null;
};

function dataKind(source: string | null): AdditionalReport["data"] {
  if (!source) return "sin declarar";
  const text = source.toLowerCase();
  const real = /\breal(es)?\b/.test(text);
  const synthetic = /sintétic/.test(text);
  return real && synthetic ? "mixto" : real ? "real" : synthetic ? "sintético" : "sin declarar";
}

/** Ruta segura dentro de la carpeta; `null` si sale de ella. */
export function safeAdditionalPath(path: string): string | null {
  const root = additionalRoot();
  const target = resolve(root, path);
  const rel = relative(root, target);
  if (!rel || rel.startsWith("..") || rel.split(sep).some((part) => part.startsWith("."))) return null;
  return target;
}

function readReport(project: string, folder: string): AdditionalReport | null {
  const dir = resolve(additionalRoot(), project, folder);
  if (!statSync(dir).isDirectory()) return null;
  const readmePath = resolve(dir, "README.md");
  const readme = existsSync(readmePath) ? readFileSync(readmePath, "utf8") : "";
  const date = /^\d{4}-\d{2}-\d{2}/.exec(folder)?.[0] ?? null;
  const files = readdirSync(dir)
    .filter((name) => !name.startsWith("."))
    .map((name) => {
      const stat = statSync(resolve(dir, name));
      return stat.isFile() ? { name, path: `${project}/${folder}/${name}`, size: stat.size, kind: KIND[extname(name).toLowerCase()] ?? "other", mtime: stat.mtimeMs } : null;
    })
    .filter((file): file is AdditionalFile & { mtime: number } => file !== null)
    .sort((a, b) => (a.name === "README.md" ? -1 : b.name === "README.md" ? 1 : a.name.localeCompare(b.name)));
  const source = field(readme, "Fuente\\(s\\)") ?? field(readme, "Fuente");
  const rawStatus = field(readme, "Estado")?.toLowerCase() ?? "";
  const outputs = files.filter((file) => file.name !== "README.md");
  const status: AdditionalReport["status"] = rawStatus.startsWith("solicit") ? "solicitado" : rawStatus.startsWith("en curso") ? "en curso" : outputs.length ? "entregado" : "solicitado";
  const question = /##\s*Pregunta de negocio\s*\n+([\s\S]*?)(?:\n##\s|$)/i.exec(readme)?.[1]?.trim() ?? null;
  return {
    path: `${project}/${folder}`,
    project,
    projectName: ADDITIONAL_PROJECTS.find((item) => item.slug === project)?.name ?? project,
    date,
    topic: folder.replace(/^\d{4}-\d{2}-\d{2}-?/, "") || folder,
    title: /^#\s+(.+)$/m.exec(readme)?.[1]?.trim() ?? folder,
    status,
    period: field(readme, "Periodo de datos"),
    source,
    data: dataKind(source),
    question,
    files: files.map(({ mtime: _mtime, ...file }) => file),
    updatedAt: new Date(Math.max(statSync(dir).mtimeMs, ...files.map((file) => file.mtime))).toISOString(),
  };
}

export function listAdditionalReports(): AdditionalReport[] {
  const root = additionalRoot();
  if (!existsSync(root)) return [];
  const reports: AdditionalReport[] = [];
  for (const project of readdirSync(root)) {
    const projectDir = resolve(root, project);
    if (project.startsWith(".") || !statSync(projectDir).isDirectory()) continue;
    for (const folder of readdirSync(projectDir)) {
      if (folder.startsWith(".")) continue;
      const report = readReport(project, folder);
      if (report) reports.push(report);
    }
  }
  return reports.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || a.path.localeCompare(b.path));
}

export function getAdditionalReport(path: string): { report: AdditionalReport; readme: string } | null {
  const dir = safeAdditionalPath(path);
  const parts = path.split("/");
  if (!dir || parts.length !== 2 || !existsSync(dir)) return null;
  const report = readReport(parts[0]!, parts[1]!);
  if (!report) return null;
  const readmePath = resolve(dir, "README.md");
  return { report, readme: existsSync(readmePath) ? readFileSync(readmePath, "utf8") : "" };
}

/** Vista previa de un CSV: cabecera y hasta `limit` filas, con comillas RFC 4180. */
export function previewCsv(content: string, limit = 50) {
  const delimiter = content.split("\n", 1)[0]!.includes("\t") ? "\t" : content.split("\n", 1)[0]!.split(";").length > content.split("\n", 1)[0]!.split(",").length ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let total = 0;
  for (let index = 0; index < content.length; index += 1) {
    const char = content[index]!;
    if (quoted) {
      if (char === '"' && content[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && content[index + 1] === "\n") index += 1;
      row.push(cell);
      cell = "";
      total += 1;
      if (rows.length <= limit) rows.push(row);
      row = [];
    } else cell += char;
  }
  if (cell || row.length) {
    row.push(cell);
    total += 1;
    if (rows.length <= limit) rows.push(row);
  }
  const [head = [], ...body] = rows;
  return { head, rows: body, total: Math.max(0, total - 1) };
}

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

/**
 * Crea la carpeta y el README de una solicitud con la plantilla de la
 * convención. Claude la completa cuando se le pide en el chat.
 */
export function createAdditionalRequest(input: { project: string; topic: string; title: string; question: string; period: string; source: string; today: string }) {
  if (!ADDITIONAL_PROJECTS.some((item) => item.slug === input.project)) throw new Error("Proyecto desconocido");
  const topic = slugify(input.topic || input.title);
  if (!topic) throw new Error("Falta el tema");
  let folder = `${input.today}-${topic}`;
  let dir = resolve(additionalRoot(), input.project, folder);
  for (let n = 2; existsSync(dir); n += 1) {
    folder = `${input.today}-${topic}-${n}`;
    dir = resolve(additionalRoot(), input.project, folder);
  }
  mkdirSync(dir, { recursive: true });
  const readme = `# ${input.title.trim()}

**Estado**: solicitado
**Fecha generación**: ${input.today}
**Proyecto**: ${input.project}
**Periodo de datos**: ${input.period.trim() || "por definir"}
**Fuente(s)**: ${input.source.trim() || "por definir — indicar si el dato es real o sintético"}
**Cómo se generó**: pendiente (solicitud creada desde el workbench)

## Pregunta de negocio

${input.question.trim()}

## Ficheros

- Pendiente.
`;
  writeFileSync(resolve(dir, "README.md"), readme, "utf8");
  return `${input.project}/${folder}`;
}
