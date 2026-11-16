"use client";
import { useEffect, useState } from "react";
import { Download, RotateCcw, ShieldCheck } from "lucide-react";
import { useAuth } from "@/features/auth/provider";
import { useData } from "@/features/vehicles/data-provider";
import {
  loadDisplayName,
  saveDisplayName,
  resendVerification,
} from "@/lib/auth/actions";
import { resetDemo } from "@/lib/demo/repository";
import { PageHeading } from "@/components/shared/common";
import { Button } from "@/components/ui/button";
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export default function Settings() {
  const { user, demo, logout } = useAuth();
  const { refresh } = useData();
  const [message, setMessage] = useState("");
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    if (user)
      loadDisplayName(user.uid)
        .then(setDisplayName)
        .catch(() => setMessage("Account preferences could not be loaded."));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [user]);
  return (
    <>
      <PageHeading
        eyebrow="MAKE YOURSELF AT HOME"
        title="Settings"
        description="Your account, your preferences, your garage."
      />
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      <section className="card settings-card">
        <h2>Personal workspace</h2>
        <p>
          {demo
            ? "You are exploring sample records stored only in this browser."
            : user?.email}
        </p>
        <label>
          Display name
          <input
            value={displayName}
            maxLength={80}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={demo}
          />
        </label>
        <Button
          disabled={demo || busy}
          onClick={async () => {
            if (!user) return;
            setBusy(true);
            try {
              await saveDisplayName(user.uid, user.email, displayName.trim());
              setMessage("Preferences saved.");
            } catch {
              setMessage("Could not save preferences. Please try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Save profile
        </Button>
        <div className="settings-row" style={{ marginTop: 20 }}>
          <div>
            <strong>Email verification</strong>
            <span>
              {demo
                ? "Not applicable to demo"
                : user?.emailVerified
                  ? "Verified"
                  : "Verification required"}
            </span>
          </div>
          {user && !user.emailVerified && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await resendVerification(user.email || "");
                  setMessage(
                    "Verification email sent. Follow the link, then sign in again.",
                  );
                } catch {
                  setMessage(
                    "Could not send verification email. Try again shortly.",
                  );
                }
              }}
            >
              Send email
            </Button>
          )}
        </div>
        <div className="settings-row">
          <div>
            <strong>Session</strong>
            <span>Sign out of this device</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                await logout();
              } catch {
                setMessage("Unable to sign out. Please try again.");
              }
            }}
          >
            Sign out
          </Button>
        </div>
      </section>
      <section className="card settings-card">
        <h2>Regional preferences</h2>
        <p>
          Malaysian defaults. Data uses ISO dates, integer sen, and kilometres
          so more locales can be added safely.
        </p>
        {[
          ["Currency", "MYR · Malaysian Ringgit (RM)"],
          ["Distance", "Kilometres (km)"],
          ["Date format", "DD/MM/YYYY"],
          ["Time zone", "Asia/Kuala_Lumpur"],
        ].map(([label, value]) => (
          <div className="settings-row" key={label}>
            <strong>{label}</strong>
            <span>{value}</span>
          </div>
        ))}
      </section>
      <section className="card settings-card">
        <h2>Install MotoLog</h2>
        <p>
          Add your garage to your home screen for quick access. An internet
          connection is required for account records and writes.
        </p>
        <Button
          variant="outline"
          disabled={!install}
          onClick={async () => {
            if (install) {
              await install.prompt();
              await install.userChoice;
              setInstall(null);
            }
          }}
        >
          <Download size={15} />
          Install app
        </Button>
        {!install && (
          <p style={{ marginTop: 12, fontSize: 11 }}>
            When supported, use your browser’s install menu. On Safari, choose
            Share → Add to Home Screen.
          </p>
        )}
      </section>
      {demo && (
        <section className="card settings-card">
          <h2>Demo workspace</h2>
          <p>
            Sample WMoto Griffin, Honda RS150 and Proton S70 vehicles are
            illustrative. They are not vehicles registered to you. Demo data
            never becomes real account data.
          </p>
          <Button
            variant="destructive"
            onClick={async () => {
              if (
                window.confirm(
                  "Reset all local demo changes and restore sample data?",
                )
              ) {
                resetDemo();
                await refresh();
                setMessage("Demo data restored.");
              }
            }}
          >
            <RotateCcw size={14} />
            Reset sample garage
          </Button>
        </section>
      )}
      <div className="notice" style={{ maxWidth: 760 }}>
        <ShieldCheck size={14} style={{ display: "inline", marginRight: 8 }} />
        Single-owner MVP. Shared family access and background push notifications
        are not implemented.
      </div>
    </>
  );
}
