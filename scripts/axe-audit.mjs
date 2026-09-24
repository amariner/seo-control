/**
 * Auditoría de accesibilidad con Axe (axe-core) como herramienta externa.
 *
 * El script propio de QA visual mide desbordamiento horizontal, contraste y
 * objetivos táctiles, pero no sustituye a Axe: aquí se inyecta `axe.min.js` en
 * la página real mediante el protocolo DevTools y se ejecuta el análisis
 * completo (WCAG 2.1 A/AA) sobre cada ruta y viewport.
 *
 * Uso:
 *   node scripts/axe-audit.mjs                       # visor + workbench, 1440 y 375 px
 *   node scripts/axe-audit.mjs --app viewer          # solo una app
 *   node scripts/axe-audit.mjs --viewport 375        # solo un ancho
 *   node scripts/axe-audit.mjs --json docs/design/axe-report.json
 *   node scripts/axe-audit.mjs --viewer-base http://localhost:3010 --workbench-base http://127.0.0.1:3011
 *
 * Requiere los servidores ya en marcha (`pnpm dev:viewer`, `pnpm dev:workbench`)
 * y `DEV_AUTH_BYPASS=true` en el visor para que no redirija a /login.
 * Sale con código 1 si aparece cualquier incumplimiento: sirve para CI.
 */

import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9334;

/** Rutas del visor auditadas más la sección editorial del workbench. */
const APPS = {
  viewer: {
    base: "http://localhost:3000",
    routes: [
      { name: "home", path: "/" },
      { name: "portfolio", path: "/portfolio" },
      { name: "projects", path: "/projects" },
      { name: "marca-sin-serie", path: "/?project=krion" },
      { name: "proyecto-sin-serie", path: "/projects/gamadecor" },
      { name: "portfolio-filtrado", path: "/portfolio?brands=noken,krion&market=FR&compare=previousYear" },
      { name: "cal-year", path: "/editorial/calendario" },
      { name: "cal-month", path: "/editorial/calendario?view=month&month=9" },
      { name: "backlog", path: "/editorial/backlog?kind=backlog" },
      { name: "propuestas", path: "/editorial/propuestas" },
      { name: "insights", path: "/insights" },
      { name: "actions", path: "/actions" },
      { name: "cronologia", path: "/cronologia" },
      { name: "cronologia-carril", path: "/cronologia?lane=informe&project=noken" },
      { name: "cronologia-vacia", path: "/cronologia?lane=contexto-externo" },
      { name: "reports", path: "/reports" },
      { name: "reports-filtrado", path: "/reports?year=2025&type=especial" },
      { name: "reports-vacio", path: "/reports?status=borrador" },
      { name: "report-detail", path: "/reports/report-2026-08" },
      { name: "report-versionado", path: "/reports/report-2026-06" },
      { name: "legacy-geo", path: "/insights?from=insights-llm" },
      { name: "page-detail", path: "/pages/page-1" },
      { name: "query-detail", path: "/queries/noken-taps-uk" },
      { name: "projects", path: "/projects" },
      { name: "marca-sin-serie", path: "/?project=krion" },
      { name: "proyecto-sin-serie", path: "/projects/gamadecor" },
      { name: "project", path: "/projects/porcelanosa" },
      { name: "data", path: "/data" },
    ],
  },
  workbench: {
    base: "http://127.0.0.1:3001",
    routes: [
      { name: "home", path: "/" },
      { name: "editorial-piezas", path: "/editorial" },
      { name: "editorial-propuestas", path: "/editorial?tab=slots" },
      { name: "editorial-eventos", path: "/editorial?tab=events" },
      { name: "herramientas", path: "/herramientas" },
    ],
  },
};

const VIEWPORTS = [
  { label: "1440x900", width: 1440, height: 900, mobile: false },
  { label: "375x812", width: 375, height: 812, mobile: true },
];

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const appFilter = flag("app", "all");
const viewerBase = flag("viewer-base", null);
const workbenchBase = flag("workbench-base", null);
const viewportFilter = flag("viewport", "all");
const jsonOut = flag("json", null);

const viewports = viewportFilter === "all" ? VIEWPORTS : VIEWPORTS.filter((viewport) => String(viewport.width) === viewportFilter);
if (viewerBase) APPS.viewer.base = viewerBase.replace(/\/$/, "");
if (workbenchBase) APPS.workbench.base = workbenchBase.replace(/\/$/, "");
const apps = Object.entries(APPS).filter(([name]) => appFilter === "all" || name === appFilter);
if (!viewports.length) throw new Error(`Viewport desconocido: ${viewportFilter}. Usa 1440 o 375.`);
if (!apps.length) throw new Error(`App desconocida: ${appFilter}. Usa viewer o workbench.`);

const AXE_SOURCE = await readFile(require.resolve("axe-core/axe.min.js"), "utf8");
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function launchChrome() {
  const child = spawn(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${resolve(process.env.TMPDIR ?? "/tmp", `seo-axe-${Date.now()}`)}`,
    "about:blank",
  ], { stdio: "ignore" });
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (response.ok) return child;
    } catch {
      // El puerto todavía no escucha.
    }
    await sleep(250);
  }
  child.kill();
  throw new Error("Chrome no expuso el puerto de depuración");
}

/** Cliente mínimo del protocolo DevTools (mismo enfoque que capture-screenshots.mjs). */
class DevToolsSession {
  #socket;
  #nextId = 1;
  #pending = new Map();
  #listeners = new Map();

  static async attach(webSocketDebuggerUrl) {
    const session = new DevToolsSession();
    session.#socket = new WebSocket(webSocketDebuggerUrl);
    await new Promise((done, fail) => {
      session.#socket.addEventListener("open", done, { once: true });
      session.#socket.addEventListener("error", fail, { once: true });
    });
    session.#socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && session.#pending.has(message.id)) {
        const { resolve: done, reject: fail } = session.#pending.get(message.id);
        session.#pending.delete(message.id);
        if (message.error) fail(new Error(message.error.message));
        else done(message.result);
        return;
      }
      const handlers = session.#listeners.get(message.method);
      if (handlers) for (const handler of handlers) handler(message.params);
    });
    return session;
  }

  send(method, params = {}) {
    const id = this.#nextId++;
    return new Promise((done, fail) => {
      this.#pending.set(id, { resolve: done, reject: fail });
      this.#socket.send(JSON.stringify({ id, method, params }));
    });
  }

  once(method) {
    return new Promise((done) => {
      const handler = (params) => {
        const handlers = this.#listeners.get(method) ?? [];
        this.#listeners.set(method, handlers.filter((item) => item !== handler));
        done(params);
      };
      this.#listeners.set(method, [...(this.#listeners.get(method) ?? []), handler]);
    });
  }

  close() {
    this.#socket.close();
  }
}

async function evaluate(session, expression) {
  const { result, exceptionDetails } = await session.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
  return result.value;
}

const chrome = await launchChrome();
const findings = [];
let audited = 0;

try {
  const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })).json();
  const session = await DevToolsSession.attach(target.webSocketDebuggerUrl);
  await session.send("Page.enable");
  await session.send("Runtime.enable");

  for (const [appName, app] of apps) {
    for (const viewport of viewports) {
      for (const route of app.routes) {
        await session.send("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.mobile });
        const loaded = session.once("Page.loadEventFired");
        const url = `${app.base}${route.path}`;
        await session.send("Page.navigate", { url });
        await Promise.race([loaded, sleep(25000)]);
        await sleep(600);

        const landed = await evaluate(session, "location.pathname");
        if (landed === "/login") throw new Error(`El visor redirigió a /login en ${url}: arranca el servidor con DEV_AUTH_BYPASS=true`);

        // Axe se inyecta en cada navegación porque el contexto se pierde al cargar.
        await evaluate(session, AXE_SOURCE);
        const result = await evaluate(session, `axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] }, resultTypes: ["violations"] }).then((report) => JSON.stringify({
          violations: report.violations.map((violation) => ({ id: violation.id, impact: violation.impact, tags: violation.tags, help: violation.help, nodes: violation.nodes.length, targets: violation.nodes.slice(0, 4).map((node) => node.target.join(" ")) })),
          incomplete: report.incomplete?.length ?? 0,
        }))`);
        const report = JSON.parse(result);
        audited += 1;

        const blocking = report.violations.filter((violation) => !violation.tags.includes("best-practice"));
        const advisory = report.violations.filter((violation) => violation.tags.includes("best-practice"));
        for (const violation of report.violations) findings.push({ app: appName, route: route.name, path: route.path, viewport: viewport.label, ...violation, blocking: !violation.tags.includes("best-practice") });

        const summary = blocking.length ? `${blocking.length} incumplimiento(s) WCAG` : advisory.length ? `AA limpio · ${advisory.length} aviso(s) de buenas prácticas` : "limpio";
        console.log(`${viewport.label.padEnd(9)} ${appName.padEnd(9)} ${route.name.padEnd(22)} ${summary}`);
        for (const violation of blocking) console.log(`            ✗ ${violation.id} (${violation.impact}) · ${violation.nodes} nodo(s) · ${violation.targets.join(" | ")}`);
        for (const violation of advisory) console.log(`            · ${violation.id} (${violation.impact}) · ${violation.nodes} nodo(s) · ${violation.targets.join(" | ")}`);
      }
    }
  }
  session.close();
} finally {
  chrome.kill();
}

const blocking = findings.filter((finding) => finding.blocking);
const advisory = findings.filter((finding) => !finding.blocking);
console.log(`\n${audited} páginas auditadas con axe-core ${require("axe-core/package.json").version}`);
console.log(`${blocking.length} incumplimiento(s) WCAG 2.1 A/AA · ${advisory.length} aviso(s) de buenas prácticas`);

if (jsonOut) {
  const file = resolve(jsonOut);
  await writeFile(file, `${JSON.stringify({ tool: `axe-core ${require("axe-core/package.json").version}`, ranAt: new Date().toISOString(), pagesAudited: audited, blocking: blocking.length, advisory: advisory.length, findings }, null, 2)}\n`);
  console.log(`Informe en ${file}`);
}

process.exit(blocking.length ? 1 : 0);
