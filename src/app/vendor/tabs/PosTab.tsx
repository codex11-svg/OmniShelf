"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Ban, Clock, Pause, Play, Printer, Receipt as ReceiptIcon, RefreshCw, WifiOff,
} from "lucide-react";
import { ReceiptDocument } from "@/components/ReceiptDocument";
import { formatLocalDateTime, formatMoney } from "@/lib/formatMoney";
import {
  createIdempotencyKey,
  discardQueuedSale,
  enqueueSale,
  isDeviceOnline,
  type QueuedSale,
  type QueuedSaleLine,
  type QueuedSalePayload,
} from "@/lib/offline-outbox";
import { usePosQueue } from "@/lib/usePosQueue";
import {
  POS_PAYMENT_MODES,
  type HeldTab,
  type PosPaymentMode,
  type ReceiptDoc,
  type RecentSale,
} from "@/lib/pos-types";
import {
  completePosSale,
  getMyReceipt,
  holdPosTab,
  listMyHeldTabs,
  listMyRecentSales,
  voidPosTab,
} from "@/lib/actions";
import type { CartItem, Product } from "./types";

const PAYMENT_LABELS: Record<PosPaymentMode, string> = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  CREDIT: "Credit (khata)",
};

type View = "counter" | "held" | "bills";

type Props = {
  products: Product[];
  merchantType: "KIRANA" | "MEDICAL";
  taxRatePct: number;
  currency: string;
  storeId: string;
  heldTabs: HeldTab[];
  recentSales: RecentSale[];
  canBill: boolean;
};

type QueuedBillSummary = {
  lines: QueuedSaleLine[];
  total: number;
  queuedAt: string;
};

function priceOf(product: Product): number {
  return parseFloat(String(product.mrp)) || 0;
}

function isRegulated(product: Product): boolean {
  return (
    product.scheduleClass === "SCHEDULE_H" ||
    product.scheduleClass === "SCHEDULE_H1" ||
    product.scheduleClass === "SCHEDULE_X" ||
    product.requiresPrescription
  );
}

/**
 * Reads an unfinished bill back from localStorage, e.g. after a page refresh or a
 * dropped connection. Lines are re-matched against the current catalogue and clamped
 * to what is still on the shelf, so a stale draft can never oversell.
 */
function restoreDraftCart(cartKey: string, products: Product[]): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(cartKey);
    if (!raw) return [];
    const saved = JSON.parse(raw) as Array<{ productId: string; cartQty: number }>;
    if (!Array.isArray(saved) || saved.length === 0) return [];
    const byId = new Map(products.map((product) => [product.id, product]));
    const restored = saved.flatMap((entry) => {
      const product = byId.get(entry.productId);
      const qty = Number(entry.cartQty);
      if (!product || !Number.isFinite(qty) || qty < 1) return [];
      return [{ ...product, cartQty: Math.min(qty, Math.max(product.quantity, 0)) }].filter(
        (line) => line.cartQty > 0
      );
    });
    return restored;
  } catch {
    // A corrupt cart draft is not worth interrupting the counter for.
    return [];
  }
}

/**
 * Counter POS: build a bill, park it, take payment, print it.
 *
 * Three ideas carried over from a real pharmacy counter:
 *  - **Held tabs** — park a bill mid-sale and serve the next customer. Stock is not
 *    reserved while parked; quantities are re-checked atomically at checkout.
 *  - **Printed receipts** — a thermal-ready bill from the stored price snapshot, so a
 *    reprint always matches what the customer was handed.
 *  - **Offline outbox** — if the connection drops mid-bill, the sale is queued on the
 *    device under an idempotency key and replayed once, exactly once, when it returns.
 */
export function PosTab({
  products,
  merchantType,
  taxRatePct,
  currency,
  storeId,
  heldTabs: initialHeldTabs,
  recentSales: initialRecentSales,
  canBill,
}: Props) {
  const router = useRouter();
  const { queued, pendingCount, syncing, online, syncNow } = usePosQueue();

  const cartKey = `omnishelf.pos.cart.${storeId}`;

  const [view, setView] = useState<View>("counter");
  // Restore an unfinished bill. PosTab only mounts on the client (VendorTabs renders
  // it behind a post-hydration tab switch), so reading localStorage in the initializer
  // cannot cause a hydration mismatch.
  const [cart, setCart] = useState<CartItem[]>(() => restoreDraftCart(cartKey, products));
  const [search, setSearch] = useState("");
  const [paymentMode, setPaymentMode] = useState<PosPaymentMode>("CASH");
  const [paymentRef, setPaymentRef] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [patientName, setPatientName] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [heldTabs, setHeldTabs] = useState<HeldTab[]>(initialHeldTabs);
  const [recentSales, setRecentSales] = useState<RecentSale[]>(initialRecentSales);

  // Re-seed from server data when a router.refresh() brings new rows, while keeping
  // optimistic local updates (hold/resume/void/checkout) between server renders.
  const [prevInitialHeldTabs, setPrevInitialHeldTabs] = useState(initialHeldTabs);
  if (prevInitialHeldTabs !== initialHeldTabs) {
    setPrevInitialHeldTabs(initialHeldTabs);
    setHeldTabs(initialHeldTabs);
  }
  const [prevInitialRecentSales, setPrevInitialRecentSales] = useState(initialRecentSales);
  if (prevInitialRecentSales !== initialRecentSales) {
    setPrevInitialRecentSales(initialRecentSales);
    setRecentSales(initialRecentSales);
  }
  const [receipt, setReceipt] = useState<ReceiptDoc | null>(null);
  const [queuedBill, setQueuedBill] = useState<QueuedBillSummary | null>(null);
  const [notice, setNotice] = useState<string | null>(() =>
    cart.length > 0 ? "Restored the bill you were working on." : null
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reprintingId, setReprintingId] = useState<string | null>(null);

  // Persist the in-progress bill so a refresh or a dropped connection does not lose it.
  useEffect(() => {
    try {
      if (cart.length === 0) window.localStorage.removeItem(cartKey);
      else {
        window.localStorage.setItem(
          cartKey,
          JSON.stringify(cart.map((line) => ({ productId: line.id, cartQty: line.cartQty })))
        );
      }
    } catch {
      // Storage can be unavailable in private mode; the bill still works in memory.
    }
  }, [cart, cartKey]);

  const filtered = useMemo(
    () =>
      products.filter((product) =>
        (product.name + (product.brand ?? "") + (product.barcode ?? "") + (product.category ?? ""))
          .toLowerCase()
          .includes(search.trim().toLowerCase())
      ),
    [products, search]
  );

  const subtotal = cart.reduce((sum, line) => sum + priceOf(line) * line.cartQty, 0);
  const tax = (subtotal * taxRatePct) / 100;
  const total = subtotal + tax;
  const unitCount = cart.reduce((sum, line) => sum + line.cartQty, 0);
  const regulatedItems = cart.filter(isRegulated);
  const displayLines: QueuedSaleLine[] = cart.map((line) => ({
    name: line.name,
    quantity: line.cartQty,
    unitPrice: priceOf(line),
  }));

  function clearBill() {
    setCart([]);
    setActiveTabId(null);
    setCustomerName("");
    setCustomerPhone("");
    setPatientName("");
    setDoctorName("");
    setPrescriptionFile(null);
    setPaymentRef("");
    setPaymentMode("CASH");
  }

  function addToCart(product: Product) {
    if (product.quantity < 1) return;
    setCart((prev) => {
      const existing = prev.find((line) => line.id === product.id);
      if (existing) {
        return prev.map((line) =>
          line.id === product.id ? { ...line, cartQty: Math.min(product.quantity, line.cartQty + 1) } : line
        );
      }
      return [...prev, { ...product, cartQty: 1 }];
    });
  }

  function updateQty(id: string, qty: number) {
    setCart((prev) =>
      prev.map((line) => (line.id === id ? { ...line, cartQty: Math.max(0, qty) } : line)).filter((line) => line.cartQty > 0)
    );
  }

  async function refreshHeldTabs() {
    try {
      const tabs = await listMyHeldTabs();
      setHeldTabs(tabs);
    } catch {
      // The list stays as-is; the next server render will correct it.
    }
  }

  async function holdBill() {
    if (cart.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await holdPosTab({
        items: cart.map((line) => ({ productId: line.id, quantity: line.cartQty })),
        customerName,
        customerPhone,
        note: activeTabId ? `Resumed from ${heldTabs.find((tab) => tab.id === activeTabId)?.refNumber ?? "a held bill"}` : undefined,
      });
      if (!result.ok) {
        setError(result.error ?? "That bill could not be put on hold.");
        return;
      }
      setHeldTabs((prev) => [result.tab, ...prev.filter((tab) => tab.id !== result.tab.id)]);
      clearBill();
      setView("held");
      setNotice(`Bill ${result.tab.refNumber} is on hold. Stock is not reserved until it is completed.`);
      router.refresh();
    } catch {
      setError("That bill could not be put on hold. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  function resumeTab(tab: HeldTab) {
    const byId = new Map(products.map((product) => [product.id, product]));
    const restored: CartItem[] = [];
    const unavailable: string[] = [];
    for (const line of tab.lines) {
      const product = byId.get(line.productId);
      if (!product) {
        unavailable.push(line.name);
        continue;
      }
      const qty = Math.min(line.quantity, Math.max(product.quantity, 0));
      if (qty < 1) {
        unavailable.push(line.name);
        continue;
      }
      restored.push({ ...product, cartQty: qty });
    }

    setCart(restored);
    setActiveTabId(tab.id);
    setCustomerName(tab.customerName ?? "");
    setCustomerPhone(tab.customerPhone ?? "");
    setView("counter");
    if (unavailable.length > 0) {
      setError(
        `${unavailable.join(", ")} ${unavailable.length === 1 ? "is" : "are"} out of stock or no longer in the catalogue and were left off the bill.`
      );
    } else {
      setNotice(`Loaded ${tab.refNumber}. Prices and stock were re-checked.`);
    }
  }

  async function voidTab(tab: HeldTab) {
    setBusy(true);
    setError(null);
    try {
      const result = await voidPosTab(tab.id);
      if (!result.ok) {
        setError(result.error ?? "That bill could not be voided.");
        return;
      }
      setHeldTabs((prev) => prev.filter((entry) => entry.id !== tab.id));
      if (activeTabId === tab.id) setActiveTabId(null);
      setNotice(`Held bill ${result.refNumber} was voided.`);
      router.refresh();
    } catch {
      setError("That bill could not be voided. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function reprint(sale: RecentSale) {
    setReprintingId(sale.receiptId);
    setError(null);
    try {
      const doc = await getMyReceipt(sale.receiptId);
      if (!doc) {
        setError("That bill could not be found in this store.");
        return;
      }
      setReceipt(doc);
    } catch {
      setError("That bill could not be loaded. Check your connection and try again.");
    } finally {
      setReprintingId(null);
    }
  }

  const checkout = async () => {
    if (cart.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);

    const key = createIdempotencyKey();
    let payload: QueuedSalePayload | null = null;

    try {
      if (regulatedItems.length > 0) {
        if (!patientName.trim() || !doctorName.trim() || !prescriptionFile) {
          setError("Patient name, doctor name, and prescription are required for scheduled medicines.");
          return;
        }
        if (!isDeviceOnline()) {
          // The prescription has to reach the server before a scheduled drug can be sold,
          // and it cannot be uploaded offline. Parking the bill keeps the work.
          setError(
            "Scheduled medicines need the prescription uploaded, which requires a connection. Put the bill on hold and finish it once you are back online."
          );
          return;
        }
        const form = new FormData();
        form.append("file", prescriptionFile);
        form.append("type", "prescription");
        const response = await fetch("/api/upload", { method: "POST", body: form });
        const upload = (await response.json()) as { key?: string; error?: string };
        if (!response.ok || typeof upload.key !== "string") {
          setError(upload.error ?? "Prescription upload failed.");
          return;
        }
        payload = {
          items: cart.map((line) => ({ productId: line.id, quantity: line.cartQty })),
          paymentMode,
          paymentRef: paymentRef.trim() || undefined,
          customerName: customerName.trim() || undefined,
          customerPhone: customerPhone.trim() || undefined,
          patientName: patientName.trim(),
          doctorName: doctorName.trim(),
          prescriptionKey: upload.key,
          heldTabId: activeTabId ?? undefined,
        };
      } else {
        payload = {
          items: cart.map((line) => ({ productId: line.id, quantity: line.cartQty })),
          paymentMode,
          paymentRef: paymentRef.trim() || undefined,
          customerName: customerName.trim() || undefined,
          customerPhone: customerPhone.trim() || undefined,
          heldTabId: activeTabId ?? undefined,
        };
      }

      if (!isDeviceOnline()) {
        const entry = await enqueueSale(key, payload, displayLines);
        if (!entry) {
          setError("This device could not save the bill for later. Stay online to record this sale.");
          return;
        }
        setQueuedBill({ lines: displayLines, total, queuedAt: entry.queuedAt });
        clearBill();
        return;
      }

      const result = await completePosSale({ ...payload, idempotencyKey: key, queuedOffline: false });
      if (!result.ok) {
        setError(result.error ?? "Sale could not be completed.");
        return;
      }
      setReceipt(result.receipt);
      setRecentSales((prev) => [toRecentSale(result.receipt), ...prev.filter((sale) => sale.receiptId !== result.receipt.receiptId)]);
      if (activeTabId) setHeldTabs((prev) => prev.filter((tab) => tab.id !== activeTabId));
      clearBill();
      router.refresh();
    } catch {
      // Transport failure mid-checkout: the bill is already built, so queue it rather than
      // making the clerk rebuild it and risk a second, duplicate sale.
      if (payload) {
        const entry = await enqueueSale(key, payload, displayLines).catch(() => null);
        if (entry) {
          setQueuedBill({ lines: displayLines, total, queuedAt: entry.queuedAt });
          clearBill();
          return;
        }
      }
      setError("Sale could not be completed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (queuedBill) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <WifiOff aria-hidden="true" size={34} className="mx-auto mb-3 text-amber-600" />
        <h3 className="text-lg font-bold text-slate-900">Bill saved on this device</h3>
        <p className="mt-2 text-sm text-slate-600">
          {queuedBill.lines.length} line{queuedBill.lines.length === 1 ? "" : "s"} · {formatMoney(queuedBill.total, currency)} ·
          queued at {formatLocalDateTime(queuedBill.queuedAt)}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          It will be recorded automatically when the connection returns, and only once — stock is deducted
          at that point.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => void syncNow()}
            disabled={syncing || pendingCount === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-40"
          >
            <RefreshCw aria-hidden="true" size={15} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Syncing…" : "Try to sync now"}
          </button>
          <button
            type="button"
            onClick={() => setQueuedBill(null)}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to counter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="tablist" aria-label="Point of sale views" className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1">
          {([
            { id: "counter", label: "Counter", count: null },
            { id: "held", label: "Held bills", count: heldTabs.length },
            { id: "bills", label: "Recent bills", count: recentSales.length },
          ] as Array<{ id: View; label: string; count: number | null }>).map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={view === entry.id}
              onClick={() => setView(entry.id)}
              className={`min-h-10 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                view === entry.id ? "bg-emerald-800 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {entry.label}
              {entry.count !== null && <span className="ml-1 tabular-nums">{entry.count}</span>}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs">
          {!online && (
            <span className="chip bg-amber-50 text-amber-900">
              <WifiOff aria-hidden="true" size={12} /> Offline — bills queue on this device
            </span>
          )}
          {pendingCount > 0 && (
            <button
              type="button"
              onClick={() => void syncNow()}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
            >
              <RefreshCw aria-hidden="true" size={14} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Syncing…" : `Sync ${pendingCount} queued bill${pendingCount === 1 ? "" : "s"}`}
            </button>
          )}
        </div>
      </div>

      {notice && (
        <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900">
          {notice}
        </div>
      )}

      <QueuedBillsPanel queued={queued} />

      {view === "held" && (
        <HeldBillsPanel
          tabs={heldTabs}
          currency={currency}
          busy={busy}
          onRefresh={refreshHeldTabs}
          onResume={resumeTab}
          onVoid={voidTab}
        />
      )}

      {view === "bills" && (
        <RecentBillsPanel
          sales={recentSales}
          currency={currency}
          reprintingId={reprintingId}
          onReprint={reprint}
        />
      )}

      {view === "counter" && (
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="card p-4 lg:col-span-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              {merchantType === "MEDICAL" ? "Dispense medicine" : "Add items to bill"}
            </h3>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, brand, or barcode…"
              aria-label="Search products"
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <div className="mt-3 grid max-h-[500px] grid-cols-2 gap-2 overflow-auto pr-1 md:grid-cols-3">
              {filtered.slice(0, 30).map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addToCart(product)}
                  disabled={product.quantity < 1}
                  className="rounded-lg border border-slate-200 bg-white p-2 text-left hover:border-indigo-400 hover:bg-indigo-50/40 disabled:opacity-40"
                >
                  <div className="truncate text-xs font-semibold text-slate-900">{product.name}</div>
                  <div className="text-[10px] text-slate-500">{product.brand}</div>
                  <div className="mt-1 flex items-center justify-between text-[11px]">
                    <span className="font-bold text-emerald-700">{formatMoney(priceOf(product), currency)}</span>
                    <span className={`font-mono ${product.quantity < 5 ? "text-rose-600" : "text-slate-500"}`}>
                      ×{product.quantity}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="card flex flex-col p-4 lg:col-span-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Current bill</h3>
              {activeTabId && (
                <span className="chip bg-blue-50 text-blue-800">
                  <Clock aria-hidden="true" size={12} />
                  {heldTabs.find((tab) => tab.id === activeTabId)?.refNumber ?? "Held bill"}
                </span>
              )}
            </div>

            <div className="mt-2 flex-1 space-y-1 overflow-auto">
              {cart.length === 0 && <div className="py-6 text-center text-xs text-slate-500">Cart is empty</div>}
              {cart.map((line) => (
                <div key={line.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-2 text-xs">
                  <div className="flex-1">
                    <div className="truncate font-semibold text-slate-900">{line.name}</div>
                    <div className="text-[10px] text-slate-500">
                      {formatMoney(priceOf(line), currency)} × {line.cartQty}
                      {isRegulated(line) && <span className="ml-1 font-semibold text-rose-700">Rx</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" aria-label={`Remove one ${line.name}`} onClick={() => updateQty(line.id, line.cartQty - 1)} className="h-5 w-5 rounded bg-white text-xs">−</button>
                    <span className="w-5 text-center font-mono">{line.cartQty}</span>
                    <button type="button" aria-label={`Add one ${line.name}`} onClick={() => updateQty(line.id, line.cartQty + 1)} className="h-5 w-5 rounded bg-white text-xs">+</button>
                  </div>
                  <div className="ml-2 w-16 text-right font-mono font-bold">
                    {formatMoney(priceOf(line) * line.cartQty, currency)}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm">
              <div className="flex justify-between text-slate-600"><span>Subtotal</span><span className="font-mono">{formatMoney(subtotal, currency)}</span></div>
              <div className="flex justify-between text-slate-600"><span>GST ({taxRatePct}%)</span><span className="font-mono">{formatMoney(tax, currency)}</span></div>
              <div className="flex justify-between text-base font-bold text-slate-900"><span>Total</span><span className="font-mono">{formatMoney(total, currency)}</span></div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-[11px] font-semibold text-slate-600">
                Payment
                <select
                  value={paymentMode}
                  onChange={(event) => setPaymentMode(event.target.value as PosPaymentMode)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-normal"
                >
                  {POS_PAYMENT_MODES.map((mode) => (
                    <option key={mode} value={mode}>{PAYMENT_LABELS[mode]}</option>
                  ))}
                </select>
              </label>
              {paymentMode === "UPI" || paymentMode === "CARD" ? (
                <label className="text-[11px] font-semibold text-slate-600">
                  {paymentMode === "UPI" ? "UPI reference" : "Approval code"}
                  <input
                    value={paymentRef}
                    onChange={(event) => setPaymentRef(event.target.value)}
                    placeholder="Optional"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-normal"
                  />
                </label>
              ) : (
                <label className="text-[11px] font-semibold text-slate-600">
                  Customer
                  <input
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    placeholder="Walk-in"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-normal"
                  />
                </label>
              )}
            </div>

            {regulatedItems.length > 0 && (
              <div className="mt-3 space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="text-xs font-semibold text-amber-900">Prescription details required</div>
                <input value={patientName} onChange={(event) => setPatientName(event.target.value)} placeholder="Patient name" aria-label="Patient name" className="w-full rounded border border-amber-200 bg-white px-2 py-1.5 text-xs" />
                <input value={doctorName} onChange={(event) => setDoctorName(event.target.value)} placeholder="Prescribing doctor" aria-label="Prescribing doctor" className="w-full rounded border border-amber-200 bg-white px-2 py-1.5 text-xs" />
                <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" aria-label="Prescription" onChange={(event) => setPrescriptionFile(event.target.files?.[0] ?? null)} className="w-full text-xs" />
              </div>
            )}

            {error && <div role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={holdBill}
                disabled={cart.length === 0 || busy || !canBill}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                <Pause aria-hidden="true" size={15} />
                Hold bill
              </button>
              <button
                type="button"
                onClick={() => void checkout()}
                disabled={cart.length === 0 || busy || !canBill}
                className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
              >
                {busy ? "Recording sale…" : `${online ? "Record sale" : "Queue sale"} · ${formatMoney(total, currency)}`}
              </button>
            </div>
            {!canBill && (
              <p className="mt-2 text-[11px] text-slate-500">Your staff account is scan-only, so it cannot bill.</p>
            )}
            <p className="mt-2 text-[11px] text-slate-500">
              {unitCount} unit{unitCount === 1 ? "" : "s"} · held bills do not reserve stock; quantities are
              re-checked when the sale is recorded.
            </p>
          </div>
        </div>
      )}

      {receipt && <ReceiptDocument receipt={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}

function toRecentSale(receipt: ReceiptDoc): RecentSale {
  return {
    receiptId: receipt.receiptId,
    refNumber: receipt.refNumber,
    createdAt: receipt.createdAt,
    cashierName: receipt.cashierName,
    itemCount: receipt.itemCount,
    total: receipt.total,
    paymentMode: receipt.paymentMode,
    queuedOffline: receipt.queuedOffline,
    customerName: receipt.customerName,
  };
}

function HeldBillsPanel({
  tabs,
  currency,
  busy,
  onRefresh,
  onResume,
  onVoid,
}: {
  tabs: HeldTab[];
  currency: string;
  busy: boolean;
  onRefresh: () => Promise<void>;
  onResume: (tab: HeldTab) => void;
  onVoid: (tab: HeldTab) => void;
}) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  if (tabs.length === 0) {
    return (
      <div className="card p-8 text-center">
        <Pause aria-hidden="true" size={26} className="mx-auto mb-2 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-900">No bills on hold</h3>
        <p className="mt-1 text-xs text-slate-500">
          Park a bill at the counter when a customer steps away, then resume it here. Holding a bill does not
          reserve stock.
        </p>
        <button
          type="button"
          onClick={() => void onRefresh()}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw aria-hidden="true" size={13} /> Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {tabs.map((tab) => (
        <article key={tab.id} className="card flex flex-col p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-mono text-sm font-bold text-slate-900">{tab.refNumber}</h3>
              <div className="text-[11px] text-slate-500">
                Held by {tab.heldByName} · {formatLocalDateTime(tab.createdAt)}
              </div>
            </div>
            <span className="chip bg-amber-50 text-amber-900">{formatMoney(tab.estimatedTotal, currency)}</span>
          </div>

          {(tab.customerName || tab.customerPhone) && (
            <div className="mt-2 text-xs text-slate-700">
              {tab.customerName ?? "Customer"}{tab.customerPhone ? ` · ${tab.customerPhone}` : ""}
            </div>
          )}
          {tab.note && <div className="mt-1 text-[11px] italic text-slate-500">{tab.note}</div>}

          <ul className="mt-2 flex-1 space-y-1 text-[11px] text-slate-600">
            {tab.lines.slice(0, 4).map((line) => (
              <li key={line.productId} className="flex justify-between gap-2">
                <span className="truncate">{line.name}</span>
                <span className="font-mono">×{line.quantity}</span>
              </li>
            ))}
            {tab.lines.length > 4 && <li className="text-slate-400">+{tab.lines.length - 4} more lines</li>}
          </ul>

          {confirmingId === tab.id ? (
            <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2">
              <p className="text-[11px] text-rose-800">Void {tab.refNumber}? This cannot be undone.</p>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => setConfirmingId(null)} className="flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-white">Cancel</button>
                <button
                  type="button"
                  onClick={() => { setConfirmingId(null); void onVoid(tab); }}
                  disabled={busy}
                  className="flex-1 rounded-md bg-rose-700 px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-rose-800 disabled:opacity-50"
                >
                  Void bill
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => onResume(tab)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
              >
                <Play aria-hidden="true" size={13} /> Resume
              </button>
              <button
                type="button"
                onClick={() => setConfirmingId(tab.id)}
                disabled={busy}
                aria-label={`Void ${tab.refNumber}`}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
              >
                <Ban aria-hidden="true" size={13} />
              </button>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

function RecentBillsPanel({
  sales,
  currency,
  reprintingId,
  onReprint,
}: {
  sales: RecentSale[];
  currency: string;
  reprintingId: string | null;
  onReprint: (sale: RecentSale) => void;
}) {
  if (sales.length === 0) {
    return (
      <div className="card p-8 text-center">
        <ReceiptIcon aria-hidden="true" size={26} className="mx-auto mb-2 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-900">No counter bills yet</h3>
        <p className="mt-1 text-xs text-slate-500">
          Completed bills appear here and can be reprinted exactly as issued.
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="table-header grid grid-cols-12 gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2">
        <div className="col-span-3">Bill</div>
        <div className="col-span-3">When</div>
        <div className="col-span-2">Cashier</div>
        <div className="col-span-2 text-right">Total</div>
        <div className="col-span-2 text-right">Receipt</div>
      </div>
      <ul className="divide-y divide-slate-100">
        {sales.map((sale) => (
          <li key={sale.receiptId} className="grid grid-cols-12 items-center gap-2 px-4 py-2 text-xs">
            <div className="col-span-3">
              <div className="font-mono font-semibold text-slate-900">{sale.refNumber}</div>
              <div className="text-[10px] text-slate-500">
                {sale.itemCount} unit{sale.itemCount === 1 ? "" : "s"} · {PAYMENT_LABELS[sale.paymentMode]}
                {sale.queuedOffline && <span className="ml-1 text-amber-700">· synced offline</span>}
              </div>
            </div>
            <div className="col-span-3 text-slate-600">{formatLocalDateTime(sale.createdAt)}</div>
            <div className="col-span-2 truncate text-slate-600">{sale.cashierName}</div>
            <div className="col-span-2 text-right font-mono font-semibold text-slate-900">
              {formatMoney(sale.total, currency)}
            </div>
            <div className="col-span-2 text-right">
              <button
                type="button"
                onClick={() => onReprint(sale)}
                disabled={reprintingId === sale.receiptId}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Printer aria-hidden="true" size={12} />
                {reprintingId === sale.receiptId ? "Loading…" : "Print"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Queued bills the clerk can inspect or drop before they sync. */
export function QueuedBillsPanel({ queued }: { queued: QueuedSale[] }) {
  if (queued.length === 0) return null;
  return (
    <div className="card border-amber-200 bg-amber-50/60 p-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-amber-900">
        Queued on this device ({queued.length})
      </h3>
      <ul className="mt-2 space-y-2">
        {queued.map((sale) => (
          <li key={sale.key} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs">
            <div>
              <div className="font-semibold text-slate-900">
                {sale.lines.length} line{sale.lines.length === 1 ? "" : "s"} · queued {formatLocalDateTime(sale.queuedAt)}
              </div>
              <div className="truncate text-[11px] text-slate-500">
                {sale.lines.map((line) => `${line.name} ×${line.quantity}`).join(", ")}
              </div>
              {sale.lastError && <div className="mt-1 text-[11px] font-semibold text-rose-700">{sale.lastError}</div>}
            </div>
            <button
              type="button"
              onClick={() => void discardQueuedSale(sale.key)}
              className="rounded-md border border-slate-200 px-2 py-1 font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-700"
            >
              Discard
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
