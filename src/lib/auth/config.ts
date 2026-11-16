import { firebaseConfigured } from "@/lib/firebase/client";
import { supabaseConfigured } from "@/lib/supabase/config";
export const authBackend =
  process.env.NEXT_PUBLIC_AUTH_BACKEND === "firebase"
    ? "firebase"
    : process.env.NEXT_PUBLIC_AUTH_BACKEND === "supabase"
      ? "supabase"
      : supabaseConfigured
        ? "supabase"
        : "firebase";
export const authConfigured =
  authBackend === "supabase" ? supabaseConfigured : firebaseConfigured;
