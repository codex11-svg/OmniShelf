"use client";

import { useState } from "react";
import {
  Activity, BarChart3, ClipboardCheck, Megaphone, Radio, Shield, Ticket, UserPlus, WalletCards,
} from "lucide-react";
import { WorkspaceTabs } from "@/components/WorkspaceTabs";
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
  { id: "kyc", label: "KYC & verification", icon: ClipboardCheck },
  { id: "compliance", label: "Compliance", icon: Shield },
  { id: "ledger", label: "Platform ledger", icon: WalletCards },
  { id: "tickers", label: "Regional signals", icon: Radio },
  { id: "announcements", label: "Announcements", icon: Megaphone },
  { id: "tickets", label: "Support queue", icon: Ticket },
  { id: "scorecards", label: "Vendor scorecards", icon: BarChart3 },
  { id: "audit", label: "Audit log", icon: Activity },
  { id: "onboarding", label: "Add merchant", icon: UserPlus },
] as const;

export function AdminTabs(props: Props) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("kyc");

  return (
    <div className="mt-8">
      <WorkspaceTabs value={tab} onValueChange={setTab} ariaLabel="Admin console sections" tabs={TABS}>
        {tab === "kyc" && <AdminKycPanel merchants={props.merchants} />}
        {tab === "compliance" && <AdminCompliancePanel switches={props.switches} />}
        {tab === "ledger" && <AdminLedgerPanel ledger={props.ledger} />}
        {tab === "tickers" && <AdminTickerPanel tickers={props.tickers} />}
        {tab === "announcements" && <AdminAnnouncementsPanel announcements={props.announcements} />}
        {tab === "tickets" && <AdminTicketsPanel tickets={props.tickets} />}
        {tab === "scorecards" && <AdminScorecardsPanel scorecards={props.scorecards} />}
        {tab === "audit" && <AdminAuditPanel logs={props.auditLogs} />}
        {tab === "onboarding" && <AdminOnboardingPanel />}
      </WorkspaceTabs>
    </div>
  );
}
