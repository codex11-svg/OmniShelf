"use client";

import { useState } from "react";
import { Search } from "lucide-react";
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
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = tickets.filter((ticket) => {
    const matchesStatus = filter === "all" || ticket.status === filter;
    const matchesQuery = !normalizedQuery || [ticket.subject, ticket.body, ticket.requesterName, ticket.merchantName ?? ""]
      .some((value) => value.toLowerCase().includes(normalizedQuery));
    return matchesStatus && matchesQuery;
  });
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
          aria-pressed={filter === "all"}
          className={`card p-3 text-left ${filter === "all" ? "ring-2 ring-slate-900" : ""}`}
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total</div>
          <div className="text-2xl font-black text-slate-900">{tickets.length}</div>
        </button>
        <button
          onClick={() => setFilter("open")}
          aria-pressed={filter === "open"}
          className={`card p-3 text-left ${filter === "open" ? "ring-2 ring-amber-500" : ""}`}
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Open</div>
          <div className="text-2xl font-black text-amber-700">{counts.open}</div>
        </button>
        <button
          onClick={() => setFilter("in_progress")}
          aria-pressed={filter === "in_progress"}
          className={`card p-3 text-left ${filter === "in_progress" ? "ring-2 ring-blue-500" : ""}`}
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">In progress</div>
          <div className="text-2xl font-black text-blue-700">{counts.in_progress}</div>
        </button>
        <button
          onClick={() => setFilter("resolved")}
          aria-pressed={filter === "resolved"}
          className={`card p-3 text-left ${filter === "resolved" ? "ring-2 ring-emerald-500" : ""}`}
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Resolved</div>
          <div className="text-2xl font-black text-emerald-700">{counts.resolved}</div>
        </button>
      </div>

      <label className="relative block">
        <span className="sr-only">Search support tickets</span>
        <Search aria-hidden="true" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search subject, requester, store, or message"
          className="min-h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm"
        />
      </label>

      <div className="space-y-2">
        {filtered.map((t) => (
          <TicketRow key={t.id} ticket={t} />
        ))}
        {filtered.length === 0 && (
          <div className="card p-6 text-center text-sm text-slate-500">
            No tickets match the selected filters.
          </div>
        )}
      </div>
    </div>
  );
}

function TicketRow({ ticket }: { ticket: Ticket }) {
  const [status, setStatus] = useState(ticket.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function changeStatus(newStatus: string) {
    setBusy(true);
    setError(null);
    try {
      await updateTicketStatus(ticket.id, newStatus);
      setStatus(newStatus);
    } catch {
      setError("Status could not be saved. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`card border-l-4 p-4 ${STATUS_STYLE[status]?.split(" ").slice(2).join(" ") ?? ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-900">{ticket.subject}</span>
            <span className={`chip ${PRI_STYLE[ticket.priority] ?? PRI_STYLE.medium}`}>
              {ticket.priority.toUpperCase()}
            </span>
            <span className={`chip ${STATUS_STYLE[status]}`}>{status.replace("_", " ").toUpperCase()}</span>
          </div>
          <p className="mt-1 text-sm text-slate-700">{ticket.body}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span>{ticket.requesterName}</span>
            {ticket.merchantName && <span>{ticket.merchantName}</span>}
            <span>{formatDate(ticket.createdAt)}</span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {status !== "resolved" && status !== "closed" && (
            <select
              value={status}
              onChange={(e) => changeStatus(e.target.value)}
              disabled={busy}
              aria-label={`Ticket status for ${ticket.subject}`}
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
      {error && <p role="alert" className="mt-2 text-xs font-medium text-rose-800">{error}</p>}
    </div>
  );
}
