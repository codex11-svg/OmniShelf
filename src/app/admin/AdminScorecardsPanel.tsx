"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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

export function AdminScorecardsPanel({ scorecards }: { scorecards: Scorecard[] }) {
  const chartData = scorecards.map((s) => ({
    name: s.merchantName ?? "Unknown",
    type: s.merchantType,
    overall: parseFloat(String(s.overallScore)),
    fulfillment: parseFloat(String(s.fulfillmentScore)),
    accuracy: parseFloat(String(s.accuracyScore)),
    compliance: parseFloat(String(s.complianceScore)),
    response: parseFloat(String(s.responseScore)),
  }));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900">
        <b>🏆 Vendor performance scorecard.</b> Computed monthly from order fulfillment accuracy,
        stock freshness, compliance adherence, and response SLAs. Top vendors earn a &quot;Verified Gold&quot;
        badge on the marketplace.
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
          Overall scores by vendor
        </h3>
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} stroke="#64748b" fontSize={11} />
              <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} width={160} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="overall" name="Overall" radius={[0, 8, 8, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.type === "MEDICAL" ? "#e11d48" : "#3b82f6"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Detailed scorecards ({scorecards.length})
          </h3>
        </div>
        <div className="scrollbar max-h-[500px] overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-2">Rank</th>
                <th className="px-4 py-2">Vendor</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">City</th>
                <th className="px-4 py-2">Month</th>
                <th className="px-4 py-2 text-right">Fulfillment</th>
                <th className="px-4 py-2 text-right">Accuracy</th>
                <th className="px-4 py-2 text-right">Compliance</th>
                <th className="px-4 py-2 text-right">Response</th>
                <th className="px-4 py-2 text-right">Overall</th>
                <th className="px-4 py-2">Badge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {scorecards.map((s, idx) => {
                const overall = parseFloat(String(s.overallScore));
                const badge =
                  overall >= 95 ? "🥇 Gold" : overall >= 88 ? "🥈 Silver" : overall >= 80 ? "🥉 Bronze" : "⚪";
                return (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-bold text-slate-700">#{idx + 1}</td>
                    <td className="px-4 py-2 font-semibold text-slate-900">{s.merchantName}</td>
                    <td className="px-4 py-2">
                      <span className={`chip ${s.merchantType === "MEDICAL" ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"}`}>
                        {s.merchantType}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600">{s.merchantCity}</td>
                    <td className="px-4 py-2 font-mono text-slate-700">{s.month}</td>
                    <td className="px-4 py-2 text-right font-mono">{parseFloat(String(s.fulfillmentScore)).toFixed(1)}</td>
                    <td className="px-4 py-2 text-right font-mono">{parseFloat(String(s.accuracyScore)).toFixed(1)}</td>
                    <td className="px-4 py-2 text-right font-mono">{parseFloat(String(s.complianceScore)).toFixed(1)}</td>
                    <td className="px-4 py-2 text-right font-mono">{parseFloat(String(s.responseScore)).toFixed(1)}</td>
                    <td className="px-4 py-2 text-right font-mono font-bold text-slate-900">{overall.toFixed(1)}</td>
                    <td className="px-4 py-2">{badge}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
