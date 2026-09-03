/**
 * Capturas de referencia por viewport para la QA visual de P1.
 *
 * Chrome headless impone un ancho mínimo de ventana de 500 px, por lo que
 * `--window-size=390,844` renderiza a 500 px y recorta la imagen: las capturas
 * estrechas obtenidas así son engañosas. Este script habla el protocolo
 * DevTools y usa `Emulation.setDeviceMetricsOverride`, que sí emula el ancho
 * real del dispositivo, incluidas las media queries.
 *
 * Uso:
 *   node scripts/capture-screenshots.mjs --out docs/design/screenshots/after \
 *     [--base http://localhost:3000] [--full]
 *
 * Las rutas a capturar se definen en `ROUTES`. Requiere el servidor ya en marcha.
 */

import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9333;

const VIEWPORTS = [
  { label: "1440x900", width: 1440, height: 900, mobile: false },
  { label: "1024x768", width: 1024, height: 768, mobile: false },
  { label: "390x844", width: 390, height: 844, mobile: true },
  { label: "375x812", width: 375, height: 812, mobile: true },
];

const ROUTES = [
  { name: "home", path: "/" },
  { name: "cal-year", path: "/editorial/calendario" },
  { name: "cal-month", path: "/editorial/calendario?view=month&month=9" },
  { name: "cal-detail", path: "/editorial/calendario?event=ed-ev-c240af98c0a7916d" },
  { name: "backlog", path: "/editorial/backlog?kind=backlog" },
  { name: "propuestas", path: "/editorial/propuestas" },
  { name: "project", path: "/projects/porcelanosa" },
  { name: "insights", path: "/insights" },
  { name: "reports", path: "/reports" },
  // Superficies añadidas en P1.4/P1.5: reciprocidad editorial, ficha de query,
  // hilo de decisión del informe y marco de gráfico con tabla accesible.
  { name: "report-detail", path: "/reports/report-2026-08" },
  { name: "page-detail", path: "/pages/page-3" },
  { name: "query-detail", path: "/queries/noken-taps-uk" },
  { name: "actions", path: "/actions" },
];

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const outDir = resolve(flag("out", "docs/design/screenshots/after"));
const base = flag("base", "http://localhost:3000").replace(/\/$/, "");
const fullPage = args.includes("--full");

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function launchChrome() {
  const child = spawn(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${resolve(process.env.TMPDIR ?? "/tmp", `seo-capture-${Date.now()}`)}`,
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

/** Cliente mínimo del protocolo DevTools sobre el WebSocket nativo de Node. */
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

const chrome = await launchChrome();
try {
  await mkdir(outDir, { recursive: true });
  const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })).json();
  const session = await DevToolsSession.attach(target.webSocketDebuggerUrl);
  await session.send("Page.enable");
  const written = [];

  for (const viewport of VIEWPORTS) {
    for (const route of ROUTES) {
      await session.send("Emulation.setDeviceMetricsOverride", {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        mobile: viewport.mobile,
      });
      const loaded = session.once("Page.loadEventFired");
      await session.send("Page.navigate", { url: `${base}${route.path}` });
      await Promise.race([loaded, sleep(20000)]);
      await sleep(700);
      // El override puede aplicarse con un ciclo de retraso tras cambiar de tamaño:
      // se confirma el ancho antes de capturar y, si no coincide, se reaplica.
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const { result: check } = await session.send("Runtime.evaluate", { expression: "innerWidth", returnByValue: true });
        if (check.value === viewport.width) break;
        await session.send("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.mobile });
        await sleep(400);
      }
      const { data } = await session.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: fullPage });
      const file = resolve(outDir, `viewer-${route.name}-${viewport.label}.png`);
      await writeFile(file, Buffer.from(data, "base64"));
      written.push(file);
      const { result } = await session.send("Runtime.evaluate", {
        expression: "JSON.stringify({ inner: innerWidth, scroll: document.documentElement.scrollWidth })",
        returnByValue: true,
      });
      const metrics = JSON.parse(result.value);
      const overflow = metrics.scroll > metrics.inner ? ` DESBORDAMIENTO ${metrics.scroll}px` : "";
      console.log(`${viewport.label.padEnd(9)} ${route.name.padEnd(12)} inner=${metrics.inner}${overflow}`);
    }
  }
  session.close();
  console.log(`\n${written.length} capturas en ${outDir}`);
} finally {
  chrome.kill();
}
