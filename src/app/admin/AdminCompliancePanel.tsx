"use client";

import { useState } from "react";
import { toggleCompliance } from "@/lib/actions";

type SwitchRow = {
  id: string;
  merchantType: "KIRANA" | "MEDICAL";
  key: string;
  enabled: boolean;
  description: string | null;
};

export function AdminCompliancePanel({ switches }: { switches: SwitchRow[] }) {
  const kirana = switches.filter((s) => s.merchantType === "KIRANA");
  const medical = switches.filter((s) => s.merchantType === "MEDICAL");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SwitchGroup title="🛒 Kirana compliance" tone="blue" rows={kirana} />
      <SwitchGroup title="💊 Medical / Pharmacy compliance" tone="rose" rows={medical} />
    </div>
  );
}

function SwitchGroup({ title, tone, rows }: { title: string; tone: "blue" | "rose"; rows: SwitchRow[] }) {
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className={`chip ${tone === "blue" ? "bg-blue-100 text-blue-700" : "bg-rose-100 text-rose-700"}`}>
          {tone.toUpperCase()}
        </span>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">{title}</h3>
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <SwitchRow key={r.id} row={r} />
        ))}
      </div>
    </div>
  );
}

function SwitchRow({ row }: { row: SwitchRow }) {
  const [enabled, setEnabled] = useState(row.enabled);
  const [busy, setBusy] = useState(false);

  async function flip() {
    setBusy(true);
    const next = !enabled;
    setEnabled(next);
    await toggleCompliance(row.id, next);
    setBusy(false);
  }

  const prettyKey = row.key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
      <div>
        <div className="text-sm font-semibold text-slate-900">{prettyKey}</div>
        <div className="text-xs text-slate-600">{row.description}</div>
      </div>
      <button
        onClick={flip}
        disabled={busy}
        className={`relative h-6 w-11 flex-shrink-0 rounded-full transition ${enabled ? "bg-emerald-500" : "bg-slate-300"}`}
        aria-label={`Toggle ${row.key}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${enabled ? "left-5" : "left-0.5"}`}
        />
      </button>
    </div>
  );
}
