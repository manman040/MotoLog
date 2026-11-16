import { supabaseConfig } from "./config";

export class GoogleProviderError extends Error {
  readonly code = "google_provider_disabled";
  constructor() {
    super("Google sign-in has not been enabled for this Supabase project.");
  }
}

/** Check the public Auth settings before OAuth navigates away from MotoLog. */
export async function ensureGoogleEnabled() {
  const { url, key } = supabaseConfig();
  const response = await fetch(new URL("/auth/v1/settings", url), {
    headers: { apikey: key },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok)
    throw new Error("Unable to check Google sign-in availability.");
  const settings = (await response.json()) as {
    external?: { google?: boolean };
  };
  if (settings.external?.google !== true) throw new GoogleProviderError();
}
