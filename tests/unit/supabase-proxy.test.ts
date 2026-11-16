// @vitest-environment node
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  setAll: undefined as
    | undefined
    | ((
        values: { name: string; value: string; options: object }[],
        headers: Record<string, string>,
      ) => void),
}));
vi.mock("@/lib/supabase/config", () => ({
  supabaseConfigured: true,
  supabaseConfig: () => ({
    url: "https://example.supabase.co",
    key: "sb_publishable_test",
  }),
}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: (
    _url: string,
    _key: string,
    options: { cookies: { setAll: typeof mocks.setAll } },
  ) => {
    mocks.setAll = options.cookies.setAll;
    return { auth: { getUser: mocks.getUser } };
  },
}));
import { proxy } from "@/proxy";
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_AUTH_BACKEND", "supabase");
  vi.clearAllMocks();
});
afterEach(() => vi.unstubAllEnvs());
it("rejects unauthenticated dashboard requests and preserves refreshed cookies", async () => {
  mocks.getUser.mockImplementation(async () => {
    mocks.setAll?.(
      [
        {
          name: "sb-session",
          value: "rotated",
          options: { httpOnly: true, sameSite: "lax", path: "/" },
        },
      ],
      { "Cache-Control": "private, no-store" },
    );
    return { data: { user: null }, error: null };
  });
  const response = await proxy(
    new NextRequest("http://localhost:3000/garage/123?tab=history"),
  );
  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toContain("/login?next=");
  expect(response.cookies.get("sb-session")?.value).toBe("rotated");
  expect(response.headers.get("cache-control")).toContain("no-store");
});
it("allows a validated user and disables private response caching", async () => {
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "owner" } },
    error: null,
  });
  const response = await proxy(
    new NextRequest("http://localhost:3000/dashboard"),
  );
  expect(response.status).toBe(200);
  expect(mocks.getUser).toHaveBeenCalledOnce();
  expect(response.headers.get("cache-control")).toContain("no-store");
});
it("treats demo as navigation only and still checks the real session", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
  const response = await proxy(
    new NextRequest("http://localhost:3000/dashboard", {
      headers: { cookie: "motolog-demo=1" },
    }),
  );
  expect(response.status).toBe(200);
  expect(mocks.getUser).toHaveBeenCalledOnce();
});
