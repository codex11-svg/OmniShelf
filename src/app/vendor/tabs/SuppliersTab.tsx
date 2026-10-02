"use client";

import { useState } from "react";
import { Building2, ClipboardList, PackageCheck, Phone } from "lucide-react";
import { formatDate } from "@/lib/formatDate";
import { SupplierPODialog } from "./SupplierPODialog";
import type { PurchaseOrder, Supplier } from "./types";

type SuppliersView = "suppliers" | "po";

type Props = {
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
};

const PO_STATUS_STYLES: Record<string, string> = {
  RECEIVED: "bg-emerald-100 text-emerald-700",
  SENT: "bg-blue-100 text-blue-700",
  PARTIAL: "bg-amber-100 text-amber-700",
  DRAFT: "bg-slate-100 text-slate-700",
  CANCELLED: "bg-rose-100 text-rose-700",
};

export function SuppliersTab({ suppliers, purchaseOrders }: Props) {
  const [view, setView] = useState<SuppliersView>("suppliers");
  const [openDialogFor, setOpenDialogFor] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Supplier views" className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1">
        <button
          type="button"
          onClick={() => setView("suppliers")}
          role="tab"
          aria-selected={view === "suppliers"}
          aria-controls="supplier-directory-panel"
          className={`min-h-10 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            view === "suppliers" ? "bg-emerald-800 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Suppliers <span className="ml-1 tabular-nums">{suppliers.length}</span>
        </button>
        <button
          type="button"
          onClick={() => setView("po")}
          role="tab"
          aria-selected={view === "po"}
          aria-controls="purchase-orders-panel"
          className={`min-h-10 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            view === "po" ? "bg-emerald-800 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Purchase orders <span className="ml-1 tabular-nums">{purchaseOrders.length}</span>
        </button>
      </div>

      {view === "suppliers" && (
        <div id="supplier-directory-panel" role="tabpanel" aria-label="Supplier directory" className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {suppliers.length === 0 && (
            <div className="card p-6 text-center text-sm text-slate-500 md:col-span-2 lg:col-span-3">
              <Building2 aria-hidden="true" size={24} className="mx-auto mb-2 text-slate-400" />
              No suppliers yet.
            </div>
          )}
          {suppliers.map((supplier) => (
            <article key={supplier.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{supplier.name}</h3>
                  <div className="text-xs text-slate-500">{supplier.category ?? "—"}</div>
                </div>
                <span className="chip bg-amber-50 text-amber-900">
                  {Number(supplier.rating ?? 0).toFixed(1)} rating
                </span>
              </div>

              <dl className="mt-2 space-y-0.5 text-xs text-slate-700">
                <div>
                  <dt className="inline font-semibold text-slate-500">Contact: </dt>
                  <dd className="inline">{supplier.contactPerson ?? "—"}</dd>
                </div>
                <div>
                  <dt className="inline font-semibold text-slate-500">Phone: </dt>
                  <dd className="inline">{supplier.phone ?? "—"}</dd>
                </div>
                <div>
                  <dt className="inline font-semibold text-slate-500">Email: </dt>
                  <dd className="inline">{supplier.email ?? "—"}</dd>
                </div>
                <div>
                  <dt className="inline font-semibold text-slate-500">Lead time: </dt>
                  <dd className="inline">{supplier.leadTimeDays ?? "—"} days</dd>
                </div>
              </dl>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpenDialogFor(openDialogFor === supplier.id ? null : supplier.id)}
                  className="flex-1 rounded-md bg-emerald-800 py-2 text-xs font-semibold text-white hover:bg-emerald-900"
                >
                  {openDialogFor === supplier.id ? "Close" : "Create PO"}
                </button>
                {supplier.phone ? (
                  <a
                    href={`tel:${supplier.phone}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Phone aria-hidden="true" size={13} />
                    Call
                  </a>
                ) : (
                  <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-400">
                    Call
                  </span>
                )}
              </div>

              {openDialogFor === supplier.id && (
                <SupplierPODialog supplier={supplier} onClose={() => setOpenDialogFor(null)} />
              )}
            </article>
          ))}
        </div>
      )}

      {view === "po" && (
        <div id="purchase-orders-panel" role="tabpanel" aria-label="Purchase orders" className="card overflow-hidden">
          <div className="scrollbar overflow-auto">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-2">Created</th>
                <th className="px-4 py-2">Supplier</th>
                <th className="px-4 py-2">Items</th>
                <th className="px-4 py-2 text-right">Amount</th>
                <th className="px-4 py-2">Expected</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchaseOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    No purchase orders yet. Create one from a supplier card.
                  </td>
                </tr>
              )}
              {purchaseOrders.map((po) => (
                <tr key={po.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono text-[11px] text-slate-600">{formatDate(po.createdAt)}</td>
                  <td className="px-4 py-2 font-semibold text-slate-900">{po.supplierName ?? "—"}</td>
                  <td className="px-4 py-2 text-slate-700">{po.itemCount}</td>
                  <td className="px-4 py-2 text-right font-mono text-emerald-700">
                    ₹{Number(po.totalAmount).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{formatDate(po.expectedDate)}</td>
                  <td className="px-4 py-2">
                    <span className={`chip ${PO_STATUS_STYLES[po.status] ?? "bg-slate-100 text-slate-700"}`}>
                      {po.status === "RECEIVED" && <PackageCheck aria-hidden="true" size={12} />}
                      {po.status === "DRAFT" && <ClipboardList aria-hidden="true" size={12} />}
                      {po.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
