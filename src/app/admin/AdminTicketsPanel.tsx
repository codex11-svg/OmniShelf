"use client";

import { useState } from "react";
import { updateTicketStatus } from "@/lib/actions";
import { formatDate } from "@/lib/formatDate";

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

const PRI_STYLE: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-rose-100 text-rose-700",
};

const STATUS_STYLE: Record<string, string> = {
  open: "bg-amber-50 text-amber-700 border-amber-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-slate-50 text-slate-500 border-slate-200",
};

export function AdminTicketsPanel({ tickets }: { tickets: Ticket[] }) {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? tickets : tickets.filter((t) => t.status === filter);
  const counts = {
    open: tickets.filter((t) => t.status === "open").length,
    in_progress: tickets.filter((t) => t.status === "in_progress").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <button
          onClick={() => setFilter("all")}
          className={`card p-3 text-left ${filter === "all" ? "ring-2 ring-slate-900" : ""}`}
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total</div>
          <div className="text-2xl font-black text-slate-900">{tickets.length}</div>
        </button>
        <button
          onClick={() => setFilter("open")}
          className={`card p-3 text-left ${filter === "open" ? "ring-2 ring-amber-500" : ""}`}
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Open</div>
          <div className="text-2xl font-black text-amber-700">{counts.open}</div>
        </button>
        <button
          onClick={() => setFilter("in_progress")}
          className={`card p-3 text-left ${filter === "in_progress" ? "ring-2 ring-blue-500" : ""}`}
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">In progress</div>
          <div className="text-2xl font-black text-blue-700">{counts.in_progress}</div>
        </button>
        <button
          onClick={() => setFilter("resolved")}
          className={`card p-3 text-left ${filter === "resolved" ? "ring-2 ring-emerald-500" : ""}`}
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Resolved</div>
          <div className="text-2xl font-black text-emerald-700">{counts.resolved}</div>
        </button>
      </div>

      <div className="space-y-2">
        {filtered.map((t) => (
          <TicketRow key={t.id} ticket={t} />
        ))}
        {filtered.length === 0 && (
          <div className="card p-6 text-center text-sm text-slate-500">
            No tickets in this filter.
          </div>
        )}
      </div>
    </div>
  );
}

function TicketRow({ ticket }: { ticket: Ticket }) {
  const [status, setStatus] = useState(ticket.status);
  const [busy, setBusy] = useState(false);

  async function changeStatus(newStatus: string) {
    setBusy(true);
    setStatus(newStatus);
    await updateTicketStatus(ticket.id, newStatus);
    setBusy(false);
  }

  return (
    <div className={`card border-l-4 p-4 ${STATUS_STYLE[status]?.split(" ").slice(2).join(" ") ?? ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-900">{ticket.subject}</span>
            <span className={`chip ${PRI_STYLE[ticket.priority]}`}>
              {ticket.priority === "urgent" ? "🔥 " : ""}{ticket.priority.toUpperCase()}
            </span>
            <span className={`chip ${STATUS_STYLE[status]}`}>{status.replace("_", " ").toUpperCase()}</span>
          </div>
          <p className="mt-1 text-sm text-slate-700">{ticket.body}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span>👤 {ticket.requesterName}</span>
            {ticket.merchantName && <span>🏪 {ticket.merchantName}</span>}
            <span>📅 {formatDate(ticket.createdAt)}</span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {status !== "resolved" && status !== "closed" && (
            <select
              value={status}
              onChange={(e) => changeStatus(e.target.value)}
              disabled={busy}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
            >
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          )}
        </div>
      </div>
    </div>
  );
}
