/**
 * robots.txt mínimo y correcto para el crawl (D-070): grupos por user-agent,
 * comodines `*` y `$`, y la regla más específica gana (a igual longitud, Allow).
 * Se aplica el grupo de nuestro agente si existe; si no, el de `*`.
 */

type Rule = { allow: boolean; pattern: string };
export type Robots = { isAllowed: (url: URL) => boolean; sitemaps: string[]; crawlDelayMs: number | null };

function toRegex(pattern: string): RegExp {
  const anchored = pattern.endsWith("$");
  const body = (anchored ? pattern.slice(0, -1) : pattern).replace(/[.+?^{}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${body}${anchored ? "$" : ""}`);
}

export function parseRobots(text: string, agentToken: string): Robots {
  const groups: Array<{ agents: string[]; rules: Rule[]; delay: number | null }> = [];
  const sitemaps: string[] = [];
  let current: (typeof groups)[number] | null = null;
  let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    const match = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!match) continue;
    const field = match[1]!.toLowerCase();
    const value = match[2]!.trim();
    if (field === "sitemap") {
      if (value) sitemaps.push(value);
      continue;
    }
    if (field === "user-agent") {
      if (!current || !lastWasAgent) groups.push((current = { agents: [], rules: [], delay: null }));
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (field === "allow" || field === "disallow") {
      if (value) current.rules.push({ allow: field === "allow", pattern: value });
    } else if (field === "crawl-delay") {
      const seconds = Number(value);
      if (Number.isFinite(seconds)) current.delay = seconds * 1000;
    }
  }
  const token = agentToken.toLowerCase();
  const group = groups.find((item) => item.agents.some((agent) => agent !== "*" && token.includes(agent))) ?? groups.find((item) => item.agents.includes("*"));
  const rules = (group?.rules ?? []).map((rule) => ({ ...rule, regex: toRegex(rule.pattern) }));
  return {
    sitemaps,
    crawlDelayMs: group?.delay ?? null,
    isAllowed(url) {
      const path = `${url.pathname}${url.search}`;
      let best: (typeof rules)[number] | null = null;
      for (const rule of rules) {
        if (!rule.regex.test(path)) continue;
        if (!best || rule.pattern.length > best.pattern.length || (rule.pattern.length === best.pattern.length && rule.allow)) best = rule;
      }
      return best ? best.allow : true;
    },
  };
}
