import type { Metadata } from "next";
import "./globals.css";
import { TopNav } from "@/components/TopNav";

export const metadata: Metadata = {
  title: "OmniShelf AI — Multi-Tenant Kirana & Pharmacy OS",
  description:
    "Unified platform for Kirana and Medical shopkeepers: RBAC inventory, predictive procurement, compliance-driven clearance marketplace, and platform-owner admin controls.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <TopNav />
        <main className="pb-16">{children}</main>
        <footer className="border-t border-slate-200 bg-white/70 py-6 text-center text-xs text-slate-500">
          © 2026 OmniShelf AI · Built with Next.js, Drizzle ORM, PostgreSQL · Multi-tenant B2B2C
        </footer>
      </body>
    </html>
  );
}
