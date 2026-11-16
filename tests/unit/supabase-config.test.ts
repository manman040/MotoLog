import { afterEach, expect, it, vi } from "vitest";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});
it("rejects service role and secret keys in browser configuration", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
  for (const key of [
    "sb_secret_do-not-use",
    `e30.${btoa(JSON.stringify({ role: "service_role" }))}.fake`,
  ]) {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", key);
    vi.resetModules();
    const config = await import("@/lib/supabase/config");
    expect(config.supabaseConfigured).toBe(false);
    expect(() => config.supabaseConfig()).toThrow(
      "Never use a service-role key",
    );
  }
});
