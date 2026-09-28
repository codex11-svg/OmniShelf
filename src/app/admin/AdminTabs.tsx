"use client";

import { useState } from "react";
import { AdminKycPanel } from "./AdminKycPanel";
import { AdminCompliancePanel } from "./AdminCompliancePanel";
import { AdminLedgerPanel } from "./AdminLedgerPanel";
import { AdminTickerPanel } from "./AdminTickerPanel";
import { AdminAuditPanel } from "./AdminAuditPanel";
import { AdminAnnouncementsPanel } from "./AdminAnnouncementsPanel";
import { AdminTicketsPanel } from "./AdminTicketsPanel";
import { AdminScorecardsPanel } from "./AdminScorecardsPanel";
import { AdminOnboardingPanel } from "./AdminOnboardingPanel";
import type { merchants } from "@/db/schema";

type Merchant = typeof merchants.$inferSelect;
type SwitchRow = {
  id: string;
  merchantType: "KIRANA" | "MEDICAL";
  key: string;
  enabled: boolean;
  description: string | null;
};
type LedgerRow = {
  id: string;
  merchantId: string;
  month: string;
  grossGmv: string | number;
  commissionPct: string | number;
  commissionAmount: string | number;
  saasTier: string;
  saasFee: string | number;
  merchantName: string | null;
  merchantType: "KIRANA" | "MEDICAL" | null;
  merchantCity: string | null;
};
type Ticker = {
  id: string;
  region: string;
  category: string;
  avgWholesale: string | number;
  trendPct: string | number;
  sampleSize: number;
};
type AuditEntry = {
  id: string;
  actorName: string;
  actorRole: string;
  merchantId: string | null;
  action: string;
  target: string | null;
  createdAt: Date;
};
type Announcement = {
  id: string;
  title: string;
  body: string;
  severity: string;
  audience: string;
  createdAt: Date;
};
type Ticket = {
  id: string;
  merchantName: string | null;
  requesterName: string;
  subject: string;
  body: string;
  priority: string;
  status: string;
  createdAt: Date;
};
type Scorecard = {
  id: string;
  month: string;
  fulfillmentScore: string | number;
  accuracyScore: string | number;
  complianceScore: string | number;
  responseScore: string | number;
  overallScore: string | number;
  merchantName: string | null;
  merchantType: string | null;
  merchantCity: string | null;
};

type Props = {
  merchants: Merchant[];
  switches: SwitchRow[];
  ledger: LedgerRow[];
  tickers: Ticker[];
  auditLogs: AuditEntry[];
  announcements: Announcement[];
  tickets: Ticket[];
  scorecards: Scorecard[];
};

const TABS = [
  { id: "kyc", label: "KYC & Verification", icon: "🪪" },
  { id: "compliance", label: "Compliance Switches", icon: "🛡️" },
  { id: "ledger", label: "Platform Ledger", icon: "📊" },
  { id: "tickers", label: "Regional Tickers", icon: "📡" },
  { id: "announcements", label: "Announcements", icon: "📣" },
  { id: "tickets", label: "Support Queue", icon: "🎫" },
  { id: "scorecards", label: "Vendor Scorecards", icon: "🏆" },
  { id: "audit", label: "Audit Log", icon: "📝" },
  { id: "onboarding", label: "Onboarding Wizard", icon: "🧭" },
] as const;

export function AdminTabs(props: Props) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("kyc");

  return (
    <div className="mt-8">
      <div className="mb-4 flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition md:text-sm ${
              tab === t.id ? "bg-slate-900 text-white shadow" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span>{t.icon}</span>
            <span className="hidden md:inline">{t.label}</span>
            <span className="md:hidden">{t.label.split(" ")[0]}</span>
          </button>
        ))}
      </div>

      <div>
        {tab === "kyc" && <AdminKycPanel merchants={props.merchants} />}
        {tab === "compliance" && <AdminCompliancePanel switches={props.switches} />}
        {tab === "ledger" && <AdminLedgerPanel ledger={props.ledger} />}
        {tab === "tickers" && <AdminTickerPanel tickers={props.tickers} />}
        {tab === "announcements" && <AdminAnnouncementsPanel announcements={props.announcements} />}
        {tab === "tickets" && <AdminTicketsPanel tickets={props.tickets} />}
        {tab === "scorecards" && <AdminScorecardsPanel scorecards={props.scorecards} />}
        {tab === "audit" && <AdminAuditPanel logs={props.auditLogs} />}
        {tab === "onboarding" && <AdminOnboardingPanel />}
      </div>
    </div>
  );
}
