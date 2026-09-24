import { findSource, sourceKeySchema, type SourceKey } from "@seo/contracts";

/**
 * Reglas de ejecución de la sincronización: cuota, reintento y lock (P3.3).
 *
 * Son las tres reglas que el roadmap enuncia para SEMrush, CrUX y PageSpeed y
 * que ninguna integración puede saltarse, tampoco las diarias de P3.2. Se
 * escriben ahora, sin credenciales, por el mismo motivo que D-030: estrenar una
 * política de reintentos contra el proveedor real es el peor momento para
 * descubrir que reintenta lo que no debe. Las tres son provider-agnósticas —no
 * mencionan HTTP, ni SDK, ni endpoint— y por eso se pueden probar de verdad hoy
 * con un lector que falla a propósito.
 *
 * Lo que estas reglas protegen, en orden de gravedad:
 *
 * 1. **La cuota se reserva antes de llamar, no se cuenta después.** Contar
 *    después es contar lo ya gastado: cuando el contador detecta el exceso, la
 *    petición ya salió y el proveedor ya la penalizó. El presupuesto solo sirve
 *    si puede decir «hoy no» *antes*.
 * 2. **Un reintento gasta cuota.** Si los reintentos no se descuentan del mismo
 *    presupuesto, el presupuesto es una cifra decorativa: un día con muchos
 *    errores 429 puede duplicar el gasto real sin que el contador se entere.
 * 3. **Un error permanente no se reintenta.** Reintentar unas credenciales
 *    revocadas o una propiedad que no existe no tiene ninguna probabilidad de
 *    éxito, quema cuota y retrasa a los jobs que sí podrían entrar.
 * 4. **Un lock con TTL y sin ficha no impide la escritura tardía.** El TTL
 *    caduca el permiso, no el proceso: un ciclo atascado sigue vivo, cree que
 *    manda y escribe encima del ciclo que le sustituyó. La ficha creciente
 *    (`fencingToken`) es lo que permite rechazar esa escritura.
 */

/** Motivo por el que un job no se ejecuta ahora. No es un fallo. */
export type DeferralReason = "quota" | "locked";

/* ------------------------------------------------------------------------ */
/* Cuota                                                                     */
/* ------------------------------------------------------------------------ */

export type QuotaBudget = {
  readonly source: SourceKey;
  /** Peticiones que V2 se permite gastar en un día UTC, reintentos incluidos. */
  readonly dailyRequests: number;
  /** Peticiones que se permite gastar en una ventana deslizante de 60 s. */
  readonly burstPerMinute: number;
  /**
   * `false` mientras nadie haya comparado esta cifra con el límite publicado
   * por el proveedor. Es la misma disciplina que `realData` en los lectores
   * (D-030): un presupuesto sin verificar no puede presentarse como el límite
   * del proveedor, solo como el que V2 se impone a sí misma.
   */
  readonly verifiedAgainstProvider: boolean;
  readonly rationale: string;
};

/**
 * Presupuesto propio por fuente. **No** es el límite publicado por el
 * proveedor: es el gasto que V2 se autoriza, deliberadamente conservador, para
 * que un ciclo defectuoso no agote la cuota real del grupo antes de que nadie
 * lo mire. Se revisa cuando lleguen las credenciales y se conozca el límite de
 * cada contrato; hasta entonces `verifiedAgainstProvider` es `false` en todas.
 */
export const QUOTA_BUDGETS = [
  {
    source: "ga4",
    dailyRequests: 1_500,
    burstPerMinute: 60,
    verifiedAgainstProvider: false,
    rationale: "Dos proyectos x siete días x reintentos deja margen de sobra; el límite real de la Data API se mide por tokens, no por peticiones, y se ajustará al conectar.",
  },
  {
    source: "gsc",
    dailyRequests: 1_500,
    burstPerMinute: 60,
    verifiedAgainstProvider: false,
    rationale: "Search Console limita por minuto y por día; el presupuesto propio se queda muy por debajo para no competir con otras herramientas del grupo sobre la misma propiedad.",
  },
  {
    source: "semrush",
    dailyRequests: 400,
    burstPerMinute: 20,
    verifiedAgainstProvider: false,
    rationale: "SEMrush cobra por unidades consumidas, así que el presupuesto es de coste, no de rendimiento: una fuga aquí se paga en factura.",
  },
  {
    source: "crux",
    dailyRequests: 800,
    burstPerMinute: 30,
    verifiedAgainstProvider: false,
    rationale: "CrUX es de campo y semanal: el volumen es bajo por diseño y un pico solo puede venir de un bucle.",
  },
  {
    source: "pagespeed",
    dailyRequests: 400,
    burstPerMinute: 15,
    verifiedAgainstProvider: false,
    rationale: "PageSpeed audita muestras versionadas de plantillas, no el sitio entero; el presupuesto fija ese alcance en vez de confiar en que la muestra no crezca.",
  },
  {
    source: "geo",
    dailyRequests: 200,
    burstPerMinute: 10,
    verifiedAgainstProvider: false,
    rationale: "GEO consulta asistentes de terceros en P8; el presupuesto existe desde ahora para que la fase no estrene también el control de gasto.",
  },
  {
    source: "crawl",
    dailyRequests: 20,
    burstPerMinute: 5,
    verifiedAgainstProvider: false,
    rationale: "El crawl no es una API con cuota sino una ejecución local cara: el presupuesto limita cuántas se lanzan, que es el recurso escaso (bloqueo de disco activo).",
  },
] as const satisfies ReadonlyArray<QuotaBudget>;

export function quotaBudget(source: SourceKey): QuotaBudget {
  const budget = QUOTA_BUDGETS.find((candidate) => candidate.source === source);
  if (!budget) throw new Error(`Fuente «${source}» sin presupuesto de cuota declarado`);
  return budget;
}

export type QuotaDecision =
  | { readonly granted: true; readonly remainingDaily: number; readonly remainingBurst: number }
  | {
      readonly granted: false;
      /** Qué límite se agotó: el del día o el del minuto. */
      readonly scope: "daily" | "burst";
      /** Espera mínima hasta que la reserva podría concederse. */
      readonly retryAfterMs: number;
      readonly reason: string;
    };

/**
 * Contador de cuota. La interfaz es la que P3.3 implementará contra PostgreSQL
 * cuando la instancia exista: un contador en memoria por proceso deja de servir
 * en cuanto haya dos réplicas, y la regla —reservar antes de llamar— es la
 * misma en los dos casos.
 */
export interface QuotaLedger {
  /** Reserva `cost` peticiones. Si no concede, nadie debe llamar a la fuente. */
  reserve(source: SourceKey, at: Date, cost?: number): QuotaDecision;
  /** Gasto acumulado del día UTC de `at`. Es lo que publica la observabilidad. */
  spent(source: SourceKey, at: Date): { readonly daily: number; readonly burst: number };
}

const MINUTE_MS = 60_000;

export class InMemoryQuotaLedger implements QuotaLedger {
  /** Marcas de tiempo de cada petición reservada, por fuente. */
  private readonly stamps = new Map<SourceKey, number[]>();

  constructor(private readonly overrides: Partial<Record<SourceKey, Partial<QuotaBudget>>> = {}) {}

  private budgetFor(source: SourceKey): QuotaBudget {
    return { ...quotaBudget(source), ...(this.overrides[source] ?? {}) };
  }

  private stampsFor(source: SourceKey): number[] {
    const existing = this.stamps.get(source);
    if (existing) return existing;
    const created: number[] = [];
    this.stamps.set(source, created);
    return created;
  }

  reserve(source: SourceKey, at: Date, cost = 1): QuotaDecision {
    sourceKeySchema.parse(source);
    if (!Number.isInteger(cost) || cost < 1) throw new Error(`Coste de cuota no válido: ${cost}`);

    const budget = this.budgetFor(source);
    const now = at.getTime();
    if (Number.isNaN(now)) throw new Error("Instante no válido al reservar cuota");

    const stamps = this.stampsFor(source);
    const dayStart = Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate());
    const daily = stamps.filter((stamp) => stamp >= dayStart).length;
    const burstFrom = now - MINUTE_MS;
    const burstStamps = stamps.filter((stamp) => stamp > burstFrom);

    if (daily + cost > budget.dailyRequests) {
      const tomorrow = dayStart + 86_400_000;
      return {
        granted: false,
        scope: "daily",
        retryAfterMs: Math.max(0, tomorrow - now),
        reason: `Presupuesto diario de ${source} agotado: ${daily}/${budget.dailyRequests} peticiones en el día UTC.`,
      };
    }

    if (burstStamps.length + cost > budget.burstPerMinute) {
      const oldest = burstStamps[0] ?? now;
      return {
        granted: false,
        scope: "burst",
        retryAfterMs: Math.max(1, oldest + MINUTE_MS - now),
        reason: `Ritmo de ${source} por encima del presupuesto: ${burstStamps.length}/${budget.burstPerMinute} peticiones en los últimos 60 s.`,
      };
    }

    for (let index = 0; index < cost; index += 1) stamps.push(now);
    return {
      granted: true,
      remainingDaily: budget.dailyRequests - daily - cost,
      remainingBurst: budget.burstPerMinute - burstStamps.length - cost,
    };
  }

  spent(source: SourceKey, at: Date) {
    const stamps = this.stampsFor(source);
    const now = at.getTime();
    const dayStart = Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate());
    return {
      daily: stamps.filter((stamp) => stamp >= dayStart).length,
      burst: stamps.filter((stamp) => stamp > now - MINUTE_MS).length,
    };
  }
}

/* ------------------------------------------------------------------------ */
/* Reintento                                                                 */
/* ------------------------------------------------------------------------ */

/**
 * Naturaleza del fallo. Es lo único que decide si se reintenta; el texto del
 * error no decide nada, porque un mensaje se cambia sin querer y una política de
 * reintentos que dependa de una subcadena falla en silencio.
 */
export type FailureKind = "rate-limited" | "transient" | "permanent" | "unknown";

/** La fuente pide esperar. Trae la espera que ella misma indica, si la indica. */
export class RateLimitedError extends Error {
  readonly retryAfterMs: number | null;
  constructor(message: string, retryAfterMs: number | null = null) {
    super(message);
    this.name = "RateLimitedError";
    this.retryAfterMs = retryAfterMs;
  }
}

/** Avería pasajera: corte de red, tiempo agotado, 5xx del proveedor. */
export class TransientSourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransientSourceError";
  }
}

/**
 * Avería que no se arregla esperando: credenciales revocadas, propiedad
 * inexistente, permiso denegado, consulta mal formada. Reintentarla gasta cuota
 * a cambio de nada.
 */
export class PermanentSourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermanentSourceError";
  }
}

export type FailureClassification = {
  readonly kind: FailureKind;
  readonly retryable: boolean;
  /** Espera pedida por la fuente. `null` si no la indica. */
  readonly retryAfterMs: number | null;
  readonly reason: string;
};

function statusOf(error: unknown): number | null {
  if (typeof error !== "object" || error === null) return null;
  const status = (error as { status?: unknown; statusCode?: unknown }).status ?? (error as { statusCode?: unknown }).statusCode;
  return typeof status === "number" ? status : null;
}

/**
 * Clasifica el fallo por su tipo declarado y, si no lo trae, por su código de
 * estado. Un error sin ninguna de las dos cosas es `unknown`: se reintenta,
 * pero menos veces que un transitorio declarado, porque no sabemos si esperar
 * sirve de algo.
 */
export function classifyFailure(error: unknown): FailureClassification {
  const message = error instanceof Error ? error.message : String(error);

  if (error instanceof RateLimitedError) {
    return { kind: "rate-limited", retryable: true, retryAfterMs: error.retryAfterMs, reason: message };
  }
  if (error instanceof TransientSourceError) {
    return { kind: "transient", retryable: true, retryAfterMs: null, reason: message };
  }
  if (error instanceof PermanentSourceError) {
    return { kind: "permanent", retryable: false, retryAfterMs: null, reason: message };
  }
  // Perder el arrendamiento es permanente **dentro de este ciclo**: el relevo ya
  // lo tiene otro y reintentar solo volvería a leer para volver a descartarlo.
  if (error instanceof LeaseLostError) {
    return { kind: "permanent", retryable: false, retryAfterMs: null, reason: message };
  }

  const status = statusOf(error);
  if (status === 429) return { kind: "rate-limited", retryable: true, retryAfterMs: null, reason: message };
  if (status !== null && (status >= 500 || status === 408)) {
    return { kind: "transient", retryable: true, retryAfterMs: null, reason: message };
  }
  if (status !== null && status >= 400) {
    return { kind: "permanent", retryable: false, retryAfterMs: null, reason: message };
  }

  return { kind: "unknown", retryable: true, retryAfterMs: null, reason: message };
}

export type RetryPolicy = {
  /** Intentos totales, el primero incluido, para un fallo reintentable. */
  readonly maxAttempts: number;
  /**
   * Intentos totales para un fallo `unknown`. Menor a propósito: no sabemos si
   * esperar ayuda, y cada intento gasta cuota.
   */
  readonly maxAttemptsUnknown: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  /** Proporción de dispersión aleatoria, de 0 a 1. */
  readonly jitterRatio: number;
  /** Techo de espera acumulada por job: un día malo no puede comerse el ciclo. */
  readonly maxTotalWaitMs: number;
};

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  maxAttemptsUnknown: 2,
  baseDelayMs: 1_000,
  maxDelayMs: 30_000,
  jitterRatio: 0.2,
  maxTotalWaitMs: 60_000,
};

/**
 * Espera antes del intento `attempt + 1`, exponencial y con dispersión.
 *
 * La dispersión no es adorno: sin ella, veintiocho jobs que reciben el mismo
 * 429 esperan exactamente lo mismo y vuelven a la vez, que es la forma de
 * convertir un límite momentáneo en un ciclo entero rebotando. Si la fuente
 * indica cuánto esperar, se respeta su cifra cuando es mayor que la calculada:
 * el proveedor sabe mejor que nosotros cuándo vuelve a admitir tráfico.
 */
export function retryDelayMs(
  attempt: number,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY,
  options: { readonly retryAfterMs?: number | null; readonly random?: () => number } = {},
): number {
  if (attempt < 1) throw new Error(`Intento no válido: ${attempt}`);
  const random = options.random ?? Math.random;
  const exponential = Math.min(policy.baseDelayMs * 2 ** (attempt - 1), policy.maxDelayMs);
  const spread = exponential * policy.jitterRatio;
  const jittered = Math.round(exponential - spread + random() * spread * 2);
  const floor = options.retryAfterMs ?? 0;
  return Math.max(0, Math.max(jittered, floor));
}

export type RetryDecision = {
  readonly retry: boolean;
  readonly delayMs: number;
  readonly reason: string;
};

/**
 * Decide si hay otro intento tras el intento `attempt`. `waitedMs` es la espera
 * ya acumulada por este job: el techo existe para que un job no monopolice el
 * ciclo esperando a una fuente que no vuelve.
 */
export function shouldRetry(input: {
  readonly attempt: number;
  readonly classification: FailureClassification;
  readonly policy?: RetryPolicy;
  readonly waitedMs?: number;
  readonly random?: () => number;
}): RetryDecision {
  const policy = input.policy ?? DEFAULT_RETRY_POLICY;
  const waited = input.waitedMs ?? 0;
  const { classification } = input;

  if (!classification.retryable) {
    return {
      retry: false,
      delayMs: 0,
      reason: `Fallo permanente (${classification.kind}): reintentarlo gastaría cuota sin ninguna probabilidad de éxito.`,
    };
  }

  const limit = classification.kind === "unknown" ? policy.maxAttemptsUnknown : policy.maxAttempts;
  if (input.attempt >= limit) {
    return { retry: false, delayMs: 0, reason: `Agotados los ${limit} intentos para un fallo ${classification.kind}.` };
  }

  const delayMs = retryDelayMs(input.attempt, policy, {
    retryAfterMs: classification.retryAfterMs,
    random: input.random,
  });

  if (waited + delayMs > policy.maxTotalWaitMs) {
    return {
      retry: false,
      delayMs: 0,
      reason: `La espera acumulada (${waited} ms) más la siguiente (${delayMs} ms) supera el techo de ${policy.maxTotalWaitMs} ms por job.`,
    };
  }

  return { retry: true, delayMs, reason: `Reintento ${input.attempt + 1}/${limit} tras ${delayMs} ms por un fallo ${classification.kind}.` };
}

/* ------------------------------------------------------------------------ */
/* Lock                                                                      */
/* ------------------------------------------------------------------------ */

export type Lease = {
  readonly key: string;
  readonly owner: string;
  /**
   * Ficha creciente por clave. Es lo que distingue este lock del de P0: quien
   * escribe presenta su ficha y el almacén rechaza cualquiera menor que la
   * última que aceptó, así que un ciclo atascado que despierta pasado el TTL no
   * puede escribir encima del ciclo que le sustituyó.
   */
  readonly fencingToken: number;
  readonly acquiredAt: string;
  readonly expiresAt: string;
};

export type LockAttempt =
  | { readonly acquired: true; readonly lease: Lease }
  | { readonly acquired: false; readonly heldBy: string; readonly expiresAt: string; readonly reason: string };

export class LeaseLostError extends Error {
  constructor(readonly lease: Lease, reason: string) {
    super(`El lock «${lease.key}» ya no pertenece a ${lease.owner} (ficha ${lease.fencingToken}): ${reason}`);
    this.name = "LeaseLostError";
  }
}

export interface SyncLock {
  acquire(input: { key: string; owner: string; ttlMs: number; now: Date }): LockAttempt;
  renew(lease: Lease, input: { ttlMs: number; now: Date }): Lease;
  release(lease: Lease): void;
  holds(lease: Lease, now: Date): boolean;
  /** Se llama justo antes de escribir. Lanza si la ficha ya no es la vigente. */
  assertHolds(lease: Lease, now: Date): void;
}

/** Clave del lock de un `SyncRun`: un ciclo por proyecto y fuente. */
export function syncRunLockKey(project: string, source: SourceKey): string {
  return `sync:${project}:${source}`;
}

export class InMemoryLeaseLock implements SyncLock {
  private readonly leases = new Map<string, Lease>();
  private readonly tokens = new Map<string, number>();

  acquire(input: { key: string; owner: string; ttlMs: number; now: Date }): LockAttempt {
    if (input.ttlMs <= 0) throw new Error(`TTL de lock no válido: ${input.ttlMs}`);
    const current = this.leases.get(input.key);
    const now = input.now.getTime();

    if (current && Date.parse(current.expiresAt) > now) {
      return {
        acquired: false,
        heldBy: current.owner,
        expiresAt: current.expiresAt,
        reason: `Otro ciclo sostiene «${input.key}» hasta ${current.expiresAt}. Se aplaza en vez de ejecutarse en paralelo: dos ciclos sobre el mismo proyecto y fuente escriben el mismo día dos veces.`,
      };
    }

    const fencingToken = (this.tokens.get(input.key) ?? 0) + 1;
    this.tokens.set(input.key, fencingToken);
    const lease: Lease = {
      key: input.key,
      owner: input.owner,
      fencingToken,
      acquiredAt: input.now.toISOString(),
      expiresAt: new Date(now + input.ttlMs).toISOString(),
    };
    this.leases.set(input.key, lease);
    return { acquired: true, lease };
  }

  renew(lease: Lease, input: { ttlMs: number; now: Date }): Lease {
    this.assertHolds(lease, input.now);
    const renewed: Lease = { ...lease, expiresAt: new Date(input.now.getTime() + input.ttlMs).toISOString() };
    this.leases.set(lease.key, renewed);
    return renewed;
  }

  release(lease: Lease): void {
    const current = this.leases.get(lease.key);
    // Solo libera quien de verdad lo tiene. Un ciclo caducado que libera al
    // terminar dejaría sin lock al ciclo que le sustituyó.
    if (current && current.fencingToken === lease.fencingToken) this.leases.delete(lease.key);
  }

  holds(lease: Lease, now: Date): boolean {
    const current = this.leases.get(lease.key);
    if (!current || current.fencingToken !== lease.fencingToken) return false;
    return Date.parse(current.expiresAt) > now.getTime();
  }

  assertHolds(lease: Lease, now: Date): void {
    const current = this.leases.get(lease.key);
    if (!current || current.fencingToken !== lease.fencingToken) {
      throw new LeaseLostError(lease, `la ficha vigente es ${current?.fencingToken ?? "ninguna"}`);
    }
    if (Date.parse(current.expiresAt) <= now.getTime()) {
      throw new LeaseLostError(lease, `el arrendamiento caducó en ${current.expiresAt}`);
    }
  }
}

/** Comprobación de coherencia entre el catálogo y los presupuestos declarados. */
export function assertQuotaCatalogCoverage(): void {
  for (const budget of QUOTA_BUDGETS) {
    if (!findSource(budget.source)) throw new Error(`Presupuesto de una fuente no declarada en el catálogo: ${budget.source}`);
  }
}
