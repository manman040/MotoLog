import { afterEach, expect, it, vi } from "vitest";
vi.mock("@/lib/supabase/config", () => ({
  supabaseConfig: () => ({
    url: "https://project.supabase.co",
    key: "public-test-key",
  }),
}));
import { ensureGoogleEnabled } from "@/lib/supabase/google";
afterEach(() => vi.unstubAllGlobals());
it("blocks navigation when Google is disabled", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({ external: { google: false } }),
      }),
  );
  await expect(ensureGoogleEnabled()).rejects.toMatchObject({
    code: "google_provider_disabled",
  });
});
it("allows enabled Google providers using public settings only", async () => {
  const request = vi
    .fn()
    .mockResolvedValue({
      ok: true,
      json: async () => ({ external: { google: true } }),
    });
  vi.stubGlobal("fetch", request);
  await expect(ensureGoogleEnabled()).resolves.toBeUndefined();
  expect(request.mock.calls[0][0].pathname).toBe("/auth/v1/settings");
  expect(request.mock.calls[0][1].headers).toEqual({
    apikey: "public-test-key",
  });
});
it("reports settings errors without treating them as disabled providers", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
  await expect(ensureGoogleEnabled()).rejects.toThrow("Unable to check");
});
