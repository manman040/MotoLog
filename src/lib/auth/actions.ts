"use client";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { firebase } from "@/lib/firebase/client";
import { authBackend } from "./config";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { ensureGoogleEnabled } from "@/lib/supabase/google";
export async function signIn(email: string, password: string) {
  if (authBackend === "supabase") {
    const { error } = await supabaseBrowser().auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  } else await signInWithEmailAndPassword(firebase().auth, email, password);
}
export async function signUp(email: string, password: string) {
  if (authBackend === "supabase") {
    const { data, error } = await supabaseBrowser().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
    return Boolean(data.session);
  }
  const result = await createUserWithEmailAndPassword(
    firebase().auth,
    email,
    password,
  );
  await sendEmailVerification(result.user);
  return true;
}
export async function googleSignIn() {
  if (authBackend === "supabase") {
    await ensureGoogleEnabled();
    const { error } = await supabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
    return false;
  }
  await signInWithPopup(firebase().auth, new GoogleAuthProvider());
  return true;
}
export async function resetPassword(email: string) {
  if (authBackend === "supabase") {
    const { error } = await supabaseBrowser().auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
      },
    );
    if (error) throw error;
  } else await sendPasswordResetEmail(firebase().auth, email);
}
export async function resendVerification(email: string) {
  if (authBackend === "supabase") {
    const { error } = await supabaseBrowser().auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
  } else {
    const user = firebase().auth.currentUser;
    if (!user) throw new Error("Sign in again.");
    await sendEmailVerification(user);
  }
}
export async function loadDisplayName(uid: string) {
  if (authBackend === "supabase") {
    const { data, error } = await supabaseBrowser().auth.getUser();
    if (error) throw error;
    return String(data.user?.user_metadata.display_name || "");
  }
  const result = await getDoc(doc(firebase().db, `users/${uid}`));
  return result.data()?.displayName || "";
}
export async function saveDisplayName(
  uid: string,
  email: string | null,
  displayName: string,
) {
  if (authBackend === "supabase") {
    const { error } = await supabaseBrowser().auth.updateUser({
      data: { display_name: displayName },
    });
    if (error) throw error;
  } else
    await setDoc(
      doc(firebase().db, `users/${uid}`),
      {
        displayName,
        email,
        preferences: {
          currency: "MYR",
          distanceUnit: "km",
          locale: "en-MY",
          timeZone: "Asia/Kuala_Lumpur",
        },
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
}
export function authErrorMessage(error: unknown) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  if (code === "google_provider_disabled")
    return "Google sign-in hasn’t been enabled for MotoLog yet. Please use email/password while it is being configured.";
  if (["email_not_confirmed", "auth/unverified-email"].includes(code))
    return "Confirm your email using the link in your inbox, then sign in.";
  if (
    [
      "over_email_send_rate_limit",
      "over_request_rate_limit",
      "auth/too-many-requests",
    ].includes(code)
  )
    return "Too many attempts. Please wait a little and try again.";
  if (
    [
      "invalid_credentials",
      "auth/invalid-credential",
      "auth/wrong-password",
      "auth/user-not-found",
    ].includes(code)
  )
    return "Email or password is incorrect.";
  return "Unable to complete this request. Check your details and connection, then try again.";
}
