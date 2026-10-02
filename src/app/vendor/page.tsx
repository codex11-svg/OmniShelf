import { redirect } from "next/navigation";
import { AlertTriangle, Pill, Store, Tag } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  listMyProducts,
  listMyPredictions,
  getMySalesSeries,
  getTopProducts,
  listMyStaff,
  listMySuppliers,
  listMyPurchaseOrders,
  listMyNotificationRules,
  listMyNotes,
  listMyReturns,
  listMyAuditLogs,
  listMyActivityFeed,
  getMyStoreSettings,
  listMyApiKeys,
  listAnnouncements,
} from "@/lib/actions";
import { VendorTabs } from "./VendorTabs";

export const dynamic = "force-dynamic";

export default async function VendorPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "VENDOR_OWNER" && session.role !== "VENDOR_CLERK") redirect("/admin");

  const isOwner = session.role === "VENDOR_OWNER";

  // Clerks can only see inventory. Owner sees everything.
  const [
    products, predictions, series, topProducts, staff,
    suppliers, purchaseOrders, notificationRules, notes, returns,
    auditLogs, activityFeed, storeSettings, apiKeys, announcements,
  ] = await Promise.all([
    listMyProducts(),
    isOwner ? listMyPredictions() : Promise.resolve([]),
    isOwner ? getMySalesSeries() : Promise.resolve([]),
    isOwner ? getTopProducts() : Promise.resolve([]),
    isOwner ? listMyStaff() : Promise.resolve([]),
    isOwner ? listMySuppliers() : Promise.resolve([]),
    isOwner ? listMyPurchaseOrders() : Promise.resolve([]),
    isOwner ? listMyNotificationRules() : Promise.resolve([]),
    listMyNotes(),
    isOwner ? listMyReturns() : Promise.resolve([]),
    isOwner ? listMyAuditLogs() : Promise.resolve([]),
    listMyActivityFeed(),
    isOwner ? getMyStoreSettings() : Promise.resolve(null),
    isOwner ? listMyApiKeys() : Promise.resolve([]),
    listAnnouncements(session.merchantType),
  ]);

  // Compute some stats
  const totalItems = products.length;
  const totalUnits = products.reduce((s, p) => s + (p.quantity ?? 0), 0);
  const totalValue = products.reduce(
    (s, p) => s + parseFloat(String(p.mrp)) * (p.quantity ?? 0),
    0
  );
  const onMarketplace = products.filter((p) => p.pushToMarketplace).length;
  const lowStock = products.filter((p) => (p.quantity ?? 0) < (p.reorderThreshold ?? 10)).length;

  const last30Revenue = series.reduce((s, d) => s + d.revenue, 0);
  const last30Orders = series.reduce((s, d) => s + d.orders, 0);

  return (
    <div className="dashboard-enter mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase text-emerald-800">
            <Store aria-hidden="true" size={14} /> Vendor workspace · {isOwner ? "Store owner" : "Billing clerk"}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {session.merchantName ?? "Your store"}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span className={`chip ${session.merchantType === "MEDICAL" ? "bg-rose-50 text-rose-800" : "bg-blue-50 text-blue-800"}`}>
              {session.merchantType === "MEDICAL" ? <Pill aria-hidden="true" size={12} /> : <Store aria-hidden="true" size={12} />}
              {session.merchantType === "MEDICAL" ? "Pharmacy" : "Grocery store"}
            </span>
            {session.merchantKycStatus !== "APPROVED" && (
              <span className="chip bg-amber-50 text-amber-900"><AlertTriangle aria-hidden="true" size={12} /> KYC: {session.merchantKycStatus}</span>
            )}
            {!isOwner && (
              <span className="chip bg-slate-100 text-slate-700">
                Access: {session.accessLevel === "SCAN_ONLY" ? "Scan-only" : "Billing"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick stats — visible to both owner and clerk */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="SKUs" value={totalItems} tone="indigo" />
        <StatCard label="Units in stock" value={totalUnits} tone="blue" />
        <StatCard label="Shelf value" value={`₹${Math.round(totalValue).toLocaleString("en-IN")}`} tone="emerald" />
        <StatCard
          label={isOwner ? "Last 30d revenue" : "Store health"}
          value={isOwner ? `₹${Math.round(last30Revenue).toLocaleString("en-IN")}` : `${last30Orders} orders / 30d`}
          tone="violet"
        />
      </div>

      {/* Warning strip — both roles */}
      {(lowStock > 0 || onMarketplace > 0) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {lowStock > 0 && isOwner && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">
              <AlertTriangle aria-hidden="true" size={15} />
              {lowStock} items below reorder threshold
            </div>
          )}
          {onMarketplace > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
              <Tag aria-hidden="true" size={15} />
              {onMarketplace} items on public clearance
            </div>
          )}
        </div>
      )}

      <VendorTabs
        products={products}
        predictions={predictions}
        series={series}
        topProducts={topProducts}
        staff={staff}
        suppliers={suppliers}
        purchaseOrders={purchaseOrders}
        notificationRules={notificationRules}
        notes={notes}
        returns={returns}
        auditLogs={auditLogs}
        activityFeed={activityFeed}
        storeSettings={storeSettings}
        apiKeys={apiKeys}
        announcements={announcements}
        isOwner={isOwner}
        merchantType={session.merchantType ?? "KIRANA"}
        sessionName={session.name}
      />
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string | number; tone: "indigo" | "blue" | "emerald" | "violet" }) {
  const accent = {
    indigo: "border-t-slate-400",
    blue: "border-t-blue-700",
    emerald: "border-t-emerald-700",
    violet: "border-t-[#b45e42]",
  }[tone];
  return (
    <div className={`card border-t-2 p-4 ${accent}`}>
      <div className="text-xs font-medium text-slate-600">{label}</div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{value}</div>
    </div>
  );
}
