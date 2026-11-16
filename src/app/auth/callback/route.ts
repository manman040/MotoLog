import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/config";
import { safeNext } from "@/lib/auth/redirect";
import { callbackFailure } from "@/lib/auth/callback-errors";
export async function GET(request: NextRequest) {
  let reason = "callback";
  if (request.nextUrl.searchParams.has("error")) reason = "callback_denied";
  const code = request.nextUrl.searchParams.get("code");
  if (supabaseConfigured && code) {
    const client = await supabaseServer();
    const flowId = request.nextUrl.searchParams.get("sb_flow_id");
    const { error } = await client.auth.exchangeCodeForSession(
      code,
      flowId ? { flowId } : undefined,
    );
    if (!error) {
      const response = NextResponse.redirect(
        new URL(
          safeNext(request.nextUrl.searchParams.get("next")),
          request.nextUrl.origin,
        ),
      );
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
    reason = callbackFailure(error);
  }
  return NextResponse.redirect(
    new URL(`/login?authError=${reason}`, request.nextUrl.origin),
  );
}
