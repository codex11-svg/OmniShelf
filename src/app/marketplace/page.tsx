import Link from "next/link";
import { listMarketplace, listMarketplaceCities } from "@/lib/actions";
import { getSession } from "@/lib/auth";
import { MarketplaceClient } from "./MarketplaceClient";

export const dynamic = "force-dynamic";

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; q?: string; sort?: string; category?: string }>;
}) {
  const sp = await searchParams;
  const city = sp.city ?? null;
  const sort = ["expiry", "discount", "price-asc", "price-desc"].includes(sp.sort ?? "")
    ? sp.sort as "expiry" | "discount" | "price-asc" | "price-desc"
    : "expiry";
  const [items, cities] = await Promise.all([listMarketplace(), listMarketplaceCities()]);
  const session = await getSession();

  // Collect unique categories
  const categories = Array.from(new Set(items.map((i) => i.category).filter(Boolean))) as string[];

  return (
    <div className="page-enter mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase text-emerald-800">
            Verified neighborhood stores
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Shop local clearance</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Find reduced-price grocery and pharmacy products nearby. Batch and expiry details are shown on every listing.
          </p>
        </div>
      </div>

      {session?.role === "VENDOR_OWNER" && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          <span>
            You&apos;re signed in as <b>{session.merchantName}</b>. Manage your own clearance listings
            from your vendor console.
          </span>
          <Link href="/vendor" className="rounded-md bg-emerald-800 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-900">
            Manage listings
          </Link>
        </div>
      )}

      <MarketplaceClient
        items={items}
        cities={cities}
        categories={categories}
        initialCity={city}
        initialSearch={sp.q ?? ""}
        initialCategory={sp.category ?? ""}
        initialSort={sort}
      />

      <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-200 py-4 text-xs text-slate-600">
        <span>Verified stores</span>
        <span>Batch and expiry shown on every listing</span>
        <span>Prescription medicines excluded from online orders</span>
      </div>
    </div>
  );
}
