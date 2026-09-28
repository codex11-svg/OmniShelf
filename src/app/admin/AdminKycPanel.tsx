"use client";

import { useState } from "react";
import { approveKyc, rejectKyc } from "@/lib/actions";

type Merchant = {
  id: string;
  name: string;
  ownerName: string;
  type: "KIRANA" | "MEDICAL";
  address: string;
  city: string;
  pincode: string;
  phone: string;
  licenseNumber: string | null;
  licenseDocUrl: string | null;
  kycStatus: string;
  kycNotes: string | null;
  createdAt: Date;
  approvedAt: Date | null;
};

export function AdminKycPanel({ merchants }: { merchants: Merchant[] }) {
  const pending = merchants.filter((m) => m.kycStatus === "PENDING" || m.kycStatus === "UNDER_REVIEW");
  const approved = merchants.filter((m) => m.kycStatus === "APPROVED");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Pending queue */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Pending verification ({pending.length})
          </h3>
          <span className="chip bg-amber-100 text-amber-700">Action required</span>
        </div>
        <div className="space-y-3">
          {pending.length === 0 && (
            <div className="card p-6 text-center text-sm text-slate-500">
              🎉 No merchants pending review.
            </div>
          )}
          {pending.map((m) => (
            <KycCard key={m.id} merchant={m} />
          ))}
        </div>
      </div>

      {/* Approved directory */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Approved merchants ({approved.length})
          </h3>
          <span className="chip bg-emerald-100 text-emerald-700">Live</span>
        </div>
        <div className="space-y-2">
          {approved.map((m) => (
            <div key={m.id} className="card flex items-center justify-between p-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">{m.name}</span>
                  <span className={`chip ${m.type === "MEDICAL" ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"}`}>
                    {m.type}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  {m.ownerName} · {m.city} · {m.licenseNumber ?? "No license"}
                </div>
              </div>
              <span className="chip bg-emerald-50 text-emerald-700">APPROVED</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KycCard({ merchant }: { merchant: Merchant }) {
  const [notes, setNotes] = useState(merchant.kycNotes ?? "");
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);

  async function handleApprove() {
    setBusy("approve");
    await approveKyc(merchant.id, notes || undefined);
    setBusy(null);
  }
  async function handleReject() {
    if (!notes.trim()) {
      alert("Please add rejection notes.");
      return;
    }
    setBusy("reject");
    await rejectKyc(merchant.id, notes);
    setBusy(null);
  }

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">{merchant.name}</span>
            <span className={`chip ${merchant.type === "MEDICAL" ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"}`}>
              {merchant.type === "MEDICAL" ? "💊 Medical" : "🛒 Kirana"}
            </span>
            <span className={`chip ${merchant.kycStatus === "PENDING" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
              {merchant.kycStatus}
            </span>
          </div>
          <div className="mt-0.5 text-xs text-slate-600">
            Owner: <b>{merchant.ownerName}</b> · {merchant.address}, {merchant.city} {merchant.pincode}
          </div>
          <div className="mt-0.5 text-xs text-slate-600">
            📞 {merchant.phone} · License: <code className="rounded bg-slate-100 px-1">{merchant.licenseNumber ?? "—"}</code>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {merchant.licenseDocUrl && !merchant.licenseDocUrl.startsWith("/docs/") && (
            <button
              onClick={() => window.open(`/api/upload?key=${encodeURIComponent(merchant.licenseDocUrl!)}`, "_blank", "noopener,noreferrer")}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              📄 View license
            </button>
          )}
          {merchant.licenseDocUrl?.startsWith("/docs/") && (
            <span className="text-xs text-slate-500">Demo document reference</span>
          )}
        </div>
      </div>

      <div className="mt-3">
        <label className="text-xs font-semibold text-slate-700">Notes / checklist</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder={merchant.type === "MEDICAL" ? "Cross-check Pharmacy Council / Drug License…" : "Cross-check FSSAI / GST…"}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={handleApprove}
          disabled={busy !== null}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy === "approve" ? "Approving…" : "✓ Approve"}
        </button>
        <button
          onClick={handleReject}
          disabled={busy !== null}
          className="rounded-lg border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
        >
          {busy === "reject" ? "Rejecting…" : "✕ Reject"}
        </button>
        {merchant.type === "MEDICAL" && (
          <span className="chip bg-rose-50 text-rose-700">
            ⚠ Schedule H/X drugs will remain auto-blocked from B2C clearance
          </span>
        )}
      </div>
    </div>
  );
}
