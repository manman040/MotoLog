const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const key =
  (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim() || "";
// Browser configuration must never accept a service-role key.
function safePublicKey(value: string) {
  if (value.startsWith("sb_secret_")) return false;
  if (value.split(".").length === 3) {
    try {
      const payload = JSON.parse(
        atob(value.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
      );
      return payload.role === "anon";
    } catch {
      return false;
    }
  }
  return value.startsWith("sb_publishable_");
}
export const supabaseConfigured = Boolean(
  /^https?:\/\//.test(url) && safePublicKey(key),
);
export function assertNoSecretSupabaseKey() {
  if (key && !safePublicKey(key))
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must contain a public publishable key or legacy anon key. Secret/service-role keys are forbidden.",
    );
}
export function supabaseConfig() {
  if (!supabaseConfigured)
    throw new Error(
      "Add a Supabase URL and public publishable (or legacy anon) key to .env.local, then restart MotoLog. Never use a service-role key.",
    );
  return { url, key };
}
