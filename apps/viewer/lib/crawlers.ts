/**
 * Bloqueo de buscadores, rastreadores de IA y clientes automáticos (D-048).
 *
 * El visor es privado: el login ya impide leer datos, pero la pantalla de login
 * y las redirecciones también son superficie indexable. Esta capa corta antes de
 * Auth.js cualquier petición cuyo user-agent se declare como bot o herramienta
 * automática. Es una defensa en profundidad, no un control de acceso: un
 * user-agent se falsifica, y lo que protege los datos sigue siendo la sesión.
 */

/** Agentes de IA con nombre propio (entrenamiento, búsqueda y asistentes). */
export const AI_AGENTS = [
  "GPTBot", "ChatGPT-User", "OAI-SearchBot",
  "ClaudeBot", "Claude-User", "Claude-SearchBot", "Claude-Web", "anthropic-ai",
  "Google-Extended", "Google-CloudVertexBot", "GoogleOther",
  "Applebot-Extended", "PerplexityBot", "Perplexity-User",
  "Meta-ExternalAgent", "Meta-ExternalFetcher", "FacebookBot",
  "CCBot", "Bytespider", "Amazonbot", "cohere-ai", "cohere-training-data-crawler",
  "Diffbot", "YouBot", "MistralAI-User", "DuckAssistBot", "AI2Bot", "Ai2Bot-Dolma",
  "omgili", "Timpibot", "ImagesiftBot", "PetalBot", "Kangaroo Bot", "img2dataset",
] as const;

/*
 * Patrones genéricos: buscadores (Googlebot, bingbot, YandexBot…), rastreadores
 * SEO (AhrefsBot, SemrushBot…), previsualizadores de enlaces y librerías HTTP o
 * navegadores sin interfaz. Un navegador real no contiene ninguno.
 */
const GENERIC_PATTERNS = [
  /bot\b/i, /bot[/;-]/i, /crawl/i, /spider/i, /slurp/i, /scrap/i, /archiver/i,
  /facebookexternalhit/i, /embedly/i, /preview/i, /headless/i, /phantomjs/i,
  /puppeteer/i, /playwright/i, /selenium/i,
  /^curl\//i, /^wget\//i, /python-requests/i, /python-urllib/i, /aiohttp/i, /httpx/i,
  /go-http-client/i, /java\//i, /okhttp/i, /libwww-perl/i, /node-fetch/i, /axios\//i, /undici/i,
];

const AI_PATTERN = new RegExp(AI_AGENTS.map((agent) => agent.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&")).join("|"), "i");

/** `true` si el user-agent es un bot, un agente de IA o un cliente automático. Sin user-agent también se bloquea. */
export function isBlockedUserAgent(userAgent: string | null | undefined): boolean {
  const ua = userAgent?.trim() ?? "";
  if (!ua) return true;
  return AI_PATTERN.test(ua) || GENERIC_PATTERNS.some((pattern) => pattern.test(ua));
}

/**
 * Rutas que no pasan por el filtro de user-agent:
 * - `/robots.txt`: los rastreadores deben poder leer que no son bienvenidos.
 * - `/api/v1/service/*`: tareas programadas con su propio token (`serviceAuthorized`),
 *   cuyo cliente no es un navegador.
 */
export function bypassesCrawlerBlock(pathname: string): boolean {
  return pathname === "/robots.txt" || pathname.startsWith("/api/v1/service/");
}

/** Directiva común de no indexación, también en cabecera (next.config.ts) y metadatos (layout). */
export const ROBOTS_DIRECTIVE = "noindex, nofollow, noarchive, nosnippet, noimageindex, notranslate, noai, noimageai";

/** Respuesta a un bot bloqueado: 403 sin contenido indexable ni caché. */
export function crawlerBlockedResponse(): Response {
  return new Response("Acceso restringido.", {
    status: 403,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": ROBOTS_DIRECTIVE,
      "TDM-Reservation": "1",
    },
  });
}
