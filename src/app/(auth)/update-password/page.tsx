"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { supabaseConfigured } from "@/lib/supabase/config";
const schema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters.").max(128),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"],
  });
export default function UpdatePassword() {
  const router = useRouter();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Choose a new password</h1>
        <p>Open the recovery link from your email before submitting.</p>
        <form
          onSubmit={handleSubmit(async (v) => {
            setError("");
            try {
              const client = supabaseBrowser();
              const { data, error: sessionError } = await client.auth.getUser();
              if (sessionError || !data.user)
                throw new Error(
                  "The recovery link is missing or expired. Request another password reset.",
                );
              const { error } = await client.auth.updateUser({
                password: v.password,
              });
              if (error)
                throw new Error(
                  "Unable to update your password. Try another password or request a new recovery link.",
                );
              const { error: logoutError } = await client.auth.signOut();
              if (logoutError)
                throw new Error(
                  "Password updated, but sign-out failed. Please sign out before continuing.",
                );
              router.replace("/login?passwordUpdated=1");
              router.refresh();
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Password update failed.",
              );
            }
          })}
        >
          <label>
            New password
            <input
              type="password"
              autoComplete="new-password"
              {...register("password")}
            />
            {errors.password && (
              <small className="field-error">{errors.password.message}</small>
            )}
          </label>
          <label>
            Confirm password
            <input
              type="password"
              autoComplete="new-password"
              {...register("confirm")}
            />
            {errors.confirm && (
              <small className="field-error">{errors.confirm.message}</small>
            )}
          </label>
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
          <Button disabled={isSubmitting || !supabaseConfigured} type="submit">
            {isSubmitting ? "Saving…" : "Update password"}
          </Button>
        </form>
        <Link className="text-button" href="/login">
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
