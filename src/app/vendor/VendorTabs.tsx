"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell, Boxes, CreditCard, FileBarChart,
  LayoutDashboard, ScanLine, Settings, ShoppingBag, StickyNote, Tag,
  TrendingUp, Truck, Users,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { WorkspaceTabs } from "@/components/WorkspaceTabs";
import { useCurrentTime } from "@/lib/useCurrentTime";
import { formatDate, formatDateTime } from "@/lib/formatDate";
import {
  updateProductClearance,
  updateStock,
  scanBarcode,
  addStaff,
  removeStaff,
  completePosSale,
  addInventoryProduct,
  createPurchaseOrder,
} from "@/lib/actions";
import type { products } from "@/db/schema";
import { SuppliersTab } from "./tabs/SuppliersTab";
import { ApiKeysPanel } from "./tabs/ApiKeysPanel";

type Product = typeof products.$inferSelect;
type SeriesPoint = { day: string; revenue: number; orders: number; units: number };
type TopProduct = {
  productId: string | null;
  name: string;
  category: string;
  brand: string;
  units: number;
  revenue: number;
};
type Prediction = {
  id: string;
  productId: string | null;
  forecastQty: number;
  confidence: string | number;
  reason: string;
  productName: string | null;
  costPrice: string | number | null;
  category: string | null;
  brand: string | null;
  currentStock: number | null;
  reorderThreshold: number | null;
  expiryDate: Date | null;
};
type Staff = {
  id: string;
  name: string;
  phone: string | null;
  email?: string | null;
  role: string;
  accessLevel: string | null;
  passkeyEnabled: boolean;
};

type Supplier = {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  category: string | null;
  leadTimeDays: number | null;
  rating: string | number | null;
  notes: string | null;
};
type PO = {
  id: string;
  status: string;
  totalAmount: string | number;
  itemCount: number;
  notes: string | null;
  expectedDate: Date | null;
  createdAt: Date;
  supplierName: string | null;
};
type NotificationRule = {
  id: string;
  channel: string;
  eventType: string;
  enabled: boolean;
  threshold: number | null;
  scheduleTime: string | null;
  scheduleDays: string | null;
  recipientPhone: string | null;
  recipientEmail: string | null;
  messageTemplate: string | null;
};
type Note = {
  id: string;
  authorName: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: Date;
};
type ReturnRow = {
  id: string;
  quantity: number;
  refundAmount: string | number;
  reason: string | null;
  createdAt: Date;
  productName: string | null;
};
type AuditEntry = {
  id: string;
  action: string;
  target: string | null;
  createdAt: Date;
};
type ActivityItem = {
  id: string;
  actorName: string;
  action: string;
  target: string | null;
  createdAt: Date;
};
type StoreSettingsRow = {
  id: string;
  openTime: string;
  closeTime: string;
  taxRatePct: string | number;
  gstNumber: string | null;
  deliveryRadiusKm: number;
  enableDelivery: boolean;
} | null;
type ApiKey = {
  id: string;
  name: string;
  last4: string;
  scopes: string;
  active: boolean;
  createdAt: Date;
};
type Announcement = {
  id: string;
  title: string;
  body: string;
  severity: string;
  createdAt: Date;
};

type Props = {
  products: Product[];
  predictions: Prediction[];
  series: SeriesPoint[];
  topProducts: TopProduct[];
  staff: Staff[];
  suppliers: Supplier[];
  purchaseOrders: PO[];
  notificationRules: NotificationRule[];
  notes: Note[];
  returns: ReturnRow[];
  auditLogs: AuditEntry[];
  activityFeed: ActivityItem[];
  storeSettings: StoreSettingsRow;
  apiKeys: ApiKey[];
  announcements: Announcement[];
  isOwner: boolean;
  merchantType: "KIRANA" | "MEDICAL";
  sessionName: string;
};

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, ownerOnly: false },
  { id: "inventory", label: "Inventory", icon: Boxes, ownerOnly: false },
  { id: "scanner", label: "Scanner", icon: ScanLine, ownerOnly: false },
  { id: "orders", label: "Orders", icon: ShoppingBag, ownerOnly: true },
  { id: "pos", label: "Point of sale", icon: CreditCard, ownerOnly: false },
  { id: "clearance", label: "Clearance", icon: Tag, ownerOnly: true },
  { id: "predict", label: "Procurement", icon: TrendingUp, ownerOnly: true },
  { id: "suppliers", label: "Suppliers & POs", icon: Truck, ownerOnly: true },
  { id: "notifications", label: "Notifications", icon: Bell, ownerOnly: true },
  { id: "reports", label: "Reports & returns", icon: FileBarChart, ownerOnly: true },
  { id: "notes", label: "Team notes", icon: StickyNote, ownerOnly: false },
  { id: "staff", label: "Staff & access", icon: Users, ownerOnly: true },
  { id: "settings", label: "Store settings", icon: Settings, ownerOnly: true },
] as const;

export function VendorTabs(props: Props) {
  const { isOwner } = props;
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("overview");
  const currentTime = useCurrentTime();
  const expiringSoon = currentTime === null ? 0 : props.products.filter((product) => {
    if (!product.expiryDate) return false;
    const days = (new Date(product.expiryDate).getTime() - currentTime) / 86400000;
    return days <= 30 && days >= 0;
  }).length;

  const visibleTabs = TABS.filter((t) => !t.ownerOnly || isOwner);

  return (
    <div className="mt-8">
      {expiringSoon > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
          <span aria-hidden="true">!</span>
          {expiringSoon} items expiring within 30 days
        </div>
      )}
      <WorkspaceTabs
        value={tab}
        onValueChange={setTab}
        ariaLabel="Store console sections"
        tabs={visibleTabs.map(({ id, label, icon, ownerOnly }) => ({
          id,
          label,
          icon,
          badge: ownerOnly ? "Owner" : undefined,
        }))}
      >
        {tab === "overview" && (
          <OverviewTab
            series={props.series}
            topProducts={props.topProducts}
            isOwner={isOwner}
            announcements={props.announcements}
            activityFeed={props.activityFeed}
          />
        )}
        {tab === "inventory" && (
          <InventoryTab products={props.products} merchantType={props.merchantType} currentTime={currentTime} canAdjustStock={isOwner} />
        )}
        <div className={tab === "scanner" ? "" : "hidden"}>
          <RealScannerTab merchantType={props.merchantType} products={props.products} canAddInventory={isOwner} active={tab === "scanner"} />
        </div>
        {tab === "orders" && <OrdersTab canManage={isOwner} />}
        {tab === "pos" && <QuickPOSTab products={props.products} merchantType={props.merchantType} taxRatePct={Number(props.storeSettings?.taxRatePct ?? 5)} />}
        {tab === "clearance" && isOwner && (
          <ClearanceTab products={props.products} merchantType={props.merchantType} currentTime={currentTime} />
        )}
        {tab === "predict" && isOwner && (
          <PredictTab predictions={props.predictions} merchantType={props.merchantType} currentTime={currentTime} />
        )}
        {tab === "suppliers" && isOwner && (
          <SuppliersTab suppliers={props.suppliers} purchaseOrders={props.purchaseOrders} />
        )}
        {tab === "notifications" && isOwner && (
          <NotificationsTab rules={props.notificationRules} />
        )}
        {tab === "reports" && isOwner && (
          <ReportsTab series={props.series} returns={props.returns} auditLogs={props.auditLogs} topProducts={props.topProducts} />
        )}
        {tab === "notes" && (
          <NotesTab notes={props.notes} isOwner={isOwner} />
        )}
        {tab === "staff" && isOwner && <StaffTab staff={props.staff} apiKeys={props.apiKeys} />}
        {tab === "settings" && isOwner && (
          <SettingsTab settings={props.storeSettings} merchantType={props.merchantType} />
        )}
      </WorkspaceTabs>
    </div>
  );
}

// --------------------------------------------------
// Overview (analytics)
// --------------------------------------------------
function OverviewTab({ series, topProducts, isOwner, announcements, activityFeed }: {
  series: SeriesPoint[]; topProducts: TopProduct[]; isOwner: boolean;
  announcements: Announcement[]; activityFeed: ActivityItem[];
}) {
  const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#e11d48", "#0ea5e9", "#8b5cf6", "#ec4899", "#14b8a6"];

  return (
    <div className="space-y-6">
      {/* Announcements banner (for owners) */}
      {isOwner && announcements.length > 0 && (
        <div className="space-y-2">
          {announcements.slice(0, 2).map((a) => (
            <div
              key={a.id}
              className={`rounded-2xl border-l-4 p-3 text-sm ${
                a.severity === "critical" ? "border-rose-500 bg-rose-50 text-rose-900" :
                a.severity === "warning" ? "border-amber-500 bg-amber-50 text-amber-900" :
                "border-blue-500 bg-blue-50 text-blue-900"
              }`}
            >
              <b>{a.title}</b>
              <div className="mt-0.5 text-xs opacity-90">{a.body}</div>
            </div>
          ))}
        </div>
      )}

      {!isOwner && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          You are signed in as a <b>Billing Clerk</b>. Revenue analytics and procurement
          predictions are restricted to the Store Owner. You can scan barcodes and process
          checkout from the <b>Quick POS</b> tab.
        </div>
      )}

      {isOwner && (
        <div className="card p-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Sales velocity · last 30 days</h3>
          <p className="text-xs text-slate-500">Daily revenue & orders</p>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={10} />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={11} tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={11} />
                <Tooltip
                  formatter={(v, name) => {
                    const n = String(name ?? "");
                    if (n === "revenue") return [`₹${Number(v).toLocaleString("en-IN")}`, "Revenue"];
                    return [v, "Orders"];
                  }}
                />
                <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#gRev)" />
                <Area yAxisId="right" type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Top sellers (last 30d)</h3>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis type="number" stroke="#64748b" fontSize={11} tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={10} width={160} />
                <Tooltip formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`} />
                <Bar dataKey="revenue" radius={[0, 8, 8, 0]}>
                  {topProducts.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent activity */}
        <div className="card p-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Recent store activity</h3>
          <div className="mt-3 space-y-2">
            {activityFeed.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-2 text-xs">
                <div>
                  <span className="font-semibold text-slate-900">
                    {a.actorName}{a.action !== "IN_APP_NOTIFICATION" ? ` ${a.action.toLowerCase().replaceAll("_", " ")}` : ""}
                  </span>
                  {a.target && (
                    <span className="ml-1 text-slate-500">· {a.action === "IN_APP_NOTIFICATION" ? a.target.split("|").at(-1) : a.target}</span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500">
                  {formatDate(a.createdAt)}
                </span>
              </div>
            ))}
            {activityFeed.length === 0 && (
              <div className="py-4 text-center text-xs text-slate-500">No recent activity.</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Velocity by units sold</h3>
          <div className="mt-3 space-y-2">
            {topProducts.slice(0, 6).map((p) => {
              const max = Math.max(1, ...topProducts.map((x) => x.units));
              const pct = (p.units / max) * 100;
              return (
                <div key={p.productId ?? p.name}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="truncate font-semibold text-slate-800">{p.name}</span>
                    <span className="flex-shrink-0 font-mono text-slate-600">{p.units} units</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-600" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {topProducts.length === 0 && <div className="text-sm text-slate-500">No sales recorded yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------
// Inventory + Scanner
// --------------------------------------------------
function InventoryTab({ products, merchantType, currentTime, canAdjustStock }: { products: Product[]; merchantType: "KIRANA" | "MEDICAL"; currentTime: number | null; canAdjustStock: boolean }) {
  const [filter, setFilter] = useState("");
  const [scannedId, setScannedId] = useState<string | null>(null);
  const [scanInput, setScanInput] = useState("");
  const [scanMsg, setScanMsg] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      products.filter((p) =>
        (p.name + (p.brand ?? "") + (p.barcode ?? "") + (p.category ?? "")).toLowerCase().includes(filter.toLowerCase())
      ),
    [products, filter]
  );

  async function handleScan() {
    const code = scanInput.trim();
    setScannedId(null);
    if (!code) {
      setScanMsg("Enter a barcode or pick one of the demo codes below.");
      return;
    }
    setScanMsg(null);
    const res = await scanBarcode(code);
    if (!res.found || !("product" in res) || !res.product) {
      setScanMsg("Barcode not found in your store. Use it to add a new product.");
    } else {
      setScannedId(res.product.id);
      setScanMsg(`✓ Matched: ${res.product.name}`);
    }
  }

  return (
    <div className="space-y-6">
      {/* Camera scanner mock */}
      <div className="card overflow-hidden">
        <div className="grid gap-0 md:grid-cols-2">
          <div className="relative flex h-64 items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 md:h-72">
            <div className="absolute inset-0 bg-grid opacity-20" />
            <div className="relative flex flex-col items-center text-white">
              <div className="mb-3 h-28 w-44 rounded-xl border-2 border-dashed border-white/50 p-2">
                <div className="h-full w-full rounded-md bg-gradient-to-br from-white/10 to-white/5" />
              </div>
              <div className="text-xs font-semibold uppercase tracking-widest">Camera feed</div>
              <div className="mt-1 text-[10px] opacity-70">
                {merchantType === "MEDICAL" ? "Pharma barcode / batch # scanner" : "FMCG barcode scanner"}
              </div>
            </div>
            <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2 py-1 text-[10px] font-bold uppercase text-emerald-300">
              <span className="live-dot" /> Live
            </div>
          </div>

          <div className="p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              {merchantType === "MEDICAL" ? "Scan medicine / batch" : "Scan barcode"}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Demo: type a barcode below. Real devices would call Html5-QrCode here.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="8901187110018"
                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              <button
                onClick={handleScan}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Scan
              </button>
            </div>
            {scanMsg && (
              <div className={`mt-2 rounded-lg border px-3 py-2 text-xs ${scanMsg.startsWith("✓") ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
                {scanMsg}
              </div>
            )}
            {scannedId && <ScannedProductCard productId={scannedId} products={products} />}
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[10px]">
              {["8901187110018", "8901063018218", "8901491500018"].map((b) => (
                <button
                  key={b}
                  onClick={() => { setScanInput(b); }}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono hover:bg-slate-100"
                >
                  {b.slice(-4)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Product table */}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Inventory ({filtered.length} of {products.length})
          </h3>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search name, brand, barcode…"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <div className="scrollbar max-h-[520px] overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-2">Item</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2">Batch</th>
                <th className="px-4 py-2">Expiry</th>
                <th className="px-4 py-2 text-right">MRP</th>
                <th className="px-4 py-2 text-right">Stock</th>
                {merchantType === "MEDICAL" && <th className="px-4 py-2">Schedule</th>}
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((p) => (
                <ProductRow key={p.id} p={p} merchantType={merchantType} currentTime={currentTime} canAdjustStock={canAdjustStock} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ScannedProductCard({ productId, products }: { productId: string; products: Product[] }) {
  const p = products.find((x) => x.id === productId);
  if (!p) return null;
  return (
    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
      <div className="font-bold">{p.name}</div>
      <div>Brand: {p.brand ?? "—"} · Category: {p.category}</div>
      <div>Batch: {p.batchNumber ?? "—"} · Expiry: {formatDate(p.expiryDate)}</div>
      <div>Current stock: {p.quantity}</div>
    </div>
  );
}

function ProductRow({ p, merchantType, currentTime, canAdjustStock }: { p: Product; merchantType: "KIRANA" | "MEDICAL"; currentTime: number | null; canAdjustStock: boolean }) {
  const [busy, setBusy] = useState(false);
  const [qty, setQty] = useState(p.quantity);

  async function commit() {
    if (qty === p.quantity) return;
    setBusy(true);
    await updateStock(p.id, qty);
    setBusy(false);
  }

  const daysToExpiry = p.expiryDate && currentTime !== null
    ? Math.ceil((new Date(p.expiryDate).getTime() - currentTime) / 86400000)
    : null;
  const lowStock = p.quantity < p.reorderThreshold;
  const expired = daysToExpiry !== null && daysToExpiry < 0;
  const expiring = daysToExpiry !== null && daysToExpiry >= 0 && daysToExpiry <= 30;

  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-3">
        <div className="font-semibold text-slate-900">{p.name}</div>
        <div className="text-[10px] text-slate-500">{p.brand ?? "—"} · {p.barcode ?? "no barcode"}</div>
      </td>
      <td className="px-4 py-3 text-slate-600">{p.category}</td>
      <td className="px-4 py-3 font-mono text-[11px] text-slate-600">{p.batchNumber ?? "—"}</td>
      <td className="px-4 py-3 text-slate-600">
        {p.expiryDate ? (
          <span className={expired ? "font-semibold text-rose-700" : expiring ? "font-semibold text-amber-700" : ""}>
            {formatDate(p.expiryDate)}
            {daysToExpiry !== null && (
              <span className="ml-1 text-[10px]">
                ({expired ? "expired" : `${daysToExpiry}d`})
              </span>
            )}
          </span>
        ) : "—"}
      </td>
      <td className="px-4 py-3 text-right font-mono text-slate-800">₹{parseFloat(String(p.mrp)).toFixed(0)}</td>
      <td className="px-4 py-3">
        {!canAdjustStock ? (
          <span className="font-mono text-xs text-slate-700">{p.quantity}</span>
        ) : (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setQty(Math.max(0, qty - 1))}
            className="h-6 w-6 rounded border border-slate-200 bg-white text-xs hover:bg-slate-50"
          >−</button>
          <input
            type="number"
            value={qty}
            onChange={(e) => setQty(parseInt(e.target.value || "0", 10))}
            onBlur={commit}
            disabled={busy}
            className="h-6 w-12 rounded border border-slate-200 px-1 text-center text-xs font-mono"
          />
          <button
            onClick={() => setQty(qty + 1)}
            className="h-6 w-6 rounded border border-slate-200 bg-white text-xs hover:bg-slate-50"
          >+</button>
        </div>
        )}
      </td>
      {merchantType === "MEDICAL" && (
        <td className="px-4 py-3">
          {p.scheduleClass ? (
            <span
              className={`chip ${
                p.scheduleClass === "OTC"
                  ? "bg-emerald-100 text-emerald-700"
                  : p.scheduleClass === "SCHEDULE_H"
                  ? "bg-amber-100 text-amber-700"
                  : p.scheduleClass === "SCHEDULE_H1"
                  ? "bg-orange-100 text-orange-700"
                  : "bg-rose-100 text-rose-700"
              }`}
            >
              {p.scheduleClass}
            </span>
          ) : (
            <span className="text-[11px] text-slate-400">—</span>
          )}
        </td>
      )}
      <td className="px-4 py-3">
        {expired ? (
          <span className="chip bg-rose-100 text-rose-700">Expired</span>
        ) : expiring ? (
          <span className="chip bg-amber-100 text-amber-700">Expiring</span>
        ) : lowStock ? (
          <span className="chip bg-blue-100 text-blue-700">Low stock</span>
        ) : (
          <span className="chip bg-emerald-50 text-emerald-700">Healthy</span>
        )}
      </td>
    </tr>
  );
}

// --------------------------------------------------
// Clearance control
// --------------------------------------------------
function ClearanceTab({ products, merchantType, currentTime }: { products: Product[]; merchantType: "KIRANA" | "MEDICAL"; currentTime: number | null }) {
  // Default to showing expiring items first
  const sorted = [...products].sort((a, b) => {
    const ad = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity;
    const bd = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity;
    return ad - bd;
  });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 text-sm text-indigo-900">
        <b>Time-decay clearance engine.</b> Items expiring within 30 days get auto-suggested
        for the public B2C marketplace. Admin compliance switches may still hard-block
        specific categories (e.g. Schedule H / X drugs).
      </div>

      <div className="grid gap-3">
        {sorted.map((p) => (
          <ClearanceRow key={p.id} p={p} merchantType={merchantType} currentTime={currentTime} />
        ))}
      </div>
    </div>
  );
}

function ClearanceRow({ p, merchantType, currentTime }: { p: Product; merchantType: "KIRANA" | "MEDICAL"; currentTime: number | null }) {
  const [push, setPush] = useState(p.pushToMarketplace);
  const [discount, setDiscount] = useState(p.clearanceDiscountPct);
  const [busy, setBusy] = useState(false);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);

  const daysToExpiry = p.expiryDate && currentTime !== null
    ? Math.ceil((new Date(p.expiryDate).getTime() - currentTime) / 86400000)
    : null;
  const shouldSuggest = daysToExpiry !== null && daysToExpiry <= 30 && daysToExpiry >= 0;

  async function save() {
    setBusy(true);
    const res = await updateProductClearance(p.id, push, discount);
    if (res.blocked) {
      setPush(false);
      setBlockedReason(res.reason ?? "Blocked by compliance.");
    } else {
      setBlockedReason(null);
    }
    setBusy(false);
  }

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">{p.name}</span>
            {p.scheduleClass && (
              <span
                className={`chip ${
                  p.scheduleClass === "OTC" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                }`}
              >
                {p.scheduleClass}
              </span>
            )}
            {shouldSuggest && (
              <span className="chip bg-amber-100 text-amber-700">⏰ Expiring in {daysToExpiry}d</span>
            )}
            {p.requiresPrescription && (
              <span className="chip bg-violet-100 text-violet-700">Rx required</span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            Batch: {p.batchNumber ?? "—"} · MRP ₹{parseFloat(String(p.mrp)).toFixed(0)} · Stock: {p.quantity}
            {daysToExpiry !== null && (
              <>
                {" "}· Expires: {formatDate(p.expiryDate)} ({daysToExpiry}d)
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold text-slate-600">Discount</span>
            <input
              type="number"
              min={0}
              max={90}
              value={discount}
              onChange={(e) => setDiscount(parseInt(e.target.value || "0", 10))}
              className="h-8 w-16 rounded-lg border border-slate-200 px-2 text-center text-sm font-mono"
            />
            <span className="text-xs font-bold text-slate-500">%</span>
          </div>
          <button
            onClick={save}
            disabled={busy}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={push}
            onChange={(e) => setPush(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="font-semibold text-slate-800">Push to public B2C clearance marketplace</span>
        </label>
        <div className="text-xs text-slate-500">
          Final price: ₹{((parseFloat(String(p.mrp)) * (100 - discount)) / 100).toFixed(0)}
        </div>
      </div>

      {blockedReason && (
        <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          ⚠ {blockedReason}
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------
// Predictions — "What to order next"
// --------------------------------------------------
function PredictTab({ predictions, merchantType, currentTime }: { predictions: Prediction[]; merchantType: "KIRANA" | "MEDICAL"; currentTime: number | null }) {
  const router = useRouter();
  const [draftingId, setDraftingId] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState<string | null>(null);

  async function draftPurchaseOrder(prediction: Prediction) {
    if (!prediction.productName) return;
    setDraftingId(prediction.id);
    setDraftMessage(null);
    try {
      const estimatedCost = Number(prediction.costPrice ?? 0) * prediction.forecastQty;
      const result = await createPurchaseOrder(
        estimatedCost,
        1,
        `Forecast draft: ${prediction.productName}, ${prediction.forecastQty} units.`
      );
      if (!result.ok) {
        setDraftMessage(result.error ?? "Could not create purchase order.");
        return;
      }
      setDraftMessage(`Draft purchase order created for ${prediction.productName}.`);
      router.refresh();
    } catch {
      setDraftMessage("Could not create purchase order.");
    } finally {
      setDraftingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4 text-sm text-violet-900">
        <b>🔮 Predictive procurement engine.</b> Forecasted from 60 days of transaction data ×
        {merchantType === "MEDICAL" ? " seasonal disease wave signals + chronic-refill cycles" : " seasonal trends + basket co-purchase patterns"}.
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {predictions.map((p) => {
          const conf = Math.round(parseFloat(String(p.confidence)) * 100);
          const stock = p.currentStock ?? 0;
          const threshold = p.reorderThreshold ?? 0;
          const ratio = threshold === 0 ? 0 : Math.min(100, (stock / threshold) * 100);
          const low = stock < threshold;
          const daysToExpiry = p.expiryDate && currentTime !== null
            ? Math.ceil((new Date(p.expiryDate).getTime() - currentTime) / 86400000)
            : null;
          return (
            <div key={p.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-900">{p.productName ?? "Unknown"}</div>
                  <div className="text-xs text-slate-500">
                    {p.brand ?? "—"} · {p.category ?? "—"}
                  </div>
                </div>
                <div className="rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                  ML · {conf}% conf
                </div>
              </div>
              <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-700 italic">
                &quot;{p.reason}&quot;
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Forecast</div>
                  <div className="text-lg font-black text-indigo-700">{p.forecastQty} units</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Current stock</div>
                  <div className={`text-lg font-black ${low ? "text-rose-700" : "text-slate-900"}`}>{stock}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Threshold</div>
                  <div className="text-lg font-black text-slate-900">{threshold}</div>
                </div>
              </div>
              <div className="mt-2">
                <div className="mb-0.5 flex justify-between text-[10px] text-slate-500">
                  <span>Stock vs reorder threshold</span>
                  <span>{ratio.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full ${low ? "bg-rose-500" : "bg-emerald-500"}`}
                    style={{ width: `${ratio}%` }}
                  />
                </div>
              </div>
              {daysToExpiry !== null && (
                <div className="mt-2 text-[11px] text-slate-500">
                  Batch expiry in <b className={daysToExpiry < 30 ? "text-amber-700" : "text-slate-700"}>{daysToExpiry}d</b>
                </div>
              )}
              <button
                onClick={() => draftPurchaseOrder(p)}
                disabled={draftingId !== null || !p.productName}
                className="mt-3 w-full rounded-lg bg-slate-900 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {draftingId === p.id ? "Creating draft..." : `Draft PO for ${p.forecastQty} units →`}
              </button>
            </div>
          );
        })}
        {predictions.length === 0 && (
          <div className="card p-6 text-center text-sm text-slate-500">
            Not enough sales data yet to run predictions.
          </div>
        )}
      </div>
      {draftMessage && <div role="status" className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">{draftMessage}</div>}
    </div>
  );
}

// --------------------------------------------------
// Staff & RBAC
// --------------------------------------------------
function StaffTab({ staff, apiKeys }: { staff: Staff[]; apiKeys: ApiKey[] }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [access, setAccess] = useState<"SCAN_ONLY" | "BILLING" | "FULL">("SCAN_ONLY");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleAdd() {
    setErr(null);
    if (!name.trim() || !phone.trim()) {
      setErr("Name and phone are required.");
      return;
    }
    setBusy(true);
    const res = await addStaff(name.trim(), phone.trim(), access);
    setBusy(false);
    if (!res.ok) {
      setErr(res.error ?? "Failed to add staff");
      return;
    }
    setName(""); setPhone(""); setAccess("SCAN_ONLY"); setAdding(false);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 text-sm text-blue-900">
        <b>Role-based access control.</b> Owners see revenue charts and prediction panels. Clerks
        are restricted to camera scanning and billing. Each clerk gets their own WhatsApp-OTP login.
      </div>

      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Clerks ({staff.length})
          </h3>
          <button
            onClick={() => setAdding((v) => !v)}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            {adding ? "Cancel" : "+ Add clerk"}
          </button>
        </div>

        {adding && (
          <div className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91XXXXXXXXXX"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <select
              value={access}
              onChange={(e) => setAccess(e.target.value as "SCAN_ONLY" | "BILLING" | "FULL")}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="SCAN_ONLY">Scan-only (aisle walking)</option>
              <option value="BILLING">Billing (scan + checkout)</option>
              <option value="FULL">Full (incl. stock adjustments)</option>
            </select>
            <button
              onClick={handleAdd}
              disabled={busy}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {busy ? "Adding…" : "Invite clerk"}
            </button>
            {err && <div className="md:col-span-4 text-xs text-rose-700">{err}</div>}
          </div>
        )}

        <div className="space-y-2">
          {staff.length === 0 && (
            <div className="py-6 text-center text-sm text-slate-500">
              No clerks yet. Add your first team member.
            </div>
          )}
          {staff.map((s) => (
            <StaffRow key={s.id} s={s} />
          ))}
        </div>
      </div>

      {/* API keys for integrations */}
      <ApiKeysPanel apiKeys={apiKeys} />
    </div>
  );
}

function StaffRow({ s }: { s: Staff }) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function handleRemove() {
    setBusy(true);
    setConfirming(false);
    setError(null);
    try {
      await removeStaff(s.id);
    } catch {
      setError("Could not remove this team member. Try again.");
    } finally {
      setBusy(false);
    }
  }
  const accessLabel =
    s.accessLevel === "SCAN_ONLY" ? "Scan-only" : s.accessLevel === "BILLING" ? "Billing" : "Full";
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-900">{s.name}</span>
          {s.passkeyEnabled && (
            <span className="chip bg-violet-100 text-violet-700">🔑 Passkey</span>
          )}
          <span className="chip bg-slate-100 text-slate-700">{accessLabel}</span>
        </div>
        <div className="text-xs text-slate-500">{s.phone}</div>
      </div>
      <button
        onClick={() => setConfirming((value) => !value)}
        disabled={busy}
        className="rounded-md border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-50 disabled:opacity-60"
      >
        {busy ? "Removing…" : "Remove"}
      </button>
      </div>
      {confirming && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-700">Remove {s.name} from this store?</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirming(false)} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button onClick={handleRemove} disabled={busy} className="rounded-md bg-rose-700 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-800 disabled:opacity-50">Confirm removal</button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-xs text-rose-800">{error}</p>}
    </div>
  );
}

// --------------------------------------------------
// Quick POS
// --------------------------------------------------
type CartItem = Product & { cartQty: number };

function QuickPOSTab({ products, merchantType, taxRatePct }: { products: Product[]; merchantType: "KIRANA" | "MEDICAL"; taxRatePct: number }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [receipt, setReceipt] = useState<string | null>(null);
  const [patientName, setPatientName] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = products.filter((p) =>
    (p.name + (p.brand ?? "") + (p.barcode ?? "")).toLowerCase().includes(search.toLowerCase())
  );

  function addToCart(p: Product) {
    if (p.quantity < 1) return;
    setCart((prev) => {
      const existing = prev.find((c) => c.id === p.id);
      if (existing) {
        return prev.map((c) => c.id === p.id ? { ...c, cartQty: Math.min(p.quantity, c.cartQty + 1) } : c);
      }
      return [...prev, { ...p, cartQty: 1 }];
    });
  }

  function updateQty(id: string, qty: number) {
    setCart((prev) => prev.map((c) => c.id === id ? { ...c, cartQty: Math.max(0, qty) } : c).filter((c) => c.cartQty > 0));
  }

  const subtotal = cart.reduce((s, c) => s + parseFloat(String(c.mrp)) * c.cartQty, 0);
  const tax = subtotal * taxRatePct / 100;
  const total = subtotal + tax;
  const regulatedItems = cart.filter((item) =>
    item.scheduleClass === "SCHEDULE_H" || item.scheduleClass === "SCHEDULE_H1" ||
    item.scheduleClass === "SCHEDULE_X" || item.requiresPrescription
  );

  async function checkout() {
    if (cart.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      let prescriptionKey: string | undefined;
      if (regulatedItems.length > 0) {
        if (!patientName.trim() || !doctorName.trim() || !prescriptionFile) {
          setError("Patient name, doctor name, and prescription are required for scheduled medicines.");
          return;
        }
        const form = new FormData();
        form.append("file", prescriptionFile);
        form.append("type", "prescription");
        const response = await fetch("/api/upload", { method: "POST", body: form });
        const upload = await response.json();
        if (!response.ok || typeof upload.key !== "string") {
          setError(upload.error ?? "Prescription upload failed.");
          return;
        }
        prescriptionKey = upload.key;
      }

      const result = await completePosSale({
        items: cart.map((item) => ({ productId: item.id, quantity: item.cartQty })),
        patientName,
        doctorName,
        prescriptionKey,
      });
      if (!result.ok || !("receiptId" in result) || !("total" in result)) {
        setError(result.error ?? "Sale could not be completed.");
        return;
      }
      setReceipt(`Receipt ${result.receiptId.slice(0, 8)} · ₹${Number(result.total).toFixed(2)}`);
      setCart([]);
      setPatientName("");
      setDoctorName("");
      setPrescriptionFile(null);
    } catch {
      setError("Sale could not be completed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (receipt) {
    return (
      <div className="card p-10 text-center">
        <div className="mb-3 text-5xl">✅</div>
        <h3 className="text-xl font-bold text-emerald-700">Sale recorded</h3>
        <p className="mt-2 text-sm text-slate-600">{receipt}</p>
        <button onClick={() => setReceipt(null)} className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">New sale</button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="card p-4 lg:col-span-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
          {merchantType === "MEDICAL" ? "Dispense medicine" : "Add items to bill"}
        </h3>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, brand, or barcode…"
          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <div className="mt-3 grid max-h-[500px] grid-cols-2 gap-2 overflow-auto pr-1 md:grid-cols-3">
          {filtered.slice(0, 30).map((p) => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              disabled={p.quantity < 1}
              className="rounded-lg border border-slate-200 bg-white p-2 text-left hover:border-indigo-400 hover:bg-indigo-50/40 disabled:opacity-40"
            >
              <div className="truncate text-xs font-semibold text-slate-900">{p.name}</div>
              <div className="text-[10px] text-slate-500">{p.brand}</div>
              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className="font-bold text-emerald-700">₹{parseFloat(String(p.mrp)).toFixed(0)}</span>
                <span className={`font-mono ${p.quantity < 5 ? "text-rose-600" : "text-slate-500"}`}>
                  ×{p.quantity}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="card flex flex-col p-4 lg:col-span-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Current bill</h3>
        <div className="mt-2 flex-1 space-y-1 overflow-auto">
          {cart.length === 0 && <div className="py-6 text-center text-xs text-slate-500">Cart is empty</div>}
          {cart.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-2 text-xs">
              <div className="flex-1">
                <div className="font-semibold text-slate-900 truncate">{c.name}</div>
                <div className="text-[10px] text-slate-500">₹{parseFloat(String(c.mrp)).toFixed(0)} × {c.cartQty}</div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => updateQty(c.id, c.cartQty - 1)} className="h-5 w-5 rounded bg-white text-xs">−</button>
                <span className="w-5 text-center font-mono">{c.cartQty}</span>
                <button onClick={() => updateQty(c.id, c.cartQty + 1)} className="h-5 w-5 rounded bg-white text-xs">+</button>
              </div>
              <div className="ml-2 w-14 text-right font-mono font-bold">₹{(parseFloat(String(c.mrp)) * c.cartQty).toFixed(0)}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm">
          <div className="flex justify-between text-slate-600"><span>Subtotal</span><span className="font-mono">₹{subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between text-slate-600"><span>GST ({taxRatePct}%)</span><span className="font-mono">₹{tax.toFixed(2)}</span></div>
          <div className="flex justify-between text-base font-bold text-slate-900"><span>Total</span><span className="font-mono">₹{total.toFixed(2)}</span></div>
        </div>
        {regulatedItems.length > 0 && (
          <div className="mt-3 space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="text-xs font-semibold text-amber-900">Prescription details required</div>
            <input value={patientName} onChange={(event) => setPatientName(event.target.value)} placeholder="Patient name" className="w-full rounded border border-amber-200 bg-white px-2 py-1.5 text-xs" />
            <input value={doctorName} onChange={(event) => setDoctorName(event.target.value)} placeholder="Prescribing doctor" className="w-full rounded border border-amber-200 bg-white px-2 py-1.5 text-xs" />
            <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setPrescriptionFile(event.target.files?.[0] ?? null)} className="w-full text-xs" />
          </div>
        )}
        {error && <div role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}
        <button
          onClick={checkout}
          disabled={cart.length === 0 || busy}
          className="mt-3 rounded-lg bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
        >
          {busy ? "Recording sale..." : `Record Sale · ₹${total.toFixed(2)}`}
        </button>
      </div>
    </div>
  );
}

// --------------------------------------------------
// Notifications
// --------------------------------------------------
function NotificationsTab({ rules }: { rules: NotificationRule[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [eventType, setEventType] = useState<"LOW_STOCK" | "EXPIRY">("LOW_STOCK");
  const [threshold, setThreshold] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeRuleCount = rules.filter((rule) => rule.enabled && rule.channel === "IN_APP" && ["LOW_STOCK", "EXPIRY"].includes(rule.eventType)).length;

  async function handleAdd() {
    setBusy(true);
    setError(null);
    try {
      const { createNotificationRule } = await import("@/lib/actions");
      const result = await createNotificationRule("IN_APP", eventType, threshold, null, null, "", null);
      if (!result.ok) {
        setError(result.error ?? "Could not create alert rule.");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Could not create alert rule.");
    } finally {
      setBusy(false);
    }
  }

  const CHANNEL_ICONS: Record<string, string> = {
    WHATSAPP: "💬",
    SMS: "📱",
    EMAIL: "📧",
    IN_APP: "🔔",
  };

  const EVENT_LABELS: Record<string, string> = {
    LOW_STOCK: "Low stock alert",
    EXPIRY: "Expiry warning",
    DAILY_SUMMARY: "Daily revenue digest",
    REORDER_DUE: "Reorder due",
    PRICE_CHANGE: "Price change",
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 text-sm text-blue-900">
        <b>🔔 In-app inventory alerts.</b> A daily protected Vercel job checks low-stock and expiry rules.
        WhatsApp, SMS, and email delivery require provider credentials and are not enabled here.
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
          Active rules ({activeRuleCount} of {rules.length})
        </h3>
        <button
          onClick={() => setOpen(!open)}
          className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700"
        >
          {open ? "Cancel" : "+ New rule"}
        </button>
      </div>

      {open && (
        <div className="card space-y-3 p-4">
          <h4 className="text-sm font-bold text-slate-900">Configure new alert</h4>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Event type</span>
              <select
                value={eventType}
                onChange={(e) => {
                  const next = e.target.value as "LOW_STOCK" | "EXPIRY";
                  setEventType(next);
                  setThreshold(next === "EXPIRY" ? 7 : 10);
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="LOW_STOCK">Low stock (threshold)</option>
                <option value="EXPIRY">Expiry warning (days)</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Threshold ({eventType === "EXPIRY" ? "days before expiry" : "units"})</span>
              <input
                type="number"
                min={1}
                max={365}
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value || "0", 10))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>
          {error && <div role="alert" className="text-xs text-rose-700">{error}</div>}
          <button
            onClick={handleAdd}
            disabled={busy}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Creating…" : "Create alert rule"}
          </button>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {rules.map((r) => (
          <NotificationRuleCard key={r.id} rule={r} icons={CHANNEL_ICONS} labels={EVENT_LABELS} />
        ))}
        {rules.length === 0 && (
          <div className="card p-6 text-center text-sm text-slate-500">
            No notification rules. Add your first to get timely alerts.
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationRuleCard({
  rule, icons, labels,
}: {
  rule: NotificationRule;
  icons: Record<string, string>;
  labels: Record<string, string>;
}) {
  const [enabled, setEnabled] = useState(rule.enabled);
  const [busy, setBusy] = useState(false);
  const connected = rule.channel === "IN_APP" && ["LOW_STOCK", "EXPIRY"].includes(rule.eventType);

  async function toggle() {
    if (!connected) return;
    setBusy(true);
    const next = !enabled;
    const { toggleNotificationRule } = await import("@/lib/actions");
    try {
      const result = await toggleNotificationRule(rule.id, next);
      if (result.ok) setEnabled(next);
    } finally {
      setBusy(false);
    }
  }

  const recipient = rule.recipientEmail ?? rule.recipientPhone ?? "—";
  const when = rule.eventType === "DAILY_SUMMARY"
    ? `${rule.scheduleTime ?? ""} · ${rule.scheduleDays ?? ""}`
    : rule.threshold !== null
    ? `≤ ${rule.threshold} ${rule.eventType === "EXPIRY" ? "days" : "units"}`
    : "Always";

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">{icons[rule.channel] ?? "🔔"}</span>
            <span className="font-bold text-slate-900">{labels[rule.eventType] ?? rule.eventType}</span>
            <span className={`chip ${enabled && connected ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
              {!connected ? "NOT CONNECTED" : enabled ? "ACTIVE" : "PAUSED"}
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-600">
            via <b>{rule.channel}</b> · {when} · {connected ? "In-app activity feed" : "delivery provider not configured"}
          </div>
          {rule.messageTemplate && (
            <div className="mt-2 rounded-lg bg-slate-50 p-2 font-mono text-[10px] text-slate-600 italic">
              &quot;{rule.messageTemplate}&quot;
            </div>
          )}
        </div>
        <button
          onClick={toggle}
          disabled={busy || !connected}
          aria-label={`${connected ? "Toggle" : "Not connected"} ${labels[rule.eventType] ?? rule.eventType}`}
          className={`relative h-6 w-11 flex-shrink-0 rounded-full transition ${enabled && connected ? "bg-emerald-500" : "bg-slate-300"} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${enabled && connected ? "left-5" : "left-0.5"}`} />
        </button>
      </div>
    </div>
  );
}

// --------------------------------------------------
// Reports & Returns
// --------------------------------------------------
function ReportsTab({ series, returns, auditLogs, topProducts }: {
  series: SeriesPoint[];
  returns: ReturnRow[];
  auditLogs: AuditEntry[];
  topProducts: TopProduct[];
}) {
  const totalRevenue = series.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = series.reduce((s, d) => s + d.orders, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const totalRefunds = returns.reduce((s, r) => s + parseFloat(String(r.refundAmount)), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-4">
        <MiniKPI label="30d Revenue" value={`₹${Math.round(totalRevenue).toLocaleString("en-IN")}`} tone="emerald" />
        <MiniKPI label="30d Orders" value={totalOrders.toString()} tone="blue" />
        <MiniKPI label="Avg order value" value={`₹${avgOrderValue.toFixed(0)}`} tone="indigo" />
        <MiniKPI label="Refunds" value={`₹${Math.round(totalRefunds).toLocaleString("en-IN")}`} tone="rose" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Recent returns & refunds</h3>
          <div className="mt-3 space-y-2">
            {returns.slice(0, 5).map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-2 rounded-lg bg-slate-50 p-2 text-xs">
                <div>
                  <div className="font-semibold text-slate-900">{r.productName ?? "Unknown item"}</div>
                  <div className="text-[11px] text-slate-500">{r.reason ?? "—"} · {r.quantity} units</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-rose-700">−₹{parseFloat(String(r.refundAmount)).toFixed(0)}</div>
                  <div className="text-[10px] text-slate-500">{formatDate(r.createdAt)}</div>
                </div>
              </div>
            ))}
            {returns.length === 0 && <div className="py-4 text-center text-xs text-slate-500">No returns yet.</div>}
          </div>
        </div>

        <div className="card p-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Audit trail</h3>
          <div className="mt-3 space-y-1.5">
            {auditLogs.slice(0, 6).map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="chip bg-slate-200 text-slate-700">{l.action.replace(/_/g, " ")}</span>
                  <span className="text-slate-700">{l.target ?? "—"}</span>
                </div>
                <span className="text-[10px] text-slate-500">{formatDate(l.createdAt)}</span>
              </div>
            ))}
            {auditLogs.length === 0 && <div className="py-4 text-center text-xs text-slate-500">No activity.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniKPI({ label, value, tone }: { label: string; value: string; tone: "emerald" | "blue" | "indigo" | "rose" }) {
  const color = { emerald: "text-emerald-700", blue: "text-blue-700", indigo: "text-indigo-700", rose: "text-rose-700" }[tone];
  return (
    <div className="card p-4">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-black ${color}`}>{value}</div>
    </div>
  );
}

// --------------------------------------------------
// Notes
// --------------------------------------------------
function NotesTab({ notes, isOwner }: { notes: Note[]; isOwner: boolean }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!title.trim() || !body.trim()) return;
    setBusy(true);
    const { createNote } = await import("@/lib/actions");
    await createNote(title, body, pinned);
    setBusy(false);
    setTitle(""); setBody(""); setPinned(false); setOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
          Team notes ({notes.length})
        </h3>
        <button
          onClick={() => setOpen(!open)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
        >
          {open ? "Cancel" : "+ New note"}
        </button>
      </div>

      {open && (
        <div className="card space-y-2 p-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Body…"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="rounded" />
              Pin to top
            </label>
            <button
              onClick={add}
              disabled={busy}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save note"}
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {notes.map((n) => (
          <div key={n.id} className={`card p-4 ${n.pinned ? "border-l-4 border-l-amber-500" : ""}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {n.pinned && <span className="text-amber-500">📌</span>}
                  <span className="font-bold text-slate-900">{n.title}</span>
                </div>
                <p className="mt-1 text-sm text-slate-700">{n.body}</p>
                <div className="mt-2 text-[11px] text-slate-500">
                  by {n.authorName} · {formatDateTime(n.createdAt)}
                </div>
              </div>
            </div>
          </div>
        ))}
        {notes.length === 0 && (
          <div className="card p-6 text-center text-sm text-slate-500 md:col-span-2">
            No notes yet. Add your first.
          </div>
        )}
      </div>
    </div>
  );
}

// --------------------------------------------------
// Store settings
// --------------------------------------------------
function SettingsTab({ settings, merchantType }: { settings: StoreSettingsRow; merchantType: "KIRANA" | "MEDICAL" }) {
  const [open, setOpen] = useState(settings?.openTime ?? "09:00");
  const [close, setClose] = useState(settings?.closeTime ?? "21:00");
  const [tax, setTax] = useState(parseFloat(String(settings?.taxRatePct ?? "5")));
  const [gst, setGst] = useState(settings?.gstNumber ?? "");
  const [radius, setRadius] = useState(settings?.deliveryRadiusKm ?? 3);
  const [delivery, setDelivery] = useState(settings?.enableDelivery ?? false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true);
    const { updateStoreSettings } = await import("@/lib/actions");
    await updateStoreSettings({ openTime: open, closeTime: close, taxRatePct: tax, gstNumber: gst, deliveryRadiusKm: radius, enableDelivery: delivery });
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Operating hours</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Opens at</span>
            <input type="time" value={open} onChange={(e) => setOpen(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Closes at</span>
            <input type="time" value={close} onChange={(e) => setClose(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </label>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Tax & compliance</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">GST rate (%)</span>
            <input type="number" value={tax} onChange={(e) => setTax(parseFloat(e.target.value || "0"))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">{merchantType === "MEDICAL" ? "Drug license #" : "FSSAI / GST #"}</span>
            <input value={gst} onChange={(e) => setGst(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono" />
          </label>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Delivery</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Delivery radius (km)</span>
            <input type="number" value={radius} onChange={(e) => setRadius(parseInt(e.target.value || "0", 10))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label className="flex items-center gap-2 pt-5 text-sm">
            <input type="checkbox" checked={delivery} onChange={(e) => setDelivery(e.target.checked)} className="h-4 w-4 rounded" />
            <span className="font-semibold">Enable home delivery</span>
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={busy}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save settings"}
        </button>
        {saved && <span className="text-sm font-semibold text-emerald-700">✓ Saved</span>}
      </div>
    </div>
  );
}

// --------------------------------------------------
// Real Scanner Tab
// --------------------------------------------------
function RealScannerTab({ merchantType, products, canAddInventory, active }: { merchantType: "KIRANA" | "MEDICAL"; products: Product[]; canAddInventory: boolean; active: boolean }) {
  const router = useRouter();
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    name: "", brand: "", category: "", barcode: "", mrp: "", costPrice: "",
    quantity: "0", reorderThreshold: "10", batchNumber: "", expiryDate: "",
    scheduleClass: "OTC" as "OTC" | "SCHEDULE_H" | "SCHEDULE_H1" | "SCHEDULE_X",
    requiresPrescription: false, imageUrl: "",
  });

  function startAddProduct(data: { name?: string | null; brand?: string | null; category?: string | null; imageUrl?: string | null; barcode?: string }) {
    setDraft((current) => ({
      ...current,
      name: data.name ?? "",
      brand: data.brand ?? "",
      category: data.category ?? "",
      barcode: data.barcode ?? scannedBarcode ?? "",
      imageUrl: data.imageUrl ?? "",
    }));
    setAddError(null);
    setAddFormOpen(true);
  }

  async function saveNewProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setAddError(null);
    const result = await addInventoryProduct({
      ...draft,
      mrp: Number(draft.mrp),
      costPrice: Number(draft.costPrice),
      quantity: Number(draft.quantity),
      reorderThreshold: Number(draft.reorderThreshold),
    });
    setBusy(false);
    if (!result.ok) {
      setAddError(result.error ?? "Could not add product.");
      return;
    }
    setAddFormOpen(false);
    setLookupResult(null);
    setScannedBarcode(null);
    router.refresh();
  }

  async function handleScan(barcode: string) {
    setScannedBarcode(barcode);
    setBusy(true);

    // First check local inventory
    const { scanBarcode } = await import("@/lib/actions");
    const local = await scanBarcode(barcode);
    if (local.found && "product" in local && local.product) {
      setLookupResult({ source: "local", data: local.product });
      setBusy(false);
      return;
    }

    // Then check online (Open Food Facts)
    const { lookupBarcodeOnline } = await import("@/lib/actions");
    const online = await lookupBarcodeOnline(barcode);
    if (online) {
      setLookupResult({ source: "online", data: online });
    } else {
      setLookupResult({ source: "notfound", data: { barcode } });
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-900">
        <b>📷 Real Barcode Scanner.</b> Uses your device camera with html5-qrcode.
        Scans EAN/UPC barcodes on FMCG products, then looks up details from our
        inventory or Open Food Facts public database.
      </div>

      <div className="card p-4">
        <div className="mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            {merchantType === "MEDICAL" ? "Scan medicine barcode" : "Scan product barcode"}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Point your camera at the barcode. Make sure it&apos;s well-lit.
          </p>
        </div>

        <BarcodeScanner onScan={handleScan} compact={false} active={active} />
      </div>

      {busy && (
        <div className="card p-4 text-center text-sm text-slate-600">
          🔍 Looking up barcode <code className="font-mono">{scannedBarcode}</code>...
        </div>
      )}

      {lookupResult && !busy && (
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Lookup Result
            </h3>
            <span className={`chip ${
              lookupResult.source === "local" ? "bg-emerald-100 text-emerald-700" :
              lookupResult.source === "online" ? "bg-blue-100 text-blue-700" :
              "bg-amber-100 text-amber-700"
            }`}>
              {lookupResult.source === "local" ? "✓ Found in your inventory" :
               lookupResult.source === "online" ? "🌐 Found online" :
               "⚠ Not found"}
            </span>
          </div>

          {lookupResult.source === "local" && (
            <div className="rounded-lg bg-emerald-50 p-3 text-sm">
              <div className="font-bold text-slate-900">{lookupResult.data.name}</div>
              <div className="text-xs text-slate-600">
                Brand: {lookupResult.data.brand || "—"} · Category: {lookupResult.data.category}
              </div>
              <div className="mt-1 text-xs text-slate-600">
                Stock: {lookupResult.data.quantity} · MRP: ₹{parseFloat(String(lookupResult.data.mrp)).toFixed(0)}
              </div>
              <div className="mt-1 text-xs text-slate-600">
                Batch: {lookupResult.data.batchNumber || "—"}
                {lookupResult.data.expiryDate && (
                  <> · Expires: {formatDate(lookupResult.data.expiryDate)}</>
                )}
              </div>
            </div>
          )}

          {canAddInventory && lookupResult.source === "online" && (
            <div className="rounded-lg bg-blue-50 p-3 text-sm">
              <div className="font-bold text-slate-900">{lookupResult.data.name}</div>
              <div className="text-xs text-slate-600">
                Brand: {lookupResult.data.brand || "—"} · Category: {lookupResult.data.category || "—"}
              </div>
              <div className="mt-2 flex gap-2">
                <button onClick={() => { setLookupResult(null); setScannedBarcode(null); }} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                  Scan another
                </button>
              </div>
            </div>
          )}

          {canAddInventory && lookupResult.source === "notfound" && (
            <div className="rounded-lg bg-amber-50 p-3 text-sm">
              <div className="text-amber-900">
                Barcode <code className="font-mono font-bold">{lookupResult.data.barcode}</code> not found.
              </div>
              <div className="mt-1 text-xs text-amber-800">
                You can add it manually to your inventory.
              </div>
            </div>
          )}

          {lookupResult.source === "online" && (
            <button onClick={() => startAddProduct({ ...lookupResult.data, barcode: scannedBarcode ?? "" })} className="mt-3 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700">
              + Add this product to inventory
            </button>
          )}
          {lookupResult.source === "notfound" && (
            <button onClick={() => startAddProduct({ barcode: lookupResult.data.barcode })} className="mt-3 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
              + Add product manually
            </button>
          )}
          {addFormOpen && (
            <form onSubmit={saveNewProduct} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
              <h4 className="text-sm font-bold text-slate-800 md:col-span-2">New inventory item</h4>
              <input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Product name" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input value={draft.brand} onChange={(event) => setDraft({ ...draft, brand: event.target.value })} placeholder="Brand" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input required value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} placeholder="Category" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input value={draft.barcode} onChange={(event) => setDraft({ ...draft, barcode: event.target.value })} placeholder="Barcode" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input required type="number" min="0.01" step="0.01" value={draft.mrp} onChange={(event) => setDraft({ ...draft, mrp: event.target.value })} placeholder="MRP" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input required type="number" min="0" step="0.01" value={draft.costPrice} onChange={(event) => setDraft({ ...draft, costPrice: event.target.value })} placeholder="Cost price" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input required type="number" min="0" step="1" value={draft.quantity} onChange={(event) => setDraft({ ...draft, quantity: event.target.value })} placeholder="Opening stock" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input required type="number" min="0" step="1" value={draft.reorderThreshold} onChange={(event) => setDraft({ ...draft, reorderThreshold: event.target.value })} placeholder="Reorder threshold" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input value={draft.batchNumber} onChange={(event) => setDraft({ ...draft, batchNumber: event.target.value })} placeholder="Batch number" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <label className="text-xs font-semibold text-slate-600">Expiry date<input type="date" value={draft.expiryDate} onChange={(event) => setDraft({ ...draft, expiryDate: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
              {merchantType === "MEDICAL" && (
                <label className="text-xs font-semibold text-slate-600">Schedule class<select value={draft.scheduleClass} onChange={(event) => setDraft({ ...draft, scheduleClass: event.target.value as typeof draft.scheduleClass })} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option value="OTC">OTC</option><option value="SCHEDULE_H">Schedule H</option><option value="SCHEDULE_H1">Schedule H1</option><option value="SCHEDULE_X">Schedule X</option></select></label>
              )}
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={draft.requiresPrescription} onChange={(event) => setDraft({ ...draft, requiresPrescription: event.target.checked })} />Prescription required</label>
              {addError && <div role="alert" className="text-xs text-rose-700 md:col-span-2">{addError}</div>}
              <div className="flex gap-2 md:col-span-2">
                <button disabled={busy} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{busy ? "Saving..." : "Save inventory item"}</button>
                <button type="button" onClick={() => setAddFormOpen(false)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700">Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------
// Orders Tab (redirect to orders page)
// --------------------------------------------------
function OrdersTab({ canManage }: { canManage: boolean }) {
  return (
    <div className="card p-6 text-center">
      <div className="text-5xl">🛍️</div>
      <h3 className="mt-3 text-lg font-bold text-slate-900">Order Management</h3>
      <p className="mt-1 text-sm text-slate-600">
        {canManage ? "View and manage all marketplace orders for your store." : "View marketplace orders for your store."}
      </p>
      <a
        href="/vendor/orders"
        className="mt-4 inline-block rounded-lg bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700"
      >
        Open Orders Dashboard →
      </a>
    </div>
  );
}
