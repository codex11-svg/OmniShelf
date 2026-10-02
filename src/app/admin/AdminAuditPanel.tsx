"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { formatDateTime } from "@/lib/formatDate";

type AuditEntry = {
  id: string;
  actorName: string;
  actorRole: string;
  merchantId: string | null;
  action: string;
  target: string | null;
  createdAt: Date;
};

const ACTION_STYLES: Record<string, string> = {
  APPROVE_KYC: "bg-emerald-100 text-emerald-700",
  REJECT_KYC: "bg-rose-100 text-rose-700",
  TOGGLE_COMPLIANCE: "bg-indigo-100 text-indigo-700",
  STOCK_ADJUST: "bg-blue-100 text-blue-700",
  CLEARANCE_PUSH: "bg-amber-100 text-amber-700",
  SCAN_BARCODE: "bg-slate-100 text-slate-700",
  LOGIN: "bg-violet-100 text-violet-700",
  CREATE_PO: "bg-teal-100 text-teal-700",
  CREATE_ANNOUNCEMENT: "bg-pink-100 text-pink-700",
};

const ROLE_BADGE: Record<string, string> = {
  ADMIN: "bg-rose-100 text-rose-700",
  VENDOR_OWNER: "bg-emerald-100 text-emerald-700",
  VENDOR_CLERK: "bg-blue-100 text-blue-700",
};

export function AdminAuditPanel({ logs }: { logs: AuditEntry[] }) {
  const [query, setQuery] = useState("");
  const filteredLogs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return logs;
    return logs.filter((log) => [
      log.actorName,
      log.actorRole,
      log.action,
      log.target ?? "",
      log.merchantId ?? "",
    ].some((value) => value.toLowerCase().includes(normalizedQuery)));
  }, [logs, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Platform audit trail</h3>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-600">
            KYC decisions, compliance changes, stock mutations, and sign-ins with actor attribution.
          </p>
        </div>
        <span className="chip bg-slate-100 text-slate-700">{filteredLogs.length} of {logs.length} events</span>
        <label className="relative w-full sm:max-w-xs">
          <span className="sr-only">Search audit events</span>
          <Search aria-hidden="true" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search actor, action, or target"
            className="min-h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm"
          />
        </label>
      </div>

      <div className="card overflow-hidden">
        <div className="scrollbar max-h-[600px] overflow-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-2">When</th>
                <th className="px-4 py-2">Actor</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Action</th>
                <th className="px-4 py-2">Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-2 font-mono text-[11px] text-slate-600">
                    {formatDateTime(l.createdAt)}
                  </td>
                  <td className="px-4 py-2 font-semibold text-slate-900">{l.actorName}</td>
                  <td className="px-4 py-2">
                    <span className={`chip ${ROLE_BADGE[l.actorRole] ?? "bg-slate-100 text-slate-700"}`}>
                      {l.actorRole.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`chip ${ACTION_STYLES[l.action] ?? "bg-slate-100 text-slate-700"}`}>
                      {l.action.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{l.target ?? "—"}</td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                    {logs.length === 0 ? "No audit events yet." : "No events match this search."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
