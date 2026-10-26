"use client";

import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { Printer, X } from "lucide-react";
import { formatLocalDateTime, formatMoney } from "@/lib/formatMoney";
import type { ReceiptDoc } from "@/lib/pos-types";

type PaperWidth = "80mm" | "58mm" | "A4";

const PAPER_OPTIONS: Array<{ id: PaperWidth; label: string }> = [
  { id: "80mm", label: "80mm thermal" },
  { id: "58mm", label: "58mm thermal" },
  { id: "A4", label: "A4" },
];

const PAYMENT_LABELS: Record<ReceiptDoc["paymentMode"], string> = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  CREDIT: "Credit (khata)",
};

const SCHEDULED_CLASSES = new Set(["SCHEDULE_H", "SCHEDULE_H1", "SCHEDULE_X"]);

/**
 * Print-ready counter bill.
 *
 * Thermal printers are the norm at an Indian counter, so the sheet is laid out at 80mm
 * and the `@page` rule is injected only while this dialog is mounted — that keeps the
 * rest of the app printing normally on A4. Everything shown comes from the stored price
 * snapshot, so a reprint matches the original bill even after prices change.
 */
export function ReceiptDocument({
  receipt,
  onClose,
}: {
  receipt: ReceiptDoc;
  onClose: () => void;
}) {
  const [paper, setPaper] = useState<PaperWidth>("80mm");
  const barcodeRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    const element = barcodeRef.current;
    if (!element) return;
    try {
      JsBarcode(element, receipt.refNumber, {
        format: "CODE128",
        displayValue: false,
        height: 34,
        width: 1.4,
        margin: 0,
        lineColor: "#000000",
        background: "#ffffff",
      });
    } catch {
      // An unencodable reference should never block printing; the number is shown as text too.
      element.replaceChildren();
    }
  }, [receipt.refNumber]);

  const currency = receipt.currency || "INR";
  const hasScheduledLines = receipt.lines.some(
    (line) => line.scheduleClass !== null && SCHEDULED_CLASSES.has(line.scheduleClass)
  );
  const sheetWidth = paper === "A4" ? "180mm" : paper;
  const pageRule =
    paper === "A4" ? "@page { size: A4 portrait; margin: 12mm; }" : `@page { size: ${paper} auto; margin: 2mm; }`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 print:static print:block print:overflow-visible print:bg-transparent print:p-0"
      role="dialog"
      aria-modal="true"
      aria-label={`Receipt ${receipt.refNumber}`}
    >
      {/* Scoped print rules: present only while a receipt is open. */}
      <style>{`
        ${pageRule}
        @media print {
          html, body { background: #ffffff !important; }
          body * { visibility: hidden !important; }
          .omnishelf-receipt, .omnishelf-receipt * { visibility: visible !important; }
          .omnishelf-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${sheetWidth} !important;
            max-width: none !important;
            margin: 0 !important;
            border: 0 !important;
            box-shadow: none !important;
          }
          .omnishelf-receipt-shell { display: block !important; }
          .omnishelf-no-print { display: none !important; }
        }
      `}</style>

      <div className="omnishelf-receipt-shell w-full max-w-md">
        <div className="omnishelf-no-print mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
            {PAPER_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setPaper(option.id)}
                className={`rounded-md px-2 py-1 text-xs font-semibold ${
                  paper === option.id ? "bg-emerald-800 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              autoFocus
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              <Printer aria-hidden="true" size={15} />
              Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <X aria-hidden="true" size={15} />
              Close
            </button>
          </div>
        </div>

        <div
          className="omnishelf-receipt mx-auto bg-white px-3 py-4 text-[11px] leading-[1.45] text-black shadow-lg print:shadow-none"
          style={{ width: sheetWidth, maxWidth: "100%", fontFamily: "'Courier New', ui-monospace, monospace" }}
        >
          <div className="text-center">
            <div className="text-[13px] font-bold uppercase tracking-wide">{receipt.storeName}</div>
            <div>{receipt.merchantType === "MEDICAL" ? "Pharmacy" : "Grocery"} · {receipt.storeCity}</div>
            {receipt.storePhone && <div>Ph: {receipt.storePhone}</div>}
            {receipt.gstNumber && <div>GSTIN / Lic: {receipt.gstNumber}</div>}
          </div>

          <Divider />

          <table className="w-full">
            <tbody>
              <Row label="Bill no" value={receipt.refNumber} />
              <Row label="Date" value={formatLocalDateTime(receipt.createdAt)} />
              <Row label="Cashier" value={receipt.cashierName} />
              <Row
                label="Payment"
                value={
                  receipt.paymentRef
                    ? `${PAYMENT_LABELS[receipt.paymentMode]} (${receipt.paymentRef})`
                    : PAYMENT_LABELS[receipt.paymentMode]
                }
              />
              {receipt.customerName && <Row label="Customer" value={receipt.customerName} />}
              {receipt.customerPhone && <Row label="Mobile" value={receipt.customerPhone} />}
            </tbody>
          </table>

          <Divider />

          <table className="w-full">
            <thead>
              <tr className="font-bold">
                <th className="text-left">Item</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Rate</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {receipt.lines.map((line) => (
                <tr key={`${line.productId}-${line.batchNumber ?? "nb"}`} className="align-top">
                  <td className="pr-1 text-left">
                    <div className="font-semibold">{line.name}</div>
                    {line.brand && <div className="text-[10px]">{line.brand}</div>}
                    {(line.batchNumber || line.expiryDate || (line.scheduleClass && SCHEDULED_CLASSES.has(line.scheduleClass))) && (
                      <div className="text-[10px]">
                        {line.batchNumber ? `B: ${line.batchNumber}` : ""}
                        {line.batchNumber && line.expiryDate ? " · " : ""}
                        {line.expiryDate ? `Exp: ${formatLocalDateTime(line.expiryDate).split(",")[0]}` : ""}
                        {line.scheduleClass && SCHEDULED_CLASSES.has(line.scheduleClass)
                          ? ` · ${line.scheduleClass.replace("SCHEDULE_", "Sch ")}`
                          : ""}
                      </div>
                    )}
                  </td>
                  <td className="text-right">{line.quantity}</td>
                  <td className="text-right">{formatMoney(line.unitPrice, currency)}</td>
                  <td className="text-right font-semibold">{formatMoney(line.lineTotal, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <Divider />

          <table className="w-full">
            <tbody>
              <Row label="Subtotal" value={formatMoney(receipt.subtotal, currency)} />
              <Row label={`GST @ ${receipt.taxRatePct}%`} value={formatMoney(receipt.taxAmount, currency)} />
              <tr className="text-[13px] font-bold">
                <td className="py-1 text-left">TOTAL</td>
                <td className="py-1 text-right">{formatMoney(receipt.total, currency)}</td>
              </tr>
              <Row label="Items" value={`${receipt.itemCount} unit${receipt.itemCount === 1 ? "" : "s"}`} />
            </tbody>
          </table>

          {(hasScheduledLines || receipt.patientName || receipt.doctorName) && (
            <>
              <Divider />
              <div className="space-y-0.5">
                {receipt.patientName && <Row label="Patient" value={receipt.patientName} />}
                {receipt.doctorName && <Row label="Prescriber" value={receipt.doctorName} />}
                <div className="pt-1 font-bold uppercase">
                  Schedule {hasScheduledLines ? "H / H1 / X" : ""} drug — sold on prescription only.
                  Not to be taken without medical advice.
                </div>
              </div>
            </>
          )}

          {receipt.queuedOffline && (
            <>
              <Divider />
              <div className="text-[10px] uppercase">
                Bill taken offline on the counter device and synced to the store server afterwards.
              </div>
            </>
          )}

          <Divider />

          <div className="flex flex-col items-center gap-1 pt-1">
            <svg ref={barcodeRef} aria-label={`Barcode for bill ${receipt.refNumber}`} role="img" />
            <div className="font-mono text-[11px] tracking-[0.2em]">{receipt.refNumber}</div>
          </div>

          <div className="pt-2 text-center text-[10px]">
            <div className="font-bold">Thank you, visit again.</div>
            <div>Goods sold are exchangeable only per store policy, with this bill.</div>
            <div className="pt-1">Powered by OmniShelf</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Divider() {
  return <div aria-hidden="true" className="my-1.5 border-t border-dashed border-black/60" />;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="text-left">{label}</td>
      <td className="text-right font-medium">{value}</td>
    </tr>
  );
}
