import { redirect } from "next/navigation";
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
  const [items, cities] = await Promise.all([listMarketplace(city), listMarketplaceCities()]);
  const session = await getSession();

  // Collect unique categories
  const categories = Array.from(new Set(items.map((i) => i.category).filter(Boolean))) as string[];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-100 to-rose-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-rose-700">
            🏷️ Public B2C Clearance Marketplace
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Near-expiry deals from verified stores</h1>
          <p className="mt-1 text-sm text-slate-600">
            Every listing here is pushed by a KYC-verified Kirana or pharmacy and filtered by
            platform-enforced compliance rules (Schedule H/X drugs are <b>auto-blocked</b>).
          </p>
        </div>
      </div>

      {session?.role === "VENDOR_OWNER" && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <span>
            You&apos;re signed in as <b>{session.merchantName}</b>. Manage your own clearance listings
            from your vendor console.
          </span>
          <Link href="/vendor" className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
            Go to console →
          </Link>
        </div>
      )}

      <MarketplaceClient items={items} cities={cities} categories={categories} initialCity={city} />

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <div className="text-xs font-bold uppercase tracking-widest text-emerald-600">Compliance</div>
          <div className="mt-1 text-sm text-slate-700">
            Schedule H and Schedule X drugs are hard-blocked from the marketplace by admin switches — even if a vendor tries to push them.
          </div>
        </div>
        <div className="card p-5">
          <div className="text-xs font-bold uppercase tracking-widest text-rose-600">Expiry honesty</div>
          <div className="mt-1 text-sm text-slate-700">
            Every card shows the exact batch number and expiry date so customers can buy with full transparency.
          </div>
        </div>
        <div className="card p-5">
          <div className="text-xs font-bold uppercase tracking-widest text-indigo-600">Verified stores</div>
          <div className="mt-1 text-sm text-slate-700">
            Only stores that passed KYC + license verification can push items — you&apos;ll see ✅ on every listing.
          </div>
        </div>
      </div>
    </div>
  );
}
