import { describe, expect, it } from "vitest";
import { bypassesCrawlerBlock, crawlerBlockedResponse, isBlockedUserAgent } from "./crawlers";

const BROWSERS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0",
  "Mozilla/5.0 (Linux; Android 9; CUBOT_X19) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36",
];

const BOTS = [
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)",
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot",
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)",
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)",
  "CCBot/2.0 (https://commoncrawl.org/faq/)",
  "Mozilla/5.0 (Linux; Android 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; Bytespider; spider-feedback@bytedance.com)",
  "meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)",
  "Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)",
  "Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)",
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/140.0.0.0 Safari/537.36",
  "curl/8.7.1",
  "python-requests/2.32.3",
  "Go-http-client/2.0",
];

describe("isBlockedUserAgent", () => {
  it.each(BROWSERS)("deja pasar un navegador real: %s", (ua) => {
    expect(isBlockedUserAgent(ua)).toBe(false);
  });

  it.each(BOTS)("bloquea buscadores, agentes de IA y clientes automáticos: %s", (ua) => {
    expect(isBlockedUserAgent(ua)).toBe(true);
  });

  it("bloquea una petición sin user-agent", () => {
    expect(isBlockedUserAgent(null)).toBe(true);
    expect(isBlockedUserAgent("   ")).toBe(true);
  });
});

describe("bypassesCrawlerBlock", () => {
  it("solo exime robots.txt y las tareas de servicio con token", () => {
    expect(bypassesCrawlerBlock("/robots.txt")).toBe(true);
    expect(bypassesCrawlerBlock("/api/v1/service/sync")).toBe(true);
    expect(bypassesCrawlerBlock("/login")).toBe(false);
    expect(bypassesCrawlerBlock("/api/auth/callback/google")).toBe(false);
    expect(bypassesCrawlerBlock("/api/v1/portfolio")).toBe(false);
  });
});

describe("crawlerBlockedResponse", () => {
  it("responde 403 sin caché y con noindex", () => {
    const response = crawlerBlockedResponse();
    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
  });
});
