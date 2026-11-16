import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  signOut,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
} from "firebase/auth";
import { it, expect } from "vitest";
it("registers, verifies request, resets password, signs out and signs in with Auth emulator", async () => {
  const app = initializeApp(
    { apiKey: "demo-key", projectId: "demo-motolog" },
    `auth-${Date.now()}`,
  );
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  try {
    const email = `motolog-${Date.now()}@example.test`;
    const result = await createUserWithEmailAndPassword(
      auth,
      email,
      "TestPassword123!",
    );
    expect(result.user.uid).toBeTruthy();
    await sendEmailVerification(result.user);
    await sendPasswordResetEmail(auth, email);
    await signOut(auth);
    expect(auth.currentUser).toBeNull();
    const signedIn = await signInWithEmailAndPassword(
      auth,
      email,
      "TestPassword123!",
    );
    expect(signedIn.user.email).toBe(email);
  } finally {
    await signOut(auth);
    await deleteApp(app);
  }
});
