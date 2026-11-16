"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { firebase } from "@/lib/firebase/client";
import { authBackend, authConfigured } from "@/lib/auth/config";
import { supabaseBrowser } from "@/lib/supabase/browser";
import type { User as SupabaseUser } from "@supabase/supabase-js";
export type AccountUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  backend: "supabase" | "firebase";
};
type Session = {
  user: AccountUser | null;
  demo: boolean;
  loading: boolean;
  error: string;
  startDemo: () => void;
  exitDemo: () => void;
  logout: () => Promise<void>;
};
const Context = createContext<Session | null>(null);
const fromSupabase = (u: SupabaseUser): AccountUser => ({
  uid: u.id,
  email: u.email || null,
  displayName:
    String(u.user_metadata.display_name || u.user_metadata.full_name || "") ||
    null,
  emailVerified: Boolean(u.email_confirmed_at),
  backend: "supabase",
});
function demoCookie(enabled: boolean) {
  document.cookie = `motolog-demo=${enabled ? "1" : ""}; Path=/; SameSite=Lax${enabled ? "" : "; Max-Age=0"}${location.protocol === "https:" ? "; Secure" : ""}`;
}
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    void Promise.resolve().then(async () => {
      if (!active) return;
      setDemo(sessionStorage.getItem("motolog-demo") === "true");
      if (!authConfigured) {
        setLoading(false);
        return;
      }
      try {
        if (authBackend === "supabase") {
          const client = supabaseBrowser();
          let authRevision = 0;
          const {
            data: { subscription },
          } = client.auth.onAuthStateChange((_event, session) => {
            if (active) {
              authRevision++;
              setError("");
              setUser(session?.user ? fromSupabase(session.user) : null);
              setLoading(false);
            }
          });
          unsubscribe = () => subscription.unsubscribe();
          const revision = authRevision;
          const { data, error } = await client.auth.getUser();
          if (active && revision === authRevision) {
            if (error && error.name !== "AuthSessionMissingError")
              setError(
                "Your session could not be verified. Please sign in again.",
              );
            setUser(data.user ? fromSupabase(data.user) : null);
            setLoading(false);
          }
        } else {
          unsubscribe = onAuthStateChanged(
            firebase().auth,
            (u) => {
              if (active) {
                setUser(
                  u
                    ? {
                        uid: u.uid,
                        email: u.email,
                        displayName: u.displayName,
                        emailVerified: u.emailVerified,
                        backend: "firebase",
                      }
                    : null,
                );
                setLoading(false);
              }
            },
            () => {
              if (active) {
                setError(
                  "Unable to verify your session. Please sign in again.",
                );
                setLoading(false);
              }
            },
          );
        }
      } catch {
        if (active) {
          setError(
            "Authentication is unavailable. Check the connection and configuration.",
          );
          setLoading(false);
        }
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
  const exitDemo = () => {
    sessionStorage.removeItem("motolog-demo");
    demoCookie(false);
    setDemo(false);
  };
  return (
    <Context.Provider
      value={{
        user,
        demo,
        loading,
        error,
        exitDemo,
        startDemo: () => {
          sessionStorage.setItem("motolog-demo", "true");
          demoCookie(true);
          setDemo(true);
        },
        logout: async () => {
          if (authBackend === "supabase" && authConfigured) {
            const { error } = await supabaseBrowser().auth.signOut();
            if (error) throw error;
          } else if (user) await signOut(firebase().auth);
          exitDemo();
          setUser(null);
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("AuthProvider missing");
  return value;
}
