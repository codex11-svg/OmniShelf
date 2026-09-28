"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPurchaseOrder } from "@/lib/actions";
import type { Supplier } from "./types";

type Props = {
  supplier: Supplier;
  onClose: () => void;
};

const DEFAULT_ITEM_COUNT = 5;

export function SupplierPODialog({ supplier, onClose }: Props) {
  const router = useRouter();
  const [itemCount, setItemCount] = useState(String(DEFAULT_ITEM_COUNT));
  const [totalAmount, setTotalAmount] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsedCount = Number.parseInt(itemCount, 10);
    const parsedAmount = Number.parseFloat(totalAmount);

    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setError("Enter a valid order amount.");
      return;
    }
    if (!Number.isSafeInteger(parsedCount) || parsedCount < 1) {
      setError("Enter at least one item.");
      return;
    }

    setBusy(true);
    try {
      const result = await createPurchaseOrder(
        parsedAmount,
        parsedCount,
        notes.trim() || `Purchase order for ${supplier.name}`,
        supplier.id,
        expectedDate || null
      );
      if (!result.ok) {
        setError(result.error ?? "Could not create the purchase order.");
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setError("Could not create the purchase order.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
        <div className="font-bold">Draft purchase order created</div>
        <div className="mt-0.5">
          {supplier.name} · {itemCount} items · ₹{Number(totalAmount).toLocaleString("en-IN")}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 rounded-lg border border-emerald-300 bg-white px-3 py-1 font-semibold text-emerald-800"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2 rounded-xl border border-indigo-200 bg-indigo-50/60 p-3">
      <div className="text-xs font-bold text-indigo-900">New purchase order · {supplier.name}</div>

      <label className="block text-[11px] font-semibold text-slate-600">
        Items
        <input
          type="number"
          min="1"
          step="1"
          required
          value={itemCount}
          onChange={(event) => setItemCount(event.target.value)}
          className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
        />
      </label>

      <label className="block text-[11px] font-semibold text-slate-600">
        Order amount (₹)
        <input
          type="number"
          min="0"
          step="0.01"
          required
          value={totalAmount}
          onChange={(event) => setTotalAmount(event.target.value)}
          placeholder="0.00"
          className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
        />
      </label>

      <label className="block text-[11px] font-semibold text-slate-600">
        Expected delivery
        <input
          type="date"
          value={expectedDate}
          onChange={(event) => setExpectedDate(event.target.value)}
          className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
        />
      </label>

      <label className="block text-[11px] font-semibold text-slate-600">
        Notes
        <input
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Optional"
          className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
        />
      </label>

      {error && <div role="alert" className="text-[11px] font-semibold text-rose-700">{error}</div>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="flex-1 rounded-lg bg-indigo-600 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create draft"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
