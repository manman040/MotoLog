"use client";
import { createBrowserClient } from "@supabase/ssr";
import { supabaseConfig } from "./config";
import type { SupabaseClient } from "@supabase/supabase-js";
let client: SupabaseClient | undefined;
export function supabaseBrowser(): SupabaseClient {
  const { url, key } = supabaseConfig();
  return (client ??= createBrowserClient(url, key));
}
