import { generateKeyPairSync } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { clearRealtimeCache, readRealtime } from "./realtime";

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const env = {
  SEO_DATA_SOURCE: "live",
  GA4_SERVICE_ACCOUNT_JSON: JSON.stringify({
    client_email: "test@example.iam.gserviceaccount.com",
    private_key: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  }),
  GA4_PROPERTY_ID_PORCELANOSA: "1",
  GA4_PROPERTY_ID_NOKEN: "2",
  GA4_PROPERTY_ID_XTONE: "3",
};
const byProperty: Record<string, number> = { "1": 120, "2": 30, "3": 7 };
const read = async (_env: unknown, propertyId: string) =>
  byProperty[propertyId]!;

describe("readRealtime", () => {
  beforeEach(() => clearRealtimeCache());

  it("no inventa una cifra fuera del origen en directo", async () => {
    const result = await readRealtime(
      "xtone",
      { ...env, SEO_DATA_SOURCE: "synthetic" },
      read,
    );
    expect(result).toMatchObject({
      status: "no_configurado",
      activeUsers: null,
    });
  });

  it("lee solo la propiedad de la marca de la ficha", async () => {
    const result = await readRealtime("xtone", env, read);
    expect(result).toMatchObject({ status: "ok", activeUsers: 7 });
    expect(result.brands).toEqual([{ slug: "xtone", activeUsers: 7 }]);
  });

  it("suma el piloto en el conjunto", async () => {
    expect((await readRealtime("all", env, read)).activeUsers).toBe(157);
  });

  it("declara parcial cuando una propiedad falla", async () => {
    const failing = async (e: unknown, id: string) => {
      if (id === "2") throw new Error("429");
      return read(e, id);
    };
    const result = await readRealtime("all", env, failing);
    expect(result).toMatchObject({ status: "parcial", activeUsers: 127 });
  });

  it("marca sin propiedad GA4 queda sin configurar", async () => {
    expect((await readRealtime("krion", env, read)).status).toBe(
      "no_configurado",
    );
  });

  it("reutiliza la lectura durante 30 segundos", async () => {
    let calls = 0;
    const counting = async (e: unknown, id: string) => {
      calls += 1;
      return read(e, id);
    };
    let clock = 1_000_000;
    await readRealtime("xtone", env, counting, () => clock);
    clock += 20_000;
    await readRealtime("xtone", env, counting, () => clock);
    clock += 15_000;
    await readRealtime("xtone", env, counting, () => clock);
    expect(calls).toBe(2);
  });
});
