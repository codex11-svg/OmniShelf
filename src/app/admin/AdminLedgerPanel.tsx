import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

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

export function AdminLedgerPanel({ ledger }: { ledger: LedgerRow[] }) {
  // Aggregate by month across all merchants
  const byMonth: Record<string, { month: string; gmv: number; commission: number; saas: number }> = {};
  for (const r of ledger) {
    const m = r.month;
    if (!byMonth[m]) byMonth[m] = { month: m, gmv: 0, commission: 0, saas: 0 };
    byMonth[m].gmv += parseFloat(String(r.grossGmv));
    byMonth[m].commission += parseFloat(String(r.commissionAmount));
    byMonth[m].saas += parseFloat(String(r.saasFee));
  }
  const monthlySeries = Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));

  // By SaaS tier
  const tierMap: Record<string, number> = {};
  for (const r of ledger) {
    tierMap[r.saasTier] = (tierMap[r.saasTier] ?? 0) + parseFloat(String(r.saasFee));
  }
  const tierSeries = Object.entries(tierMap).map(([name, value]) => ({ name, value }));
  const TIER_COLORS: Record<string, string> = { Starter: "#3b82f6", Growth: "#10b981", Enterprise: "#8b5cf6" };

  // Per-merchant GMV (most recent month)
  const latestMonth = monthlySeries.at(-1)?.month ?? "";
  const merchantLatest = ledger
    .filter((r) => r.month === latestMonth)
    .map((r) => ({
      name: r.merchantName ?? r.merchantId,
      type: r.merchantType,
      gmv: parseFloat(String(r.grossGmv)),
      commission: parseFloat(String(r.commissionAmount)),
    }));

  return (
    <div className="space-y-6">
      {/* Monthly GMV vs Commission */}
      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">GMV vs Commission earned</h3>
            <p className="text-xs text-slate-500">Platform-wide trend — last 5 months</p>
          </div>
          <span className="chip bg-indigo-100 text-indigo-700">Live ledger</span>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlySeries}>
              <defs>
                <linearGradient id="gGmv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gComm" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`}
                contentStyle={{ borderRadius: 10, fontSize: 12, border: "1px solid #e2e8f0" }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="gmv" name="GMV" stroke="#6366f1" strokeWidth={2} fill="url(#gGmv)" />
              <Area type="monotone" dataKey="commission" name="Commission" stroke="#10b981" strokeWidth={2} fill="url(#gComm)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tier mix */}
        <div className="card p-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">SaaS tier mix</h3>
          <p className="text-xs text-slate-500">Recurring subscription revenue by plan</p>
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={tierSeries} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {tierSeries.map((e) => (
                    <Cell key={e.name} fill={TIER_COLORS[e.name] ?? "#64748b"} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Per-merchant latest GMV */}
        <div className="card p-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Latest month — merchant GMV</h3>
          <p className="text-xs text-slate-500">{latestMonth || "—"}</p>
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={merchantLatest}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`} />
                <Bar dataKey="gmv" name="GMV" radius={[8, 8, 0, 0]}>
                  {merchantLatest.map((e, i) => (
                    <Cell key={i} fill={e.type === "MEDICAL" ? "#e11d48" : "#3b82f6"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Ledger table */}
      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Full commission ledger</h3>
        </div>
        <div className="scrollbar max-h-96 overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-2">Month</th>
                <th className="px-4 py-2">Merchant</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">City</th>
                <th className="px-4 py-2">SaaS tier</th>
                <th className="px-4 py-2 text-right">GMV</th>
                <th className="px-4 py-2 text-right">Rate</th>
                <th className="px-4 py-2 text-right">Commission</th>
                <th className="px-4 py-2 text-right">SaaS fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ledger.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono text-slate-700">{r.month}</td>
                  <td className="px-4 py-2 font-semibold text-slate-900">{r.merchantName ?? "—"}</td>
                  <td className="px-4 py-2">
                    <span className={`chip ${r.merchantType === "MEDICAL" ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"}`}>
                      {r.merchantType}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{r.merchantCity ?? "—"}</td>
                  <td className="px-4 py-2">
                    <span className="chip bg-slate-100 text-slate-700">{r.saasTier}</span>
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-slate-700">₹{parseFloat(String(r.grossGmv)).toLocaleString("en-IN")}</td>
                  <td className="px-4 py-2 text-right font-mono text-slate-500">{r.commissionPct}%</td>
                  <td className="px-4 py-2 text-right font-mono font-semibold text-emerald-700">₹{parseFloat(String(r.commissionAmount)).toLocaleString("en-IN")}</td>
                  <td className="px-4 py-2 text-right font-mono text-slate-700">₹{parseFloat(String(r.saasFee)).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
