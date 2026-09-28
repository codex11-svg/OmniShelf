"use client";

import { useState } from "react";
import { createOrder } from "@/lib/actions";

type CartItem = {
  productId: string;
  productName: string;
  merchantId: string;
  quantity: number;
  price: number;
};

export function ConsumerCart({
  items,
  onUpdateQty,
  onRemove,
  onOrderPlaced,
  onClear,
}: {
  items: CartItem[];
  onUpdateQty: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
  onOrderPlaced: (merchantId: string) => void;
  onClear: () => void;
}) {
  const [showCheckout, setShowCheckout] = useState(false);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Group by merchant
  const byMerchant = items.reduce<Record<string, CartItem[]>>((acc, item) => {
    (acc[item.merchantId] ??= []).push(item);
    return acc;
  }, {});
  const merchantHasBundle = (merchantItems: CartItem[]) =>
    new Set(merchantItems.map((item) => item.productId)).size >= 2;
  const linePrice = (item: CartItem, merchantItems: CartItem[]) =>
    item.price * (merchantHasBundle(merchantItems) ? 0.95 : 1);
  const total = Object.values(byMerchant).reduce(
    (sum, merchantItems) => sum + merchantItems.reduce(
      (merchantTotal, item) => merchantTotal + linePrice(item, merchantItems) * item.quantity,
      0
    ),
    0
  );

  async function placeOrder(merchantId: string, merchantItems: CartItem[]) {
    setSubmitting(true);
    setError(null);
    try {
      const result = await createOrder({
        merchantId,
        items: merchantItems.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          quantity: i.quantity,
          price: i.price,
        })),
        deliveryAddress: address,
        deliveryPhone: phone,
        consumerName: name,
        notes,
      });
      if (result.ok) {
        setSuccess(`Order ${result.orderId?.slice(0, 8) ?? ""} placed successfully.`);
        onOrderPlaced(merchantId);
      } else {
        setError(result.error ?? "Failed to place order.");
      }
    } catch {
      setError("Could not place your order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="card p-8 text-center">
        {success ? (
          <>
            <div className="text-5xl">✅</div>
            <p className="mt-3 text-sm font-semibold text-emerald-700">{success}</p>
            <button onClick={() => setSuccess(null)} className="mt-4 text-sm font-semibold text-slate-700 underline">
              Continue shopping
            </button>
          </>
        ) : (
          <>
            <div className="text-5xl">🛒</div>
            <p className="mt-3 text-sm text-slate-500">Your cart is empty</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">🛒 Your Cart</h2>
        <button
          onClick={onClear}
          className="text-xs font-semibold text-rose-600 hover:text-rose-700"
        >
          Clear all
        </button>
      </div>

      {success && (
        <div role="status" className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
          {success} Other store items remain in your cart.
        </div>
      )}

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.productId}
            className="flex items-center justify-between rounded-lg bg-slate-50 p-2"
          >
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-900">
                {item.productName}
              </div>
              <div className="text-xs text-slate-500">
                ₹{linePrice(item, byMerchant[item.merchantId]).toFixed(0)} × {item.quantity}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    item.quantity > 1
                      ? onUpdateQty(item.productId, item.quantity - 1)
                      : onRemove(item.productId)
                  }
                  className="h-6 w-6 rounded bg-white text-xs"
                >
                  −
                </button>
                <span className="w-6 text-center font-mono text-sm">
                  {item.quantity}
                </span>
                <button
                  onClick={() => onUpdateQty(item.productId, item.quantity + 1)}
                  className="h-6 w-6 rounded bg-white text-xs"
                >
                  +
                </button>
              </div>
              <div className="w-16 text-right font-mono font-bold text-emerald-700">
                ₹{(linePrice(item, byMerchant[item.merchantId]) * item.quantity).toFixed(0)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 border-t border-slate-200 pt-3">
        <div className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span className="text-emerald-700">₹{total.toFixed(2)}</span>
        </div>
        <button
          onClick={() => setShowCheckout(!showCheckout)}
          className="mt-3 w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
        >
          {showCheckout ? "Cancel" : "Proceed to Checkout →"}
        </button>
      </div>

      {showCheckout && (
        <div className="mt-4 space-y-3 rounded-lg bg-slate-50 p-4">
          <h3 className="text-sm font-bold text-slate-900">Delivery Details</h3>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone number"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Delivery address"
            rows={2}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Order notes (optional)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              ✓ {success}
            </div>
          )}

          {/* Place orders per merchant */}
          {Object.entries(byMerchant).map(([merchantId, merchantItems]) => {
            const merchantTotal = merchantItems.reduce(
              (s, i) => s + linePrice(i, merchantItems) * i.quantity,
              0
            );
            return (
              <button
                key={merchantId}
                onClick={() => placeOrder(merchantId, merchantItems)}
                disabled={submitting || !address || !name || !phone}
                className="w-full rounded-lg bg-slate-900 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
              >
                {submitting
                  ? "Placing order..."
                  : `Place Order · ₹${merchantTotal.toFixed(0)} · ${merchantItems.length} items`}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
