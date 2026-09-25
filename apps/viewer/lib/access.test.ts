import { describe, expect, it } from "vitest";
import { isAllowedEntraProfile, isAllowedGoogleProfile, isApiPath, parseAllowlist } from "./access";

describe("parseAllowlist", () => {
  it("normaliza espacios, mayúsculas y vacíos", () => {
    expect([...parseAllowlist(" Ana@Example.com, ,bob@example.com ")]).toEqual(["ana@example.com", "bob@example.com"]);
    expect(parseAllowlist(undefined).size).toBe(0);
  });
});

describe("isAllowedGoogleProfile", () => {
  const allowlist = parseAllowlist("marinerandreu@gmail.com");

  it("deja entrar un email verificado de la lista, sin distinguir mayúsculas", () => {
    expect(isAllowedGoogleProfile({ email: "MarinerAndreu@gmail.com", email_verified: true }, allowlist)).toBe(true);
  });

  it("rechaza una cuenta autenticada que no está en la lista", () => {
    expect(isAllowedGoogleProfile({ email: "otra@gmail.com", email_verified: true }, allowlist)).toBe(false);
  });

  it("rechaza un email no verificado aunque esté en la lista", () => {
    expect(isAllowedGoogleProfile({ email: "marinerandreu@gmail.com", email_verified: false }, allowlist)).toBe(false);
    expect(isAllowedGoogleProfile({ email: "marinerandreu@gmail.com" }, allowlist)).toBe(false);
  });

  it("una lista vacía no deja entrar a nadie", () => {
    expect(isAllowedGoogleProfile({ email: "marinerandreu@gmail.com", email_verified: true }, new Set())).toBe(false);
    expect(isAllowedGoogleProfile(undefined, allowlist)).toBe(false);
  });
});

describe("isAllowedEntraProfile", () => {
  it("exige un oid de la lista", () => {
    const allowlist = parseAllowlist("ABC-123");
    expect(isAllowedEntraProfile({ oid: "abc-123" }, allowlist)).toBe(true);
    expect(isAllowedEntraProfile({ oid: "otro" }, allowlist)).toBe(false);
    expect(isAllowedEntraProfile({ oid: "abc-123" }, new Set())).toBe(false);
  });
});

describe("isApiPath", () => {
  it("distingue API de páginas", () => {
    expect(isApiPath("/api/v1/metrics")).toBe(true);
    expect(isApiPath("/api")).toBe(true);
    expect(isApiPath("/apis")).toBe(false);
    expect(isApiPath("/projects")).toBe(false);
  });
});
