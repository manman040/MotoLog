import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfig, supabaseConfigured } from "@/lib/supabase/config";
import { isProtected } from "@/lib/auth/redirect";
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (
    process.env.NEXT_PUBLIC_AUTH_BACKEND === "firebase" ||
    !supabaseConfigured
  )
    return response;
  const { url, key } = supabaseConfig();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values, headers) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        if (headers)
          Object.entries(headers).forEach(([name, value]) =>
            response.headers.set(name, value),
          );
      },
    },
  });
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (
    isProtected(request.nextUrl.pathname) &&
    (!user || error) &&
    request.cookies.get("motolog-demo")?.value !== "1"
  ) {
    const target = request.nextUrl.clone();
    target.pathname = "/login";
    target.search = "";
    target.searchParams.set(
      "next",
      request.nextUrl.pathname + request.nextUrl.search,
    );
    const redirect = NextResponse.redirect(target);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    redirect.headers.set("Cache-Control", "private, no-store");
    return redirect;
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|icon.svg|manifest.webmanifest|sw.js|offline.html).*)",
  ],
};
