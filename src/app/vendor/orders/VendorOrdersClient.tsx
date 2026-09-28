"use client";

import { useState } from "react";
import { updateOrderStatus } from "@/lib/actions";
import { formatDateTime } from "@/lib/formatDate";

type Order = {
  id: string;
  status: string;
  totalAmount: string | number;
  consumerName: string;
  deliveryAddress?: string;
  deliveryPhone?: string | null;
  notes?: string | null;
  createdAt: Date;
  merchantName?: string | null;
  merchantCity?: string | null;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    price: string | number;
  }>;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  packed: "bg-purple-100 text-purple-700",
  out_for_delivery: "bg-indigo-100 text-indigo-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-slate-100 text-slate-500",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "⏳ Pending",
  confirmed: "✓ Confirmed",
  packed: "📦 Packed",
  out_for_delivery: "🚚 Out for Delivery",
  delivered: "✅ Delivered",
  cancelled: "❌ Cancelled",
};

const NEXT_STATUS: Record<string, string | null> = {
  pending: "confirmed",
  confirmed: "packed",
  packed: "out_for_delivery",
  out_for_delivery: "delivered",
  delivered: null,
  cancelled: null,
};

export function VendorOrdersClient({ orders, canManage }: { orders: Order[]; canManage: boolean }) {
  const [filter, setFilter] = useState<string>("all");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const counts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    confirmed: orders.filter((o) => o.status === "confirmed").length,
    packed: orders.filter((o) => o.status === "packed").length,
    out_for_delivery: orders.filter((o) => o.status === "out_for_delivery").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-slate-900">📦 Orders</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage incoming marketplace orders
        </p>
      </div>

      {/* Filter Pills */}
      <div className="mb-4 flex flex-wrap gap-2">
        {Object.entries(counts).map(([key, count]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              filter === key
                ? "bg-slate-900 text-white"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {key.replace("_", " ")} ({count})
          </button>
        ))}
      </div>

      {/* Orders List */}
      {filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-5xl">📦</div>
          <p className="mt-3 text-sm text-slate-500">No orders yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              canManage={canManage}
              expanded={expandedOrder === order.id}
              onToggle={() =>
                setExpandedOrder(expandedOrder === order.id ? null : order.id)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({
  order,
  canManage,
  expanded,
  onToggle,
}: {
  order: Order;
  canManage: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextStatus = NEXT_STATUS[order.status];

  async function handleStatusUpdate(newStatus: string) {
    setBusy(true);
    setError(null);
    try {
      const result = await updateOrderStatus(order.id, newStatus);
      if (!result.ok) setError(result.error ?? "Order status could not be updated.");
    } catch {
      setError("Order status could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card overflow-hidden">
      <div
        className="cursor-pointer p-4 hover:bg-slate-50"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">
                #{order.id.slice(0, 8)}
              </span>
              <span className={`chip ${STATUS_STYLES[order.status]}`}>
                {STATUS_LABELS[order.status]}
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-600">
              👤 {order.consumerName}
              {order.merchantCity && ` · 📍 ${order.merchantCity}`}
              {order.deliveryAddress && ` · ${order.deliveryAddress.slice(0, 40)}...`}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              🕒 {formatDateTime(order.createdAt)} · 📦{" "}
              {order.items.length} items
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-black text-emerald-700">
              ₹{parseFloat(String(order.totalAmount)).toFixed(0)}
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 p-4">
          <h4 className="text-xs font-bold uppercase text-slate-700">Items</h4>
          <div className="mt-2 space-y-1">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-slate-700">
                  {item.productName} × {item.quantity}
                </span>
                <span className="font-mono text-slate-600">
                  ₹{(parseFloat(String(item.price)) * item.quantity).toFixed(0)}
                </span>
              </div>
            ))}
          </div>

          {order.deliveryPhone && (
            <div className="mt-3 text-xs text-slate-600">
              📞 {order.deliveryPhone}
            </div>
          )}
          {order.notes && (
            <div className="mt-1 text-xs text-slate-600 italic">
              💬 {order.notes}
            </div>
          )}

          {error && <div role="alert" className="mt-2 text-xs text-rose-700">{error}</div>}

          {canManage && nextStatus && (
            <button
              onClick={() => handleStatusUpdate(nextStatus)}
              disabled={busy}
              className="mt-3 w-full rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
            >
              {busy ? "Updating..." : `Mark as ${STATUS_LABELS[nextStatus]}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
