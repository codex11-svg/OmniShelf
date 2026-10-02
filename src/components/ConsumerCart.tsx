"use client";

import { useState } from "react";
import { CheckCircle2, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
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
      <div className="py-10 text-center">
        {success ? (
          <>
            <CheckCircle2 aria-hidden="true" size={28} className="mx-auto text-emerald-800" />
            <p className="mt-3 text-sm font-semibold text-emerald-700">{success}</p>
            <button onClick={() => setSuccess(null)} className="mt-4 text-sm font-semibold text-slate-700 underline">
              Continue shopping
            </button>
          </>
        ) : (
          <>
            <ShoppingCart aria-hidden="true" size={28} className="mx-auto text-slate-400" />
            <p className="mt-3 text-sm text-slate-500">Your cart is empty</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <ShoppingCart aria-hidden="true" size={18} /> Your cart
        </h2>
        <button
          onClick={onClear}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          <Trash2 aria-hidden="true" size={14} /> Clear cart
        </button>
      </div>

      {success && (
        <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
          {success} Other store items remain in your cart.
        </div>
      )}

      <div className="divide-y divide-slate-200 border-y border-slate-200">
        {items.map((item) => (
          <div
            key={item.productId}
            className="flex items-center justify-between gap-3 py-3"
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
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                  aria-label={`Decrease quantity of ${item.productName}`}
                >
                  {item.quantity > 1 ? <Minus aria-hidden="true" size={14} /> : <Trash2 aria-hidden="true" size={14} />}
                </button>
                <span className="w-6 text-center font-mono text-sm">
                  {item.quantity}
                </span>
                <button
                  onClick={() => onUpdateQty(item.productId, item.quantity + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                  aria-label={`Increase quantity of ${item.productName}`}
                >
                  <Plus aria-hidden="true" size={14} />
                </button>
              </div>
              <div className="w-16 text-right font-mono font-bold text-emerald-700">
                ₹{(linePrice(item, byMerchant[item.merchantId]) * item.quantity).toFixed(0)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 z-10 -mx-1 mt-4 border-t border-slate-200 bg-white/95 px-1 pb-2 pt-3 backdrop-blur">
        <div className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span className="text-emerald-700">₹{total.toFixed(2)}</span>
        </div>
        <button
          onClick={() => setShowCheckout(!showCheckout)}
          className="mt-3 w-full rounded-md bg-emerald-800 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900"
        >
          {showCheckout ? "Hide checkout" : "Continue to checkout"}
        </button>
      </div>

      {showCheckout && (
        <div className="space-y-3 border-t border-slate-200 pt-4">
          <h3 className="text-sm font-semibold text-slate-900">Delivery details</h3>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            aria-label="Your name"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone number"
            aria-label="Phone number"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Delivery address"
            aria-label="Delivery address"
            rows={2}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Order notes (optional)"
            aria-label="Order notes (optional)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />

          {error && (
            <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
              {error}
            </div>
          )}

          {success && (
            <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              {success}
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
                className="w-full rounded-md bg-emerald-800 py-2.5 text-xs font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-40"
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
