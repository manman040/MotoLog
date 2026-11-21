"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Gauge, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authConfigured } from "@/lib/auth/config";
import {
  signIn,
  signUp,
  googleSignIn,
  resetPassword,
  authErrorMessage,
} from "@/lib/auth/actions";
import { safeNext } from "@/lib/auth/redirect";
import { callbackMessage } from "@/lib/auth/callback-errors";
import { useAuth } from "@/features/auth/provider";
const schema = z.object({
  email: z.email("Enter a valid email address.").max(254),
  password: z.string().min(8, "Use at least 8 characters.").max(128),
});
export default function Login() {
  const router = useRouter();
  const { startDemo, exitDemo, error: sessionError } = useAuth();
  const [register, setRegister] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const pending = useRef(false);
  useEffect(() => {
    function restore(event: PageTransitionEvent) {
      if (!event.persisted) return;
      pending.current = false;
      setBusy(false);
      setGoogleBusy(false);
    }
    window.addEventListener("pageshow", restore);
    const query = new URLSearchParams(window.location.search);
    void Promise.resolve().then(() => {
      if (query.has("authError"))
        setError(callbackMessage(query.get("authError") || ""));
      if (query.get("passwordUpdated") === "1")
        setMessage("Password updated. Sign in with your new password.");
    });
    return () => window.removeEventListener("pageshow", restore);
  }, []);
  const {
    register: field,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  async function action(fn: () => Promise<unknown>, google = false) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setGoogleBusy(google);
    setError("");
    try {
      if ((await fn()) === "redirecting") return;
    } catch (error) {
      setError(authErrorMessage(error));
    }
    pending.current = false;
    setBusy(false);
    setGoogleBusy(false);
  }
  return (
    <main className="auth-page">
      <div className="auth-brand">
        <Gauge />
        <b>
          Moto<span>Log</span>
        </b>
      </div>
      <section className="auth-card">
        <span className="eyebrow">Your Vehicle, Simplified.</span>
        <h1>
          Take care of the ride.
          <br />
          <span>We’ll keep the records.</span>
        </h1>
        <p>Every vehicle. Every service. One place.</p>
        <div className="auth-tabs">
          <button onClick={() => setRegister(false)} aria-pressed={!register}>
            Sign in
          </button>
          <button onClick={() => setRegister(true)} aria-pressed={register}>
            Create account
          </button>
        </div>
        {!authConfigured && (
          <div className="notice">
            Authentication isn’t connected yet. Explore the clearly labelled
            local demo below.
          </div>
        )}
        <form
          onSubmit={(event) =>
            void handleSubmit((v) =>
              action(async () => {
                exitDemo();
                if (register) {
                  const signedIn = await signUp(v.email, v.password);
                  if (!signedIn) {
                    setMessage(
                      "Check your inbox to confirm your email, then sign in.",
                    );
                    return;
                  }
                } else await signIn(v.email, v.password);
                router.replace(
                  safeNext(
                    new URLSearchParams(window.location.search).get("next"),
                  ),
                );
                router.refresh();
              }),
            )(event)
          }
        >
          <label>
            Email address
            <input type="email" autoComplete="email" {...field("email")} />
            {errors.email && (
              <small className="field-error">{errors.email.message}</small>
            )}
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete={register ? "new-password" : "current-password"}
              {...field("password")}
            />
            {errors.password && (
              <small className="field-error">{errors.password.message}</small>
            )}
          </label>
          {(error || sessionError) && (
            <p role="alert" className="field-error">
              {error || sessionError}
            </p>
          )}
          {message && <p role="status">{message}</p>}
          <Button disabled={busy || !authConfigured} type="submit">
            {busy ? "Please wait…" : register ? "Create account" : "Sign in"}
            <ArrowRight size={16} />
          </Button>
        </form>
        <Button
          variant="outline"
          disabled={busy || !authConfigured}
          onClick={() =>
            action(async () => {
              exitDemo();
              if (await googleSignIn()) {
                router.replace("/dashboard");
                router.refresh();
              } else {
                return "redirecting";
              }
            }, true)
          }
        >
          {googleBusy ? "Opening Google…" : "Continue with Google"}
        </Button>
        <button
          className="text-button"
          disabled={busy || !authConfigured}
          onClick={() =>
            action(async () => {
              const email = z.email().parse(getValues("email"));
              await resetPassword(email);
              setMessage("If an account exists, a reset link has been sent.");
            })
          }
        >
          Forgot password?
        </button>
        <div className="auth-divider">or take a look around</div>
        <Button
          variant="outline"
          onClick={() => {
            startDemo();
            router.push("/dashboard");
          }}
        >
          Explore sample garage <ArrowRight size={16} />
        </Button>
        <small>
          <ShieldCheck size={14} /> Private by design. Your records belong to
          you.
        </small>
      </section>
      <footer>
        MOTOLOG <span>BUILT FOR EVERY JOURNEY</span>
      </footer>
    </main>
  );
}
