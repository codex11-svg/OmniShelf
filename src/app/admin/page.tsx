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
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-rose-700">
            👑 Platform Owner Console
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Admin dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">
            KYC approvals · Compliance switches · Commission ledger · Anonymized regional tickers
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatChip label="Approved" value={stats.approved} tone="emerald" />
          <StatChip label="Pending" value={stats.pending} tone="amber" />
          <StatChip label="In review" value={stats.review} tone="blue" />
          <StatChip label="Rejected" value={stats.rejected} tone="rose" />
        </div>
      </div>

      {/* Platform health strip */}
      <div className="grid gap-4 md:grid-cols-4">
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
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    rose: "bg-rose-50 text-rose-700",
  } as const;
  return (
    <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 ${map[tone]}`}>
      <span className="text-xs font-semibold uppercase tracking-wider opacity-80">{label}</span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}

function MetricCard({ label, value, hint, tone }: { label: string; value: string | number; hint: string; tone: "indigo" | "emerald" | "blue" | "rose" }) {
  const gradients = {
    indigo: "from-indigo-500 to-violet-600",
    emerald: "from-emerald-500 to-teal-600",
    blue: "from-blue-500 to-cyan-500",
    rose: "from-rose-500 to-pink-600",
  } as const;
  return (
    <div className="card p-5">
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${gradients[tone]} text-white shadow`}>
        <span className="text-sm font-bold">₹</span>
      </div>
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-black text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{hint}</div>
    </div>
  );
}

function formatINR(n: number) {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}
