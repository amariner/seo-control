import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { repositoryRoot } from "../src/store";

/** Credenciales de lectura de GA4/GSC: las del workbench o, si no, las del visor. */
export function loadEnv(): string | null {
  for (const file of ["apps/workbench/.env.local", "apps/viewer/.env.local"]) {
    const path = resolve(repositoryRoot(), file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (match && process.env[match[1]!] === undefined) process.env[match[1]!] = match[2]!.replace(/^"(.*)"$/, "$1");
    }
    return file;
  }
  return null;
}

const args = process.argv.slice(2);

/** Valor de una opción (`--owner "Marta"`); `undefined` si no viene. */
export function option(flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (value === undefined || value.startsWith("--")) throw new Error(`Falta el valor de ${flag}`);
  return value;
}

export const hasFlag = (flag: string) => args.includes(flag);
