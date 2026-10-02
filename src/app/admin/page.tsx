import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  listAllMerchants,
  listComplianceSwitches,
  listPlatformLedger,
  listRegionalTickers,
  listAdminAuditLogs,
  listAnnouncements,
  listAllTickets,
  listAllScorecards,
} from "@/lib/actions";
import { AdminKycPanel } from "./AdminKycPanel";
import { AdminCompliancePanel } from "./AdminCompliancePanel";
import { AdminLedgerPanel } from "./AdminLedgerPanel";
import { AdminTickerPanel } from "./AdminTickerPanel";
import { AdminTabs } from "./AdminTabs";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect(session.role === "VENDOR_OWNER" || session.role === "VENDOR_CLERK" ? "/vendor" : "/login");

  const [merchants, switches, ledger, tickers, auditLogs, announcements, tickets, scorecards] = await Promise.all([
    listAllMerchants(),
    listComplianceSwitches(),
    listPlatformLedger(),
    listRegionalTickers(),
    listAdminAuditLogs(),
    listAnnouncements(),
    listAllTickets(),
    listAllScorecards(),
  ]);

  const stats = {
    approved: merchants.filter((m) => m.kycStatus === "APPROVED").length,
    pending: merchants.filter((m) => m.kycStatus === "PENDING").length,
    review: merchants.filter((m) => m.kycStatus === "UNDER_REVIEW").length,
    rejected: merchants.filter((m) => m.kycStatus === "REJECTED").length,
    kirana: merchants.filter((m) => m.type === "KIRANA").length,
    medical: merchants.filter((m) => m.type === "MEDICAL").length,
  };

  const totalCommission = ledger.reduce((acc, r) => acc + parseFloat(String(r.commissionAmount ?? 0)), 0);
  const totalGmv = ledger.reduce((acc, r) => acc + parseFloat(String(r.grossGmv ?? 0)), 0);

  return (
    <div className="dashboard-enter mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="mb-1 text-xs font-semibold uppercase text-emerald-800">
            Platform administration
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Admin console</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Review merchants, govern compliance, and monitor platform activity.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatChip label="Approved" value={stats.approved} tone="emerald" />
          <StatChip label="Pending" value={stats.pending} tone="amber" />
          <StatChip label="In review" value={stats.review} tone="blue" />
          <StatChip label="Rejected" value={stats.rejected} tone="rose" />
        </div>
      </div>

      {/* Platform health strip */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total GMV (5 mo)" value={`₹${formatINR(totalGmv)}`} hint="Gross merchandise value" tone="indigo" />
        <MetricCard label="Commission earned" value={`₹${formatINR(totalCommission)}`} hint="Platform take-rate revenue" tone="emerald" />
        <MetricCard label="Kirana onboard" value={stats.kirana} hint="Active kirana merchants" tone="blue" />
        <MetricCard label="Medical onboard" value={stats.medical} hint="Pharmacy-licensed merchants" tone="rose" />
      </div>

      <AdminTabs
        merchants={merchants}
        switches={switches}
        ledger={ledger}
        tickers={tickers}
        auditLogs={auditLogs}
        announcements={announcements}
        tickets={tickets}
        scorecards={scorecards}
      />
    </div>
  );
}

function StatChip({ label, value, tone }: { label: string; value: number; tone: "emerald" | "amber" | "blue" | "rose" }) {
  const map = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
  } as const;
  return (
    <div className={`flex items-center gap-2 rounded-md border px-3 py-1.5 ${map[tone]}`}>
      <span className="text-xs font-medium">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function MetricCard({ label, value, hint, tone }: { label: string; value: string | number; hint: string; tone: "indigo" | "emerald" | "blue" | "rose" }) {
  const tones = {
    indigo: "border-t-slate-400",
    emerald: "border-t-emerald-700",
    blue: "border-t-blue-700",
    rose: "border-t-[#b45e42]",
  } as const;
  return (
    <div className={`card border-t-2 p-4 ${tones[tone]}`}>
      <div className="text-xs font-medium text-slate-600">{label}</div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{hint}</div>
    </div>
  );
}

function formatINR(n: number) {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}
