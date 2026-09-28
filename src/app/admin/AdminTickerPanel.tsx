"use client";

import { TrendingDown, TrendingUp } from "lucide-react";

type Ticker = {
  id: string;
  region: string;
  category: string;
  avgWholesale: string | number;
  trendPct: string | number;
  sampleSize: number;
};

export function AdminTickerPanel({ tickers }: { tickers: Ticker[] }) {
  const byRegion = tickers.reduce<Record<string, Ticker[]>>((acc, t) => {
    (acc[t.region] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 text-sm text-indigo-900">
        <b>Anonymized</b> wholesale signals aggregated across verified stores. Individual merchant
        identities are not exposed — only city × category signals with sample size disclosures.
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(byRegion).map(([region, rows]) => (
          <div key={region} className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                📍 {region}
              </h3>
              <span className="chip bg-slate-100 text-slate-700">
                {rows.reduce((a, r) => a + r.sampleSize, 0)} samples
              </span>
            </div>
            <div className="space-y-2">
              {rows.map((r) => {
                const trend = parseFloat(String(r.trendPct));
                const up = trend >= 0;
                return (
                  <div key={r.id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-semibold text-slate-600">{r.category}</div>
                      <div className={`flex items-center gap-0.5 text-xs font-bold ${up ? "text-emerald-600" : "text-rose-600"}`}>
                        {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {up ? "+" : ""}
                        {trend.toFixed(1)}%
                      </div>
                    </div>
                    <div className="mt-1 flex items-end justify-between">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-500">Avg wholesale</div>
                        <div className="text-lg font-black text-slate-900">₹{parseFloat(String(r.avgWholesale)).toFixed(0)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-wider text-slate-500">Sample</div>
                        <div className="text-sm font-semibold text-slate-700">{r.sampleSize}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
