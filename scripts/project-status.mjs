import { readFile, statfs } from "node:fs/promises";
import { resolve } from "node:path";

/**
 * Estado del proyecto para abrir una sesión.
 *
 * El disco se **mide** en vez de recitarse. El bloqueo `local-disk` llevaba
 * sesiones anunciando una cifra escrita a mano en `PROJECT_STATE.json`, y el
 * 2026-09-04 el disco se llenó de verdad mientras el estado seguía diciendo
 * «aproximadamente 6,2 GiB libres»: las herramientas empezaron a fallar con
 * `ENOSPC` a mitad de una verificación. Un bloqueo cuyo número no se comprueba
 * deja de ser un bloqueo y pasa a ser una nota (D-025 aplicado a la continuidad).
 */

const root = resolve(import.meta.dirname, "..");
const state = JSON.parse(await readFile(resolve(root, "docs/continuity/PROJECT_STATE.json"), "utf8"));

/** El preflight de crawls exige 50 GiB; el mismo umbral que `@seo/local-data`. */
const REQUIRED_GIB = 50;
/** Por debajo de esto, las herramientas de build empiezan a fallar. */
const CRITICAL_GIB = 3;

const gib = (bytes) => Math.round((bytes / 1024 ** 3) * 10) / 10;

async function measureDisk() {
  try {
    const stats = await statfs(root);
    return gib(stats.bavail * stats.bsize);
  } catch {
    return null;
  }
}

const freeGiB = await measureDisk();

console.log(`\n${state.project}`);
console.log(`Fase activa: ${state.currentPhase.id} · ${state.currentPhase.name}`);
console.log(`Estado: ${state.currentPhase.status} · ${state.currentPhase.progressPercent}%`);
console.log(`Siguiente acción: ${state.nextAction}`);

console.log("\nDisco (medido ahora, no leído del estado):");
if (freeGiB === null) {
  console.log("- No se pudo medir el disco.");
} else if (freeGiB < CRITICAL_GIB) {
  console.log(`- ⚠ CRÍTICO: ${freeGiB} GiB libres. Por debajo de ${CRITICAL_GIB} GiB fallan build, test y axe con ENOSPC.`);
  console.log("  Recurso conocido: `rm -rf .turbo` (caché regenerable de Turborepo, llegó a ocupar 6,4 GB) y `rm -rf apps/*/.next`.");
} else if (freeGiB < REQUIRED_GIB) {
  console.log(`- ${freeGiB} GiB libres. Suficiente para desarrollar; insuficiente para crawls, que exigen ${REQUIRED_GIB} GiB.`);
} else {
  console.log(`- ${freeGiB} GiB libres: por encima de los ${REQUIRED_GIB} GiB que exige el preflight de crawls.`);
}

console.log("\nBloqueos:");
for (const blocker of state.blockers.filter((item) => item.status !== "resolved")) {
  console.log(`- [${blocker.status}] ${blocker.scope}: ${blocker.detail}`);
}

console.log(`\nÚltima validación: ${state.lastValidation.date}`);
console.log(`- ${state.lastValidation.typecheck}`);
console.log(`- ${state.lastValidation.tests}`);
console.log(`- ${state.lastValidation.productionBuild}\n`);

// Salida distinta de cero solo cuando el disco impide trabajar: abrir una sesión
// sin espacio y descubrirlo a mitad de la verificación cuesta más que saberlo ya.
if (freeGiB !== null && freeGiB < CRITICAL_GIB) process.exit(1);
