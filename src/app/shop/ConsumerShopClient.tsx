"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ConsumerCart } from "@/components/ConsumerCart";
import { useCurrentTime } from "@/lib/useCurrentTime";

type Item = {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  mrp: string | number;
  clearanceDiscountPct: number;
  expiryDate: Date | null;
  quantity: number;
  merchantId: string;
  merchantName: string | null;
  merchantCity: string | null;
  merchantType: "KIRANA" | "MEDICAL";
};

type CartItem = {
  productId: string;
  productName: string;
  merchantId: string;
  quantity: number;
  price: number;
};

const CATEGORY_EMOJIS: Record<string, string> = {
  Dairy: "🥛",
  Biscuits: "🍪",
  Staples: "🌾",
  Snacks: "🍜",
  "Personal Care": "🧴",
  Analgesic: "💊",
  Antihistamine: "💊",
  Diabetic: "💊",
  Vitamins: "💊",
};

export function ConsumerShopClient({
  items,
  cities,
  initialCity,
}: {
  items: Item[];
  cities: string[];
  initialCity: string | null;
}) {
  const currentTime = useCurrentTime();
  const router = useRouter();
  const [city, setCity] = useState(initialCity);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  const filtered = useMemo(() => {
    let list = items;
    if (city) list = list.filter((i) => i.merchantCity === city);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) =>
        (i.name + " " + (i.brand ?? "") + " " + (i.category ?? ""))
          .toLowerCase()
          .includes(q)
      );
    }
    return list;
  }, [items, city, search]);

  function addToCart(item: Item) {
    const finalPrice =
      (parseFloat(String(item.mrp)) * (100 - item.clearanceDiscountPct)) / 100;

    setCart((prev) => {
      const existing = prev.find((c) => c.productId === item.id);
      if (existing) {
        return prev.map((c) =>
          c.productId === item.id
            ? { ...c, quantity: Math.min(item.quantity, c.quantity + 1) }
            : c
        );
      }
      return [
        ...prev,
        {
          productId: item.id,
          productName: item.name,
          merchantId: item.merchantId,
          quantity: 1,
          price: finalPrice,
        },
      ];
    });
    setShowCart(true);
  }

  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-700">
          🛍️ Consumer Marketplace
        </div>
        <h1 className="text-3xl font-black text-slate-900">
          Shop Clearance Deals
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Fresh deals from verified local stores · Save up to 70%
        </p>
      </div>

      {/* Search & Filters */}
      <div className="card mb-6 p-4">
        <div className="grid gap-3 md:grid-cols-12">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search products..."
            className="md:col-span-6 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <select
            value={city ?? ""}
            onChange={(e) => {
              setCity(e.target.value || null);
              router.push(e.target.value ? `?city=${e.target.value}` : "/shop");
            }}
            className="md:col-span-3 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">All cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                📍 {c}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowCart(!showCart)}
            className="md:col-span-3 relative rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            🛒 Cart ({cartCount})
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Products Grid */}
        <div className="lg:col-span-3">
          {filtered.length === 0 ? (
            <div className="card p-10 text-center">
              <div className="text-5xl">🛍️</div>
              <p className="mt-3 text-sm text-slate-500">
                No products match your filters
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((item) => (
                <ProductCard
                  key={item.id}
                  item={item}
                  onAdd={() => addToCart(item)}
                  inCart={cart.some((c) => c.productId === item.id)}
                  currentTime={currentTime}
                />
              ))}
            </div>
          )}
        </div>

        {/* Cart Sidebar */}
        {showCart && (
          <div className="lg:col-span-1">
            <ConsumerCart
              items={cart}
              onUpdateQty={(id, qty) =>
                setCart((prev) =>
                  prev.map((c) => (c.productId === id ? { ...c, quantity: qty } : c))
                )
              }
              onRemove={(id) =>
                setCart((prev) => prev.filter((c) => c.productId !== id))
              }
              onOrderPlaced={(merchantId) =>
                setCart((prev) => prev.filter((item) => item.merchantId !== merchantId))
              }
              onClear={() => setCart([])}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ProductCard({
  item,
  onAdd,
  inCart,
  currentTime,
}: {
  item: Item;
  onAdd: () => void;
  inCart: boolean;
  currentTime: number | null;
}) {
  const mrp = parseFloat(String(item.mrp));
  const finalPrice = (mrp * (100 - item.clearanceDiscountPct)) / 100;
  const days = item.expiryDate && currentTime !== null
    ? Math.ceil((new Date(item.expiryDate).getTime() - currentTime) / 86400000)
    : null;
  const emoji = CATEGORY_EMOJIS[item.category ?? ""] ?? "📦";

  return (
    <div className="card overflow-hidden">
      <div className="relative flex h-28 items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
        <div className="text-5xl">{emoji}</div>
        <span className="absolute left-2 top-2 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
          -{item.clearanceDiscountPct}%
        </span>
        {days !== null && days <= 7 && (
          <span className="absolute right-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
            ⏰ {days}d
          </span>
        )}
      </div>
      <div className="p-3">
        <div className="font-bold text-slate-900 line-clamp-2">{item.name}</div>
        <div className="text-xs text-slate-500">
          {item.brand} · {item.category}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-black text-emerald-700">
            ₹{finalPrice.toFixed(0)}
          </span>
          <span className="text-xs text-slate-400 line-through">₹{mrp.toFixed(0)}</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-600">
          📍 {item.merchantName} · {item.merchantCity}
        </div>
        <button
          onClick={onAdd}
          disabled={item.quantity < 1}
          className={`mt-2 w-full rounded-lg py-1.5 text-xs font-bold ${
            inCart
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-900 text-white hover:bg-slate-800"
          } disabled:opacity-40`}
        >
          {inCart ? "✓ In Cart · Add More" : "+ Add to Cart"}
        </button>
      </div>
    </div>
  );
}
