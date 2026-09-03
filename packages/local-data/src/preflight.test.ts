import { describe, expect, it } from "vitest";
import { assertCrawlLimit } from "./preflight";

describe("crawl limit", () => {
  it("accepts the agreed maximum", () => expect(assertCrawlLimit(50_000)).toBe(50_000));
  it("rejects oversized crawls", () => expect(() => assertCrawlLimit(50_001)).toThrow(/50.000/));
});
