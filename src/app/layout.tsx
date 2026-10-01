import type { Metadata } from "next";
import "./globals.css";
import { TopNav } from "@/components/TopNav";

export const metadata: Metadata = {
  title: "OmniShelf — Store management, made simple",
  description:
    "Manage your neighborhood grocery or pharmacy with one simple, mobile-ready store platform.",
  applicationName: "OmniShelf",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "OmniShelf",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  themeColor: "#14532d",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <TopNav />
        <main className="pb-16">{children}</main>
        <footer className="border-t border-slate-200 bg-white/70 py-6 text-center text-xs text-slate-500">
          © 2026 OmniShelf · Built with Next.js, Drizzle ORM, PostgreSQL
        </footer>
      </body>
    </html>
  );
}
