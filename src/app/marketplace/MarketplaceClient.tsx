"use client";

import { useMemo, useState } from "react";
import { ConsumerCart } from "@/components/ConsumerCart";
import { useCurrentTime } from "@/lib/useCurrentTime";
import { formatDate } from "@/lib/formatDate";

type Item = {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  mrp: string | number;
  clearanceDiscountPct: number;
  expiryDate: Date | null;
  batchNumber: string | null;
  quantity: number;
  merchantId: string;
  merchantName: string | null;
  merchantCity: string | null;
  merchantType: "KIRANA" | "MEDICAL";
  scheduleClass: string | null;
  requiresPrescription: boolean;
};

type CartItem = Item & { cartQty: number };

type Props = {
  items: Item[];
  cities: string[];
  categories: string[];
  initialCity: string | null;
};

const EMOJI_BY_CATEGORY: Record<string, string> = {
  Dairy: "🥛", Biscuits: "🍪", Staples: "🌾", Snacks: "🍜",
  "Personal Care": "🧴", Analgesic: "💊", Antihistamine: "💊",
  Antibiotic: "💊", Cardiac: "💊", Psychiatric: "💊", Diabetic: "💊",
  Rehydration: "💧", Dermatology: "🧴", Vitamins: "💊",
};

const CATEGORY_GROUPS: Record<string, string[]> = {
  "🛒 Groceries": ["Dairy", "Biscuits", "Staples", "Snacks", "Personal Care"],
  "💊 Pharma": ["Analgesic", "Antihistamine", "Antibiotic", "Cardiac", "Psychiatric", "Diabetic", "Rehydration", "Dermatology", "Vitamins"],
};

export function MarketplaceClient({ items, cities, categories, initialCity }: Props) {
  const currentTime = useCurrentTime();
  const [city, setCity] = useState(initialCity);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<"expiry" | "discount" | "price-asc" | "price-desc">("expiry");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [cartOpen, setCartOpen] = useState(false);
  const [viewed, setViewed] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let list = items.filter((i) => city ? i.merchantCity === city : true);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) =>
        (i.name + " " + (i.brand ?? "") + " " + (i.category ?? "")).toLowerCase().includes(q)
      );
    }
    if (category) {
      list = list.filter((i) => i.category === category);
    }
    list = [...list].sort((a, b) => {
      if (sort === "expiry") {
        const ad = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity;
        const bd = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity;
        return ad - bd;
      }
      if (sort === "discount") return b.clearanceDiscountPct - a.clearanceDiscountPct;
      if (sort === "price-asc") return parseFloat(String(a.mrp)) - parseFloat(String(b.mrp));
      if (sort === "price-desc") return parseFloat(String(b.mrp)) - parseFloat(String(a.mrp));
      return 0;
    });
    return list;
  }, [items, city, search, category, sort]);

  function addToCart(item: Item) {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        return prev.map((c) => c.id === item.id ? { ...c, cartQty: Math.min(item.quantity, c.cartQty + 1) } : c);
      }
      return [...prev, { ...item, cartQty: 1 }];
    });
  }

  function toggleFavorite(id: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function viewItem(id: string) {
    setViewed((prev) => new Set(prev).add(id));
  }

  // Group items by category for browsing
  const byCategory = useMemo(() => {
    const map: Record<string, Item[]> = {};
    for (const i of filtered) {
      const cat = i.category ?? "Other";
      (map[cat] ??= []).push(i);
    }
    return map;
  }, [filtered]);

  // Bundle deals (items from same store)
  const bundleDeals = useMemo(() => {
    const byStore: Record<string, Item[]> = {};
    for (const i of filtered) {
      const key = i.merchantId;
      (byStore[key] ??= []).push(i);
    }
    return Object.entries(byStore)
      .filter(([, items]) => items.length >= 2)
      .slice(0, 3)
      .map(([_, items]) => {
        const storeName = items[0].merchantName;
        const totalMrp = items.reduce((s, i) => s + parseFloat(String(i.mrp)), 0);
        const avgDisc = items.reduce((s, i) => s + i.clearanceDiscountPct, 0) / items.length;
        return { storeName, items, totalMrp, avgDisc };
      });
  }, [filtered]);

  return (
    <div className="space-y-6">
      {/* Search / filter / sort bar */}
      <div className="card p-4">
        <div className="grid gap-3 md:grid-cols-12">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search by product, brand, or category…"
            className="md:col-span-4 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <select
            value={city ?? ""}
            onChange={(e) => setCity(e.target.value || null)}
            className="md:col-span-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">All cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>📍 {c}</option>
            ))}
          </select>
          <select
            value={category ?? ""}
            onChange={(e) => setCategory(e.target.value || null)}
            className="md:col-span-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "expiry" | "discount" | "price-asc" | "price-desc")}
            className="md:col-span-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="expiry">Sort: Expiry ↑</option>
            <option value="discount">Sort: Discount ↓</option>
            <option value="price-asc">Sort: Price ↑</option>
            <option value="price-desc">Sort: Price ↓</option>
          </select>
          <button
            onClick={() => setCartOpen(true)}
            className="md:col-span-2 relative rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            🛒 Cart ({cart.length})
            {cart.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white">
                {cart.reduce((s, c) => s + c.cartQty, 0)}
              </span>
            )}
          </button>
        </div>

        {/* Active filters */}
        {(city || category || search) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {city && (
              <button onClick={() => setCity(null)} className="chip bg-indigo-100 text-indigo-700">
                📍 {city} ×
              </button>
            )}
            {category && (
              <button onClick={() => setCategory(null)} className="chip bg-violet-100 text-violet-700">
                🏷️ {category} ×
              </button>
            )}
            {search && (
              <button onClick={() => setSearch("")} className="chip bg-amber-100 text-amber-700">
                🔍 &quot;{search}&quot; ×
              </button>
            )}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Browse:</span>
          <button
            onClick={() => setCategory(null)}
            className={`chip ${!category ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            All ({filtered.length})
          </button>
          {categories.slice(0, 10).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c === category ? null : c)}
              className={`chip ${category === c ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
            >
              {EMOJI_BY_CATEGORY[c] ?? "📦"} {c}
            </button>
          ))}
        </div>
      </div>

      {/* Bundle deals banner */}
      {bundleDeals.length > 0 && !category && !search && (
        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest opacity-80">🎁 Bundle deals</div>
              <div className="mt-0.5 text-lg font-bold">Buy 2 or more different items from one store and save extra 5%</div>
            </div>
            <span className="chip bg-white/20 text-white">Applied automatically</span>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {bundleDeals.map((b, i) => (
              <div key={i} className="rounded-xl bg-white/10 p-2 text-xs backdrop-blur">
                <div className="font-bold">{b.storeName}</div>
                <div className="opacity-90">{b.items.length} items · avg -{b.avgDisc.toFixed(0)}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recently viewed */}
      {viewed.size > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">👁️ Recently viewed</div>
          <div className="flex gap-2 overflow-auto">
            {items.filter((i) => viewed.has(i.id)).slice(-6).map((i) => (
              <button
                key={i.id}
                onClick={() => viewItem(i.id)}
                className="flex-shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-xs hover:bg-slate-100"
              >
                <div className="truncate font-semibold">{i.name}</div>
                <div className="text-[10px] text-slate-500">₹{((parseFloat(String(i.mrp)) * (100 - i.clearanceDiscountPct)) / 100).toFixed(0)}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Items grid */}
      {filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-5xl">🛍️</div>
          <div className="mt-3 text-lg font-bold text-slate-900">No clearance listings match your filters</div>
          <div className="mt-1 text-sm text-slate-600">
            Try clearing filters or checking a different city.
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((i) => (
            <MarketplaceCard
              key={i.id}
              item={i}
              onAdd={() => addToCart(i)}
              onFav={() => toggleFavorite(i.id)}
              isFav={favorites.has(i.id)}
              onView={() => viewItem(i.id)}
              currentTime={currentTime}
            />
          ))}
        </div>
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="flex w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <h3 className="text-lg font-bold text-slate-900">🛒 Your cart</h3>
              <button onClick={() => setCartOpen(false)} className="text-2xl text-slate-400 hover:text-slate-700">×</button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <ConsumerCart
                items={cart.map((item) => ({
                  productId: item.id,
                  productName: item.name,
                  merchantId: item.merchantId,
                  quantity: item.cartQty,
                  price: (parseFloat(String(item.mrp)) * (100 - item.clearanceDiscountPct)) / 100,
                }))}
                onUpdateQty={(productId, quantity) => setCart((previous) => previous.map((item) =>
                  item.id === productId ? { ...item, cartQty: quantity } : item
                ))}
                onRemove={(productId) => setCart((previous) => previous.filter((item) => item.id !== productId))}
                onOrderPlaced={(merchantId) => setCart((previous) => previous.filter((item) => item.merchantId !== merchantId))}
                onClear={() => setCart([])}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function MarketplaceCard({
  item, onAdd, onFav, isFav, onView, currentTime,
}: {
  item: Item; onAdd: () => void; onFav: () => void; isFav: boolean;
  onView: () => void;
  currentTime: number | null;
}) {
  const mrp = parseFloat(String(item.mrp));
  const finalPrice = (mrp * (100 - item.clearanceDiscountPct)) / 100;
  const days = item.expiryDate && currentTime !== null
    ? Math.ceil((new Date(item.expiryDate).getTime() - currentTime) / 86400000)
    : null;
  const urgent = days !== null && days <= 7;
  const emoji = EMOJI_BY_CATEGORY[item.category ?? ""] ?? "📦";

  return (
    <div className="card overflow-hidden">
      <div
        className="relative flex h-32 cursor-pointer items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200"
        onClick={onView}
      >
        <div className="text-5xl">{emoji}</div>
        <span className="absolute left-2 top-2 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
          -{item.clearanceDiscountPct}%
        </span>
        {item.merchantType === "MEDICAL" && (
          <span className="absolute right-2 top-2 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">💊</span>
        )}
        {urgent && (
          <span className="absolute left-2 bottom-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
            ⏰ {days}d left
          </span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onFav(); }}
          className={`absolute right-2 bottom-2 h-7 w-7 rounded-full bg-white text-sm shadow hover:scale-110 ${isFav ? "text-rose-600" : "text-slate-400"}`}
          aria-label="Favorite"
        >
          {isFav ? "♥" : "♡"}
        </button>
      </div>
      <div className="p-4">
        <div className="font-bold text-slate-900">{item.name}</div>
        <div className="text-xs text-slate-500">{item.brand} · {item.category}</div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-black text-emerald-700">₹{finalPrice.toFixed(0)}</span>
          <span className="text-xs text-slate-400 line-through">₹{mrp.toFixed(0)}</span>
          <span className="ml-auto chip bg-emerald-50 text-emerald-700">Save ₹{(mrp - finalPrice).toFixed(0)}</span>
        </div>
        <div className="mt-2 space-y-0.5 text-[11px] text-slate-600">
          <div>Batch: <span className="font-mono">{item.batchNumber ?? "—"}</span></div>
          <div>
            Expires: {formatDate(item.expiryDate)}
            {days !== null && <span className="ml-1">({days}d)</span>}
          </div>
          <div>Stock: {item.quantity} · 📍 {item.merchantCity}</div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-[11px] text-slate-600">
            <span className="font-semibold text-slate-800">{item.merchantName}</span>
            <span className="text-emerald-600">✓</span>
          </div>
          <button
            onClick={onAdd}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Add +
          </button>
        </div>
      </div>
    </div>
  );
}
