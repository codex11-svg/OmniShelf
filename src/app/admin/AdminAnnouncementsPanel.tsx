"use client";

import { useState } from "react";
import { createAnnouncement } from "@/lib/actions";
import { formatDate } from "@/lib/formatDate";

type Announcement = {
  id: string;
  title: string;
  body: string;
  severity: string;
  audience: string;
  createdAt: Date;
};

const SEV_STYLE: Record<string, string> = {
  info: "bg-blue-100 text-blue-700 border-blue-200",
  warning: "bg-amber-100 text-amber-700 border-amber-200",
  critical: "bg-rose-100 text-rose-700 border-rose-200",
};

export function AdminAnnouncementsPanel({ announcements }: { announcements: Announcement[] }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [severity, setSeverity] = useState("info");
  const [audience, setAudience] = useState("ALL");
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    if (!title.trim() || !body.trim()) return;
    setBusy(true);
    await createAnnouncement(title, body, severity, audience);
    setBusy(false);
    setTitle(""); setBody(""); setSeverity("info"); setAudience("ALL");
    setOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Broadcast announcements
          </h3>
          <p className="text-xs text-slate-500">
            Push messages to every vendor on the platform — filtered by domain.
          </p>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
        >
          {open ? "Cancel" : "+ New broadcast"}
        </button>
      </div>

      {open && (
        <div className="card space-y-3 p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="md:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="info">ℹ️ Info</option>
              <option value="warning">⚠️ Warning</option>
              <option value="critical">🚨 Critical</option>
            </select>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="ALL">All vendors</option>
              <option value="KIRANA">Kirana only</option>
              <option value="MEDICAL">Medical only</option>
            </select>
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Message body…"
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={handleCreate}
              disabled={busy}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              {busy ? "Broadcasting…" : "Broadcast to vendors"}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {announcements.map((a) => (
          <div key={a.id} className={`card border-l-4 p-4 ${SEV_STYLE[a.severity]?.split(" ").slice(2).join(" ") ?? "border-slate-300"}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{a.title}</span>
                  <span className={`chip ${SEV_STYLE[a.severity]}`}>{a.severity.toUpperCase()}</span>
                  <span className="chip bg-slate-100 text-slate-700">{a.audience}</span>
                </div>
                <p className="mt-1 text-sm text-slate-700">{a.body}</p>
              </div>
              <div className="text-[11px] text-slate-500">{formatDate(a.createdAt)}</div>
            </div>
          </div>
        ))}
        {announcements.length === 0 && (
          <div className="card p-6 text-center text-sm text-slate-500">No announcements yet.</div>
        )}
      </div>
    </div>
  );
}
