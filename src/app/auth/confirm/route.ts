import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/config";
export async function GET(request: NextRequest) {
  const token_hash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  if (
    supabaseConfigured &&
    token_hash &&
    (type === "email" || type === "signup" || type === "recovery")
  ) {
    const client = await supabaseServer();
    const { error } = await client.auth.verifyOtp({ token_hash, type });
    if (!error) {
      const response = NextResponse.redirect(
        new URL(
          type === "recovery" ? "/update-password" : "/dashboard",
          request.nextUrl.origin,
        ),
      );
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
  }
  return NextResponse.redirect(
    new URL("/login?authError=confirmation", request.nextUrl.origin),
  );
}
