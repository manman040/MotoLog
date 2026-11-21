import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  reset: vi.fn(),
  google: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  exitDemo: vi.fn(),
  checkGoogle: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mocks.replace,
    refresh: mocks.refresh,
    push: vi.fn(),
  }),
}));
vi.mock("@/lib/auth/config", () => ({
  authConfigured: true,
  authBackend: "supabase",
}));
vi.mock("@/lib/supabase/browser", () => ({
  supabaseBrowser: () => ({
    auth: {
      signInWithPassword: mocks.signIn,
      signUp: mocks.signUp,
      resetPasswordForEmail: mocks.reset,
      signInWithOAuth: mocks.google,
    },
  }),
}));
vi.mock("@/features/auth/provider", () => ({
  useAuth: () => ({ startDemo: vi.fn(), exitDemo: mocks.exitDemo, error: "" }),
}));
vi.mock("@/lib/supabase/google", () => ({
  ensureGoogleEnabled: mocks.checkGoogle,
}));
import Login from "@/app/(auth)/login/page";
beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, "", "/login");
});
function fill() {
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "owner@example.test" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "Password123!" },
  });
}
describe("Supabase authentication UI", () => {
  it("starts Google OAuth with the existing secure callback after the availability check", async () => {
    mocks.checkGoogle.mockResolvedValue(undefined);
    mocks.google.mockResolvedValue({ error: null });
    render(<Login />);
    fireEvent.click(
      screen.getByRole("button", { name: "Continue with Google" }),
    );
    await waitFor(() =>
      expect(mocks.google).toHaveBeenCalledWith({
        provider: "google",
        options: {
          redirectTo: expect.stringContaining("/auth/callback"),
          queryParams: { prompt: "select_account" },
        },
      }),
    );
    expect(mocks.replace).not.toHaveBeenCalled();
  });
  it("stays on the login page and explains when Google is disabled", async () => {
    mocks.checkGoogle.mockRejectedValue({ code: "google_provider_disabled" });
    render(<Login />);
    fireEvent.click(
      screen.getByRole("button", { name: "Continue with Google" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Google sign-in hasn’t been enabled",
    );
    expect(mocks.google).not.toHaveBeenCalled();
  });
  it("keeps unconfirmed signup on login with an inbox instruction", async () => {
    mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });
    render(<Login />);
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    fill();
    fireEvent.click(
      screen.getAllByRole("button", { name: "Create account" }).at(-1)!,
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Check your inbox",
    );
    expect(mocks.replace).not.toHaveBeenCalled();
  });
  it("signs in and refreshes server authentication state", async () => {
    mocks.signIn.mockResolvedValue({ data: {}, error: null });
    render(<Login />);
    fill();
    fireEvent.click(screen.getAllByRole("button", { name: "Sign in" }).at(-1)!);
    await waitFor(() =>
      expect(mocks.replace).toHaveBeenCalledWith("/dashboard"),
    );
    expect(mocks.exitDemo).toHaveBeenCalled();
    expect(mocks.refresh).toHaveBeenCalled();
  });
  it("shows friendly invalid credential errors", async () => {
    mocks.signIn.mockResolvedValue({ error: { code: "invalid_credentials" } });
    render(<Login />);
    fill();
    fireEvent.click(screen.getAllByRole("button", { name: "Sign in" }).at(-1)!);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email or password is incorrect",
    );
  });
  it("sends recovery to the PKCE callback and update-password page", async () => {
    mocks.reset.mockResolvedValue({ error: null });
    render(<Login />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "If an account exists",
    );
    expect(mocks.reset).toHaveBeenCalledWith(
      "owner@example.test",
      expect.objectContaining({
        redirectTo: expect.stringContaining(
          "/auth/callback?next=/update-password",
        ),
      }),
    );
  });
});
