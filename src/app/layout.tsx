import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { AuthProvider } from "@/features/auth/provider";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "MotoLog — Your garage, in sync.",
    template: "%s | MotoLog",
  },
  description:
    "Every vehicle. Every service. One place. Track your garage, maintenance, and expenses.",
  applicationName: "MotoLog",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MotoLog",
  },
  icons: { icon: "/icon.svg", apple: "/icons/icon-192.png" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#09090b",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en-MY"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
