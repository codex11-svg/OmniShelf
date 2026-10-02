"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Clock3, Eye, Heart, MapPin, Package, Search, ShieldCheck, ShoppingCart, X } from "lucide-react";
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
  imageUrl: string | null;
};

type CartItem = Item & { cartQty: number };

type SortOrder = "expiry" | "discount" | "price-asc" | "price-desc";

type Props = {
  items: Item[];
  cities: string[];
  categories: string[];
  initialCity: string | null;
  initialSearch: string;
  initialCategory: string;
  initialSort: SortOrder;
};

export function MarketplaceClient({
  items,
  cities,
  categories,
  initialCity,
  initialSearch,
  initialCategory,
  initialSort,
}: Props) {
  const currentTime = useCurrentTime();
  const [city, setCity] = useState(initialCity);
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState<string | null>(initialCategory || null);
  const [sort, setSort] = useState<SortOrder>(initialSort);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [viewed, setViewed] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

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
    if (showFavoritesOnly) {
      list = list.filter((i) => favorites.has(i.id));
    }
    list = [...list].sort((a, b) => {
      if (sort === "expiry") {
        const ad = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity;
        const bd = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity;
        return ad - bd;
      }
      if (sort === "discount") return b.clearanceDiscountPct - a.clearanceDiscountPct;
      const aPrice = Number(a.mrp) * (100 - a.clearanceDiscountPct) / 100;
      const bPrice = Number(b.mrp) * (100 - b.clearanceDiscountPct) / 100;
      if (sort === "price-asc") return aPrice - bPrice;
      if (sort === "price-desc") return bPrice - aPrice;
      return 0;
    });
    return list;
  }, [items, city, search, category, sort, showFavoritesOnly, favorites]);

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
        const avgDisc = items.reduce((s, i) => s + i.clearanceDiscountPct, 0) / items.length;
        return { storeName, items, avgDisc };
      });
  }, [filtered]);

  const cartItemCount = cart.reduce((sum, item) => sum + item.cartQty, 0);
  const hasFilters = Boolean(city || category || search || showFavoritesOnly);

  function clearFilters() {
    setCity(null);
    setCategory(null);
    setSearch("");
    setShowFavoritesOnly(false);
  }

  return (
    <div className="space-y-5">
      {/* Search / filter / sort bar */}
      <div className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_180px_180px_180px_auto]">
          <label className="relative block">
            <span className="sr-only">Search products</span>
            <Search aria-hidden="true" size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products, brands, categories"
              className="min-h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm"
            />
          </label>
          <select
            value={city ?? ""}
            onChange={(e) => setCity(e.target.value || null)}
            aria-label="Filter by city"
            className="min-h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="">All cities</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={category ?? ""}
            onChange={(e) => setCategory(e.target.value || null)}
            aria-label="Filter by category"
            className="min-h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "expiry" | "discount" | "price-asc" | "price-desc")}
            aria-label="Sort products"
            className="min-h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="expiry">Soonest expiry</option>
            <option value="discount">Largest discount</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
          <button
            onClick={() => setCartOpen(true)}
            aria-label={`Open cart, ${cartItemCount} items`}
            className="relative inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900"
          >
            <ShoppingCart aria-hidden="true" size={17} />
            Cart <span>({cartItemCount})</span>
            {cartItemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#b45e42] px-1 text-[10px] font-bold text-white">
                {cartItemCount}
              </span>
            )}
          </button>
        </div>

        {/* Active filters */}
        {hasFilters && (
          <div className="mt-3 flex flex-wrap gap-2">
            {city && (
              <button onClick={() => setCity(null)} className="chip gap-1 bg-slate-100 text-slate-700 hover:bg-slate-200">
                <MapPin aria-hidden="true" size={12} /> {city} <X aria-hidden="true" size={12} />
              </button>
            )}
            {category && (
              <button onClick={() => setCategory(null)} className="chip gap-1 bg-slate-100 text-slate-700 hover:bg-slate-200">
                {category} <X aria-hidden="true" size={12} />
              </button>
            )}
            {search && (
              <button onClick={() => setSearch("")} className="chip gap-1 bg-slate-100 text-slate-700 hover:bg-slate-200">
                &quot;{search}&quot; <X aria-hidden="true" size={12} />
              </button>
            )}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Categories</span>
          <button
            onClick={() => setCategory(null)}
            className={`chip rounded-md px-2.5 py-1.5 ${!category ? "bg-emerald-800 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            All ({filtered.length})
          </button>
          <button
            onClick={() => setShowFavoritesOnly((value) => !value)}
            aria-pressed={showFavoritesOnly}
            className={`chip rounded-md px-2.5 py-1.5 ${showFavoritesOnly ? "bg-[#b45e42] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            <Heart aria-hidden="true" size={13} fill={showFavoritesOnly ? "currentColor" : "none"} />
            Saved ({favorites.size})
          </button>
          {categories.slice(0, 10).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c === category ? null : c)}
              className={`chip rounded-md px-2.5 py-1.5 ${category === c ? "bg-emerald-800 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
            >
              {c}
            </button>
          ))}
          {hasFilters && (
            <button onClick={clearFilters} className="ml-auto rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900">
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Bundle deals banner */}
      {bundleDeals.length > 0 && !category && !search && (
        <div className="rounded-lg border border-[#d9e5dc] bg-[#edf3ee] p-4 text-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase text-emerald-800">Bundle pricing</div>
              <div className="mt-1 text-sm font-semibold">Buy two or more items from one store to save an additional 5%.</div>
            </div>
            <span className="chip hidden border border-emerald-200 bg-white text-emerald-800 sm:inline-flex">Applied automatically</span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {bundleDeals.map((b, i) => (
              <div key={i} className="rounded-md border border-emerald-100 bg-white px-3 py-2 text-xs">
                <div className="font-bold">{b.storeName}</div>
                <div className="mt-0.5 text-slate-600">{b.items.length} items · average discount {b.avgDisc.toFixed(0)}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recently viewed */}
      {viewed.size > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-600">
            <Eye aria-hidden="true" size={15} /> Recently viewed
          </div>
          <div className="flex gap-2 overflow-auto">
            {items.filter((i) => viewed.has(i.id)).slice(-6).map((i) => (
              <button
                key={i.id}
                onClick={() => { viewItem(i.id); setSelectedItem(i); }}
                className="flex-shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-xs hover:bg-slate-100"
              >
                <div className="truncate font-semibold">{i.name}</div>
                <div className="text-[10px] text-slate-500">₹{((parseFloat(String(i.mrp)) * (100 - i.clearanceDiscountPct)) / 100).toFixed(0)}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <p className="text-sm font-semibold text-slate-900">
          {filtered.length} {filtered.length === 1 ? "product" : "products"}
          {hasFilters && <span className="ml-1 font-normal text-slate-500">of {items.length}</span>}
        </p>
        <p className="text-xs text-slate-500">Prices shown after listed discount</p>
      </div>

      {/* Items grid */}
      {filtered.length === 0 ? (
        <div className="card px-6 py-12 text-center sm:px-10">
          {showFavoritesOnly && favorites.size === 0 ? (
            <Heart aria-hidden="true" size={28} className="mx-auto text-[#b45e42]" />
          ) : (
            <Package aria-hidden="true" size={28} className="mx-auto text-slate-400" />
          )}
          <div className="mt-3 text-base font-semibold text-slate-900">
            {showFavoritesOnly && favorites.size === 0
              ? "No saved products yet"
              : items.length === 0
                ? "No clearance listings yet"
                : "No listings match these filters"}
          </div>
          <div className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-600">
            {showFavoritesOnly && favorites.size === 0
              ? "Save a product with the heart button and it will be easy to find here."
              : items.length === 0
                ? "Fresh local deals will show up here as verified stores add their clearance stock."
                : "Try a different search or remove a filter to see more local deals."}
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="mt-5 rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900">
              {showFavoritesOnly && favorites.size === 0 ? "Browse all products" : "Clear filters"}
            </button>
          )}
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
              onView={() => { viewItem(i.id); setSelectedItem(i); }}
              currentTime={currentTime}
            />
          ))}
        </div>
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <div className="cart-backdrop fixed inset-0 z-50 flex justify-end bg-slate-950/35">
          <button className="absolute inset-0 cursor-default" aria-label="Close cart" onClick={() => setCartOpen(false)} />
          <div className="cart-drawer relative flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <h3 className="flex items-center gap-2 text-base font-bold text-slate-900"><ShoppingCart aria-hidden="true" size={18} /> Your cart</h3>
              <button onClick={() => setCartOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Close cart">
                <X aria-hidden="true" size={18} />
              </button>
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

      {selectedItem && (
        <div className="cart-backdrop fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-slate-950/45 p-4" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedItem(null);
        }}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-quick-view-title"
            className="page-enter relative my-auto w-full max-w-lg overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Local clearance deal</div>
                <h2 id="product-quick-view-title" className="mt-1 text-xl font-bold text-slate-900">{selectedItem.name}</h2>
                <p className="mt-1 text-sm text-slate-600">{[selectedItem.brand, selectedItem.category].filter(Boolean).join(" · ") || "General"}</p>
              </div>
              <button onClick={() => setSelectedItem(null)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Close product details">
                <X aria-hidden="true" size={18} />
              </button>
            </div>
            <div className="p-5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-2xl font-bold text-emerald-800">₹{(Number(selectedItem.mrp) * (100 - selectedItem.clearanceDiscountPct) / 100).toFixed(0)}</span>
                <span className="text-sm text-slate-400 line-through">₹{Number(selectedItem.mrp).toFixed(0)}</span>
                <span className="rounded-md bg-[#f8eee9] px-2 py-1 text-xs font-semibold text-[#984b35]">Save {selectedItem.clearanceDiscountPct}%</span>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-slate-100 py-4 text-sm">
                <dt className="text-slate-500">Store</dt><dd className="text-right font-medium text-slate-900">{selectedItem.merchantName}{selectedItem.merchantCity ? ` · ${selectedItem.merchantCity}` : ""}</dd>
                <dt className="text-slate-500">Batch</dt><dd className="text-right font-mono text-slate-800">{selectedItem.batchNumber ?? "Not listed"}</dd>
                <dt className="text-slate-500">Expiry</dt><dd className="text-right text-slate-800">{formatDate(selectedItem.expiryDate)}</dd>
                <dt className="text-slate-500">Available</dt><dd className="text-right text-slate-800">{selectedItem.quantity} units</dd>
              </dl>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600"><ShieldCheck aria-hidden="true" size={15} className="text-emerald-800" /> Verified neighborhood store</span>
                <button onClick={() => addToCart(selectedItem)} className="inline-flex items-center gap-2 rounded-md bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900">
                  <ShoppingCart aria-hidden="true" size={16} /> Add to cart
                </button>
              </div>
              {selectedItem.requiresPrescription && <p className="mt-3 text-xs text-amber-800">Prescription required. Online ordering may not be available.</p>}
            </div>
          </section>
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

  return (
    <article className="marketplace-card overflow-hidden rounded-lg border border-slate-200 bg-white transition-shadow hover:shadow-md">
      <div className="relative">
        <button
          type="button"
          className="flex h-36 w-full items-center justify-center bg-[#f3f6f2] text-emerald-800 hover:bg-[#eaf0e9]"
          onClick={onView}
          aria-label={`View ${item.name}`}
        >
          {item.imageUrl ? (
            <Image src={item.imageUrl} alt="" fill unoptimized sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" className="object-cover" />
          ) : (
            <Package aria-hidden="true" size={32} strokeWidth={1.4} />
          )}
        </button>
        <span className="absolute left-2 top-2 rounded-md bg-[#b45e42] px-2 py-1 text-[11px] font-semibold text-white">
          -{item.clearanceDiscountPct}%
        </span>
        {item.merchantType === "MEDICAL" && (
          <span className="absolute right-2 top-2 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700">Pharmacy</span>
        )}
        {urgent && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-900">
            <Clock3 aria-hidden="true" size={12} /> {days}d left
          </span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onFav(); }}
          className={`absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white shadow-sm ${isFav ? "text-[#b45e42]" : "text-slate-500 hover:text-slate-900"}`}
          aria-label={isFav ? `Remove ${item.name} from favorites` : `Add ${item.name} to favorites`}
          aria-pressed={isFav}
        >
          <Heart aria-hidden="true" size={17} fill={isFav ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="p-3.5">
        <div className="truncate text-sm font-semibold text-slate-900">{item.name}</div>
        <div className="mt-0.5 truncate text-xs text-slate-500">{[item.brand, item.category].filter(Boolean).join(" · ") || "General"}</div>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-lg font-bold text-emerald-800">₹{finalPrice.toFixed(0)}</span>
          <span className="text-xs text-slate-400 line-through">₹{mrp.toFixed(0)}</span>
          <span className="ml-auto text-[11px] font-semibold text-emerald-800">Save ₹{(mrp - finalPrice).toFixed(0)}</span>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-y-1 border-t border-slate-100 pt-2 text-[11px]">
          <dt className="text-slate-500">Batch</dt><dd className="truncate text-right font-mono text-slate-700">{item.batchNumber ?? "—"}</dd>
          <dt className="text-slate-500">Expires</dt><dd className="text-right text-slate-700">{formatDate(item.expiryDate)}{days !== null && ` · ${days}d`}</dd>
          <dt className="text-slate-500">Available</dt><dd className="text-right text-slate-700">{item.quantity} units</dd>
        </dl>
        <div className="mt-3 flex min-w-0 items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-slate-600">
            <ShieldCheck aria-label="Verified store" size={15} className="shrink-0 text-emerald-800" />
            <span className="truncate font-medium text-slate-800">{item.merchantName}</span>
            {item.merchantCity && <span className="hidden shrink-0 text-slate-500 sm:inline">· {item.merchantCity}</span>}
          </div>
          <button
            onClick={onAdd}
            className="shrink-0 rounded-md bg-emerald-800 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-900"
          >
            Add to cart
          </button>
        </div>
      </div>
    </article>
  );
}
