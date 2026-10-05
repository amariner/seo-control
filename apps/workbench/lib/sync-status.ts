import { execFileSync } from "node:child_process";
import { repositoryRoot } from "@seo/reports/store";

/**
 * Qué del workbench está listo para llegar al visor desplegado (D-077). Lo que
 * el visor publica sale de unas pocas carpetas versionadas; lo que difiere del
 * último commit seguro que aún no ha llegado. Se lee con `git status`, sin
 * inventar un estado de despliegue que en local no se puede saber.
 */
export const PUBLISH_CHANNELS = [
  {
    id: "editorial",
    label: "Plan editorial y su medición",
    paths: ["packages/editorial/data/curation", "packages/editorial/data/measurement"],
    ask: "sube el plan",
    href: "/editorial/plan",
  },
  {
    id: "reports",
    label: "Informes",
    paths: ["packages/reports/data/published"],
    ask: "sube los informes",
    href: "/informes",
  },
  {
    id: "actions",
    label: "Seguimiento de acciones",
    paths: ["packages/reports/data/tracking"],
    ask: "sube las acciones",
    href: "/acciones",
  },
  {
    id: "crawl",
    label: "Estado del sitio",
    paths: ["packages/site-audit/data/published"],
    ask: "publica el crawl de <proyecto> y súbelo",
    href: "/crawls",
  },
] as const;

export type ChannelStatus = (typeof PUBLISH_CHANNELS)[number] & { changed: string[] };

export function publishStatus(): { channels: ChannelStatus[]; head: string | null; error: string | null } {
  const root = repositoryRoot();
  try {
    const head = execFileSync("git", ["log", "-1", "--format=%h · %cd · %s", "--date=format:%d/%m %H:%M"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    const status = execFileSync("git", ["status", "--porcelain", "--untracked-files=all", "--", ...PUBLISH_CHANNELS.flatMap((channel) => channel.paths)], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const files = status
      .split("\n")
      .filter(Boolean)
      .map((line) => line.slice(3));
    return {
      head,
      error: null,
      channels: PUBLISH_CHANNELS.map((channel) => ({ ...channel, changed: files.filter((file) => channel.paths.some((path) => file.startsWith(path))) })),
    };
  } catch (error) {
    return { head: null, error: error instanceof Error ? error.message : String(error), channels: PUBLISH_CHANNELS.map((channel) => ({ ...channel, changed: [] })) };
  }
}
