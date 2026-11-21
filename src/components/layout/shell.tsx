"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ChartNoAxesCombined,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  Fuel,
  Gauge,
  House,
  LayoutGrid,
  LogOut,
  Menu,
  Settings,
  Wallet,
  Wrench,
  X,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { useAuth } from "@/features/auth/provider";
const nav = [
  { href: "/dashboard", label: "Dashboard", mobile: "Home", icon: House },
  { href: "/garage", label: "My Garage", mobile: "Garage", icon: LayoutGrid },
  {
    href: "/maintenance",
    label: "Maintenance",
    mobile: "Maintenance",
    icon: Wrench,
  },
  { href: "/expenses", label: "Expenses", mobile: "Expenses", icon: Wallet },
  { href: "/fuel", label: "Fuel Tracker", icon: Fuel },
  {
    href: "/expenses#analytics",
    label: "Analytics",
    icon: ChartNoAxesCombined,
  },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];
const isCurrent = (path: string, href: string) =>
  path === href || path.startsWith(`${href}/`);

export function Shell({ children }: { children: ReactNode }) {
  const { user, demo, loading, logout } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [menu, setMenu] = useState(false);
  const moreButton = useRef<HTMLButtonElement>(null);
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
  const current = nav.find((n) => isCurrent(path, n.href));
  const name = demo
    ? "Demo explorer"
    : user?.displayName || user?.email?.split("@")[0] || "Your account";
  async function signOut() {
    try {
      await logout();
      router.replace("/login");
    } catch {
      setError("Sign out failed. Please try again.");
    }
  }
  const mobilePrimary = nav.filter((item) => item.mobile);
  const secondary = nav.filter((item) => !item.mobile);
  const hasSecondaryPage = secondary.some((item) => isCurrent(path, item.href));
  return (
    <div className={`app-shell${collapsed ? " collapsed" : ""}`}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
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
        </Link>
        <nav aria-label="Main navigation">
          {nav.map((n) => (
            <Link
              key={n.href}
              className={`nav-link ${isCurrent(path, n.href) ? "active" : ""}`}
              href={n.href}
              aria-label={n.label}
              aria-current={isCurrent(path, n.href) ? "page" : undefined}
            >
              <n.icon />
              <span>{n.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
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
              onClick={() => void signOut()}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
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
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {mobilePrimary.map((n) => (
          <Link
            key={n.href}
            className={isCurrent(path, n.href) ? "active" : ""}
            href={n.href}
            aria-current={isCurrent(path, n.href) ? "page" : undefined}
          >
            <n.icon />
            {n.mobile}
          </Link>
        ))}
        <button
          ref={moreButton}
          onClick={() => setMenu(true)}
          className={hasSecondaryPage ? "active" : undefined}
          aria-haspopup="dialog"
          aria-expanded={menu}
        >
          <Menu />
          More
        </button>
      </nav>
      <Dialog
        open={menu}
        onOpenChange={setMenu}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          moreButton.current?.focus();
        }}
        title="More"
        description="Open a MotoLog section or sign out."
      >
        <nav className="more-links" aria-label="More navigation">
          {secondary.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenu(false)}
              className={`nav-link${isCurrent(path, item.href) ? " active" : ""}`}
              aria-current={isCurrent(path, item.href) ? "page" : undefined}
            >
              <item.icon />
              {item.label}
            </Link>
          ))}
          <button className="nav-link" onClick={() => void signOut()}>
            <LogOut />
            Sign out
          </button>
        </nav>
        {error && <p role="alert" className="field-error">{error}</p>}
      </Dialog>
      {error && !menu && (
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
