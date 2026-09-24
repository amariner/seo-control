import { createSign } from "node:crypto";

/**
 * Acceso directo a GA4 Data API y Search Console API (D-034).
 *
 * Sin SDK de Google a propósito: `googleapis` pesa decenas de megas en una
 * función serverless y aquí solo hacen falta dos endpoints y dos formas de
 * obtener un token. Las credenciales son las mismas que usa la V1:
 *
 * - GA4: cuenta de servicio (`GA4_SERVICE_ACCOUNT_JSON`), JWT firmado RS256.
 * - GSC: cliente OAuth con refresh token de solo lectura
 *   (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`).
 *
 * Todo corre en el servidor. El navegador nunca ve un token ni una respuesta
 * cruda: recibe el payload ya agregado del contrato.
 */

export type Env = Record<string, string | undefined>;

type CachedToken = { token: string; expiresAt: number };
const tokens = new Map<string, CachedToken>();

const TOKEN_URL = "https://oauth2.googleapis.com/token";

export class GoogleApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "GoogleApiError";
    this.status = status;
  }
}

const base64url = (input: string | Buffer) => Buffer.from(input).toString("base64url");

async function exchangeToken(body: URLSearchParams): Promise<CachedToken> {
  const response = await fetch(TOKEN_URL, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body, cache: "no-store" });
  const json = (await response.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string; error?: string };
  if (!response.ok || !json.access_token) throw new GoogleApiError(response.status, `Token de Google rechazado: ${json.error_description ?? json.error ?? response.statusText}`);
  // Se renueva un minuto antes de caducar para no firmar peticiones con un token moribundo.
  return { token: json.access_token, expiresAt: Date.now() + ((json.expires_in ?? 3600) - 60) * 1000 };
}

async function cached(key: string, issue: () => Promise<CachedToken>): Promise<string> {
  const hit = tokens.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.token;
  const fresh = await issue();
  tokens.set(key, fresh);
  return fresh.token;
}

type ServiceAccount = { client_email: string; private_key: string };

export function parseServiceAccount(env: Env): ServiceAccount | null {
  const raw = env.GA4_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  // Se acepta el JSON tal cual o en base64: algunos paneles de variables rompen los saltos de línea de la clave.
  const text = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  const parsed = JSON.parse(text) as Partial<ServiceAccount>;
  if (!parsed.client_email || !parsed.private_key) throw new Error("GA4_SERVICE_ACCOUNT_JSON no contiene client_email y private_key");
  return { client_email: parsed.client_email, private_key: parsed.private_key.replace(/\\n/g, "\n") };
}

export function hasGscCredentials(env: Env): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REFRESH_TOKEN);
}

async function ga4Token(env: Env): Promise<string> {
  const account = parseServiceAccount(env);
  if (!account) throw new Error("Falta GA4_SERVICE_ACCOUNT_JSON");
  return cached(`sa:${account.client_email}`, async () => {
    const now = Math.floor(Date.now() / 1000);
    const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const claims = base64url(JSON.stringify({ iss: account.client_email, scope: "https://www.googleapis.com/auth/analytics.readonly", aud: TOKEN_URL, iat: now, exp: now + 3600 }));
    const signature = createSign("RSA-SHA256").update(`${header}.${claims}`).sign(account.private_key).toString("base64url");
    return exchangeToken(new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${header}.${claims}.${signature}` }));
  });
}

async function gscToken(env: Env): Promise<string> {
  if (!hasGscCredentials(env)) throw new Error("Faltan GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET o GOOGLE_REFRESH_TOKEN");
  return cached(`oauth:${env.GOOGLE_CLIENT_ID}`, () =>
    exchangeToken(new URLSearchParams({ grant_type: "refresh_token", client_id: env.GOOGLE_CLIENT_ID!, client_secret: env.GOOGLE_CLIENT_SECRET!, refresh_token: env.GOOGLE_REFRESH_TOKEN! })),
  );
}

/**
 * Una llamada con dos reintentos ante límites de cuota (429) o fallos del
 * servidor (5xx), con espera creciente. Search Console aplica una «cuota de
 * carga» por sitio que se recupera en segundos; rendirse a la primera dejaba la
 * fuente entera en error por un pico.
 */
async function postJson<T>(url: string, token: string, body: unknown): Promise<T> {
  let response: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt) await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    response = await fetch(url, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
    if (response.ok || (response.status !== 429 && response.status < 500)) break;
  }
  if (!response) throw new GoogleApiError(0, "Sin respuesta");
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new GoogleApiError(response.status, detail?.error?.message ?? response.statusText);
  }
  return (await response.json()) as T;
}

// ---------------------------------------------------------------------------
// GA4 Data API
// ---------------------------------------------------------------------------

export type Ga4DateRange = { startDate: string; endDate: string; name?: string };
export type Ga4FilterExpression = Record<string, unknown>;
export type Ga4Request = {
  dateRanges: Ga4DateRange[];
  dimensions?: Array<{ name: string }>;
  metrics: Array<{ name: string }>;
  dimensionFilter?: Ga4FilterExpression;
  limit?: string;
  orderBys?: unknown[];
};
export type Ga4Row = { dimensionValues?: Array<{ value?: string }>; metricValues?: Array<{ value?: string }> };
export type Ga4Report = { rows?: Ga4Row[]; dimensionHeaders?: Array<{ name?: string }> };

/** Hasta cinco informes por llamada, que es el máximo de `batchRunReports`. */
export async function ga4Batch(env: Env, propertyId: string, requests: Ga4Request[]): Promise<Ga4Report[]> {
  const token = await ga4Token(env);
  const reports: Ga4Report[] = [];
  for (let index = 0; index < requests.length; index += 5) {
    const chunk = requests.slice(index, index + 5);
    const result = await postJson<{ reports?: Ga4Report[] }>(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:batchRunReports`, token, { requests: chunk });
    reports.push(...(result.reports ?? chunk.map(() => ({}))));
  }
  return reports;
}

/**
 * Usuarios activos en los últimos 30 minutos (GA4 Realtime API). La API no
 * expone canal, fuente ni ruta: la cifra es el tráfico total de la propiedad.
 */
export async function ga4RealtimeActiveUsers(env: Env, propertyId: string): Promise<number> {
  const token = await ga4Token(env);
  const result = await postJson<{ rows?: Ga4Row[]; totals?: Ga4Row[] }>(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`,
    token,
    { metrics: [{ name: "activeUsers" }] },
  );
  const row = result.rows?.[0] ?? result.totals?.[0];
  return Number(row?.metricValues?.[0]?.value ?? 0);
}

// ---------------------------------------------------------------------------
// Search Console API
// ---------------------------------------------------------------------------

export type GscFilter = { dimension: "page" | "query" | "country" | "device"; operator: "includingRegex" | "excludingRegex" | "equals" | "contains"; expression: string };
export type GscRequest = { startDate: string; endDate: string; dimensions?: Array<"date" | "page" | "query" | "country">; filters?: GscFilter[]; rowLimit?: number; startRow?: number; /** Tipo de búsqueda; por defecto `web`, que es lo que suma el panel. */ type?: "web" | "image" };
export type GscRow = { keys?: string[]; clicks: number; impressions: number; ctr: number; position: number };

export async function gscQuery(env: Env, siteUrl: string, request: GscRequest): Promise<GscRow[]> {
  const token = await gscToken(env);
  const body = {
    startDate: request.startDate,
    endDate: request.endDate,
    dimensions: request.dimensions ?? [],
    dimensionFilterGroups: request.filters?.length ? [{ groupType: "and", filters: request.filters }] : undefined,
    rowLimit: request.rowLimit ?? 1000,
    startRow: request.startRow,
    type: request.type,
    dataState: "final",
  };
  const result = await postJson<{ rows?: GscRow[] }>(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, token, body);
  return result.rows ?? [];
}
