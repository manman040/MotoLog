"use client";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  Gauge,
  House,
  LayoutGrid,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Wallet,
  Wrench,
  X,
} from "lucide-react";
import { useAuth } from "@/features/auth/provider";
const nav = [
  { href: "/dashboard", label: "Dashboard", icon: House },
  { href: "/garage", label: "My Garage", icon: LayoutGrid },
  { href: "/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/expenses", label: "Expenses", icon: Wallet },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];
export function Shell({ children }: { children: ReactNode }) {
  const { user, demo, loading, logout } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [menu, setMenu] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!loading && !user && !demo) router.replace("/login");
  }, [loading, user, demo, router]);
  useEffect(() => {
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* App remains usable without installation. */
      });
  }, []);
  if (loading || (!user && !demo))
    return (
      <main className="loading" aria-label="Loading account">
        <div className="skeleton" />
        <div className="skeleton" />
      </main>
    );
  const current = nav.find((n) => path.startsWith(n.href));
  const name = demo
    ? "Demo explorer"
    : user?.displayName || user?.email?.split("@")[0] || "Your account";
  return (
    <div
      className={`app-shell ${collapsed ? "collapsed" : ""} ${menu ? "menu-open" : ""}`}
    >
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <button
        className="mobile-backdrop"
        onClick={() => setMenu(false)}
        aria-label="Close navigation"
      />
      <aside className="sidebar">
        <Link
          href="/dashboard"
          className="brand"
          aria-label="MotoLog dashboard"
        >
          <Gauge size={28} />
          <span>
            Moto<span>Log</span>
          </span>
          <small>BETA</small>
        </Link>
        <div className="nav-caption">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {nav.map((n) => (
            <Link
              key={n.href}
              className={`nav-link ${path.startsWith(n.href) ? "active" : ""}`}
              href={n.href}
              onClick={() => setMenu(false)}
              aria-current={path.startsWith(n.href) ? "page" : undefined}
            >
              <n.icon />
              <span>{n.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="garage-note">
            <ShieldCheck size={21} />
            <strong>A little care. A longer journey.</strong>
            <p>Keep your vehicles ready for whatever comes next.</p>
          </div>
          <button
            className="nav-link desktop-collapse"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronsRight /> : <ChevronsLeft />}
            <span>Collapse sidebar</span>
          </button>
          <div className="sidebar-user">
            <div className="avatar">
              {demo ? "DE" : name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <strong>{name}</strong>
              <small>
                {demo ? "Local sample garage" : "Personal workspace"}
              </small>
            </div>
            <button
              className="text-button"
              aria-label="Sign out"
              onClick={async () => {
                try {
                  await logout();
                  router.replace("/login");
                } catch {
                  setError("Sign out failed. Please try again.");
                }
              }}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu-btn"
              aria-label="Open navigation"
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X size={18} /> : <Menu size={18} />}
            </button>
            <House size={13} />
            <span className="crumb-parent">Workspace</span>
            <ChevronRight size={12} />
            <span>{current?.label || "My Garage"}</span>
          </div>
          <div className="topbar-right">
            <span className="topbar-date">
              {new Intl.DateTimeFormat("en-MY", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
                timeZone: "Asia/Kuala_Lumpur",
              }).format(new Date())}
            </span>
            <Link
              href="/reminders"
              className="icon-button"
              aria-label="View reminders"
            >
              <Bell size={16} />
              <span className="dot" />
            </Link>
            <Link
              href="/settings"
              className="avatar"
              aria-label="Account settings"
            >
              {demo ? "DE" : name.slice(0, 2).toUpperCase()}
            </Link>
          </div>
        </header>
        <main id="main" className="page-content">
          {demo && (
            <div className="demo-banner">
              <span>
                <strong>DEMO WORKSPACE</strong> · Sample vehicles. Changes stay
                in this browser only.
              </span>
              <Link href="/settings">
                Manage demo{" "}
                <ChevronRight size={10} style={{ display: "inline" }} />
              </Link>
            </div>
          )}
          {children}
          <footer className="bottom-note">
            <span>
              <ShieldCheck size={11} />
              {demo
                ? "Browser-local sample data"
                : "Your garage. Your data. Securely stored."}
            </span>
            <span>MotoLog · Every vehicle. Every service. One place.</span>
          </footer>
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {nav.slice(0, 4).map((n) => (
          <Link
            key={n.href}
            className={path.startsWith(n.href) ? "active" : ""}
            href={n.href}
          >
            <n.icon />
            {n.label === "My Garage" ? "Garage" : n.label}
          </Link>
        ))}
        <button
          onClick={() => setMenu(true)}
          aria-label="More navigation options"
        >
          <Menu />
          More
        </button>
      </nav>
      {error && (
        <div role="alert" className="toast error">
          {error}
          <button onClick={() => setError("")} aria-label="Dismiss error">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
