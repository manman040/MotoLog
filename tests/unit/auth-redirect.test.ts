import { describe, it, expect } from "vitest";
import { safeNext, isProtected } from "@/lib/auth/redirect";
describe("auth redirect safety", () => {
  it("accepts local dashboard destinations", () =>
    expect(safeNext("/garage/abc?tab=expenses")).toBe(
      "/garage/abc?tab=expenses",
    ));
  it("rejects external and ambiguous redirects", () => {
    for (const path of [
      "https://evil.test",
      "//evil.test",
      "/\\evil.test",
      "/\nevil.test",
      null,
    ])
      expect(safeNext(path)).toBe("/dashboard");
  });
  it("protects all dashboard routes without matching similar public paths", () => {
    expect(isProtected("/garage/abc")).toBe(true);
    expect(isProtected("/update-password")).toBe(false);
    expect(isProtected("/dashboard-other")).toBe(false);
  });
});
