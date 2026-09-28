import { db } from "@/db";
import {
  merchants,
  users,
  products,
  transactions,
  complianceSwitches,
  platformLedger,
  regionalTickers,
  predictionCache,
  inferenceLogs,
  otpSessions,
  notificationRules,
  auditLogs,
  announcements,
  suppliers,
  purchaseOrders,
  storeNotes,
  supportTickets,
  vendorScorecards,
  storeSettings,
  activityFeed,
  salesReturns,
  apiKeys,
  consumerFavorites,
  consumers,
  orders,
  orderItems,
  reviews,
  scheduleHLogs,
} from "@/db/schema";
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 86400000);
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86400000);
}

function money(n: number) {
  return n.toFixed(2);
}

export async function seedIfEmpty() {
  const [count] = await db.select({ count: sql<number>`count(*)::int` }).from(merchants);
  if ((count?.count ?? 0) > 0) return;

  // --------- Compliance switches (defaults) ---------
  const complianceDefaults: Array<{
    merchantType: "KIRANA" | "MEDICAL";
    key: string;
    enabled: boolean;
    description: string;
  }> = [
    { merchantType: "KIRANA", key: "allow_clearance_marketplace", enabled: true, description: "Permit Kirana items to appear on public B2C clearance marketplace." },
    { merchantType: "KIRANA", key: "auto_markdown_at_30d", enabled: true, description: "Automatically mark down 30% when item is within 30 days of expiry." },
    { merchantType: "KIRANA", key: "auto_markdown_at_7d", enabled: true, description: "Automatically mark down 60% when item is within 7 days of expiry." },
    { merchantType: "MEDICAL", key: "allow_clearance_marketplace", enabled: false, description: "Permit Medical items to appear on public B2C marketplace (default OFF for safety)." },
    { merchantType: "MEDICAL", key: "block_schedule_h_on_marketplace", enabled: true, description: "Hard-block Schedule H drugs from public clearance." },
    { merchantType: "MEDICAL", key: "block_schedule_x_on_marketplace", enabled: true, description: "Hard-block Schedule X drugs from public clearance." },
    { merchantType: "MEDICAL", key: "require_prescription_checkout", enabled: true, description: "Force prescription upload for restricted drugs at checkout." },
    { merchantType: "MEDICAL", key: "auto_disposal_alert_at_15d", enabled: true, description: "Alert store to destroy items 15 days before expiry per legal disposal rules." },
  ];
  for (const c of complianceDefaults) {
    await db.insert(complianceSwitches).values({
      id: randomUUID(),
      merchantType: c.merchantType,
      key: c.key,
      enabled: c.enabled,
      description: c.description,
    });
  }

  // --------- Merchants ---------
  const merchantList = [
    {
      id: "m_kirana_01", name: "Sharma General Store", ownerName: "Rajesh Sharma",
      type: "KIRANA" as const, address: "14 MG Road", city: "Pune", pincode: "411001",
      phone: "+919811100001", whatsapp: "+919811100001", licenseNumber: "FSSAI-10023045000123",
      licenseDocUrl: "/docs/fssai-sharma.pdf", kycStatus: "APPROVED" as const, approvedAt: daysAgo(120),
    },
    {
      id: "m_kirana_02", name: "Green Basket Kirana", ownerName: "Priya Nair",
      type: "KIRANA" as const, address: "77 Linking Road", city: "Mumbai", pincode: "400050",
      phone: "+919811100002", whatsapp: "+919811100002", licenseNumber: "FSSAI-20045067000456",
      licenseDocUrl: "/docs/fssai-green.pdf", kycStatus: "APPROVED" as const, approvedAt: daysAgo(60),
    },
    {
      id: "m_medical_01", name: "Arogya Pharmacy", ownerName: "Dr. Anil Kulkarni",
      type: "MEDICAL" as const, address: "22 FC Road", city: "Pune", pincode: "411005",
      phone: "+919811100003", whatsapp: "+919811100003", licenseNumber: "MH-PHARM-2024-08812",
      licenseDocUrl: "/docs/pharm-license-anil.pdf", kycStatus: "APPROVED" as const, approvedAt: daysAgo(200),
    },
    {
      id: "m_pending_01", name: "Wellness Medicals", ownerName: "Sana Khan",
      type: "MEDICAL" as const, address: "5 Brigade Road", city: "Bengaluru", pincode: "560025",
      phone: "+919811100004", whatsapp: "+919811100004", licenseNumber: "KA-PHARM-2025-99112",
      licenseDocUrl: "/docs/pharm-license-sana.pdf", kycStatus: "PENDING" as const,
    },
    {
      id: "m_pending_02", name: "Annapurna Kirana", ownerName: "Vikas Joshi",
      type: "KIRANA" as const, address: "98 CG Road", city: "Ahmedabad", pincode: "380006",
      phone: "+919811100005", whatsapp: "+919811100005", licenseNumber: "FSSAI-30055500078912",
      licenseDocUrl: "/docs/fssai-annapurna.pdf", kycStatus: "UNDER_REVIEW" as const,
    },
  ];
  for (const m of merchantList) await db.insert(merchants).values(m);

  // --------- Users ---------
  const userList = [
    { id: "u_admin_01", name: "OmniShelf Platform Admin", phone: "+919000000001", role: "ADMIN" as const, merchantId: null, accessLevel: "FULL" as const, passkeyEnabled: true },
    { id: "u_owner_01", name: "Rajesh Sharma", phone: "+919811100001", role: "VENDOR_OWNER" as const, merchantId: "m_kirana_01", accessLevel: "FULL" as const, passkeyEnabled: true },
    { id: "u_clerk_01", name: "Suresh (Clerk)", phone: "+919811100011", role: "VENDOR_CLERK" as const, merchantId: "m_kirana_01", accessLevel: "SCAN_ONLY" as const, passkeyEnabled: false },
    { id: "u_owner_02", name: "Dr. Anil Kulkarni", phone: "+919811100003", role: "VENDOR_OWNER" as const, merchantId: "m_medical_01", accessLevel: "FULL" as const, passkeyEnabled: true },
    { id: "u_owner_pending", name: "Sana Khan", phone: "+919811100004", role: "VENDOR_OWNER" as const, merchantId: "m_pending_01", accessLevel: "FULL" as const, passkeyEnabled: false },
  ];
  for (const u of userList) await db.insert(users).values(u);

  // --------- Kirana products ---------
  type P = Omit<typeof products.$inferInsert, "id" | "createdAt" | "updatedAt">;
  const kiranaProducts: P[] = [
    { merchantId: "m_kirana_01", name: "Amul Gold Full Cream Milk 1L", brand: "Amul", category: "Dairy", barcode: "8901187110018", mrp: money(68), costPrice: money(60), quantity: 48, reorderThreshold: 20, expiryDate: daysFromNow(4), batchNumber: "AM240911", pushToMarketplace: true, clearanceDiscountPct: 30 },
    { merchantId: "m_kirana_01", name: "Britannia Good Day Butter 600g", brand: "Britannia", category: "Biscuits", barcode: "8901063018218", mrp: money(150), costPrice: money(125), quantity: 36, reorderThreshold: 15, expiryDate: daysFromNow(22), batchNumber: "BD240815", pushToMarketplace: true, clearanceDiscountPct: 20 },
    { merchantId: "m_kirana_01", name: "Tata Salt 1kg", brand: "Tata", category: "Staples", barcode: "8901030863018", mrp: money(28), costPrice: money(22), quantity: 120, reorderThreshold: 30, expiryDate: daysFromNow(400), pushToMarketplace: false, clearanceDiscountPct: 0 },
    { merchantId: "m_kirana_01", name: "Maggi 2-Minute Noodles 70g (Pack of 12)", brand: "Nestle", category: "Snacks", barcode: "8901491100018", mrp: money(168), costPrice: money(140), quantity: 8, reorderThreshold: 15, expiryDate: daysFromNow(180), pushToMarketplace: false, clearanceDiscountPct: 0 },
    { merchantId: "m_kirana_01", name: "Parle-G Gold 1kg", brand: "Parle", category: "Biscuits", barcode: "8901138901018", mrp: money(130), costPrice: money(105), quantity: 4, reorderThreshold: 10, expiryDate: daysFromNow(60), pushToMarketplace: false, clearanceDiscountPct: 0 },
    { merchantId: "m_kirana_01", name: "Dettol Handwash Refill 750ml", brand: "Dettol", category: "Personal Care", barcode: "8901065789018", mrp: money(149), costPrice: money(115), quantity: 24, reorderThreshold: 10, expiryDate: daysFromNow(500), pushToMarketplace: false, clearanceDiscountPct: 0 },
    { merchantId: "m_kirana_01", name: "Aashirvaad Atta 5kg", brand: "Aashirvaad", category: "Staples", barcode: "8901314000018", mrp: money(320), costPrice: money(280), quantity: 18, reorderThreshold: 8, expiryDate: daysFromNow(120), pushToMarketplace: false, clearanceDiscountPct: 0 },
    { merchantId: "m_kirana_01", name: "Mother Dairy Dahi 400g", brand: "Mother Dairy", category: "Dairy", barcode: "8901491500018", mrp: money(45), costPrice: money(38), quantity: 30, reorderThreshold: 15, expiryDate: daysFromNow(3), batchNumber: "MD240918", pushToMarketplace: true, clearanceDiscountPct: 40 },
    { merchantId: "m_kirana_02", name: "Sunfeast Dark Fantasy 300g", brand: "Sunfeast", category: "Biscuits", barcode: "8901234567001", mrp: money(120), costPrice: money(95), quantity: 40, reorderThreshold: 12, expiryDate: daysFromNow(90), pushToMarketplace: false, clearanceDiscountPct: 0 },
  ];

  const kiranaIds: string[] = [];
  for (const p of kiranaProducts) {
    const id = randomUUID();
    kiranaIds.push(id);
    await db.insert(products).values({ id, ...p });
  }

  // --------- Medical products ---------
  const medicalProducts: P[] = [
    { merchantId: "m_medical_01", name: "Dolo 650 (Paracetamol) Strip of 15", brand: "Micro Labs", category: "Analgesic", barcode: "8901234500011", mrp: money(32), costPrice: money(24), quantity: 120, reorderThreshold: 40, expiryDate: daysFromNow(365), batchNumber: "DL240401", scheduleClass: "OTC", requiresPrescription: false, pushToMarketplace: false, clearanceDiscountPct: 0 },
    { merchantId: "m_medical_01", name: "Cetzine 10mg Strip of 10", brand: "Dr. Reddy's", category: "Antihistamine", barcode: "8901234500022", mrp: money(35), costPrice: money(26), quantity: 90, reorderThreshold: 30, expiryDate: daysFromNow(280), batchNumber: "CZ240505", scheduleClass: "OTC", requiresPrescription: false, pushToMarketplace: false, clearanceDiscountPct: 0 },
    { merchantId: "m_medical_01", name: "Augmentin 625 (Amox+Clav) Strip of 10", brand: "GSK", category: "Antibiotic", barcode: "8901234500033", mrp: money(245), costPrice: money(185), quantity: 22, reorderThreshold: 10, expiryDate: daysFromNow(180), batchNumber: "AG240201", scheduleClass: "SCHEDULE_H", requiresPrescription: true, pushToMarketplace: false, clearanceDiscountPct: 0 },
    { merchantId: "m_medical_01", name: "Atorvastatin 20mg Strip of 15", brand: "Cipla", category: "Cardiac", barcode: "8901234500044", mrp: money(180), costPrice: money(135), quantity: 45, reorderThreshold: 20, expiryDate: daysFromNow(240), batchNumber: "AT240308", scheduleClass: "SCHEDULE_H", requiresPrescription: true, pushToMarketplace: false, clearanceDiscountPct: 0 },
    { merchantId: "m_medical_01", name: "Alprazolam 0.5mg Strip of 10", brand: "Torrent", category: "Psychiatric", barcode: "8901234500055", mrp: money(72), costPrice: money(55), quantity: 18, reorderThreshold: 8, expiryDate: daysFromNow(200), batchNumber: "AL240110", scheduleClass: "SCHEDULE_H1", requiresPrescription: true, pushToMarketplace: false, clearanceDiscountPct: 0 },
    { merchantId: "m_medical_01", name: "Glycomet 500mg Strip of 20", brand: "USV", category: "Diabetic", barcode: "8901234500066", mrp: money(85), costPrice: money(62), quantity: 60, reorderThreshold: 25, expiryDate: daysFromNow(300), batchNumber: "GL240412", scheduleClass: "SCHEDULE_H", requiresPrescription: true, pushToMarketplace: false, clearanceDiscountPct: 0 },
    { merchantId: "m_medical_01", name: "ORS Powder Sachets (Pack of 10)", brand: "FDC", category: "Rehydration", barcode: "8901234500077", mrp: money(45), costPrice: money(30), quantity: 12, reorderThreshold: 8, expiryDate: daysFromNow(8), batchNumber: "OR240901", scheduleClass: "OTC", requiresPrescription: false, pushToMarketplace: true, clearanceDiscountPct: 25 },
    { merchantId: "m_medical_01", name: "Cetraben Emollient Cream 100g", brand: "Cipla", category: "Dermatology", barcode: "8901234500088", mrp: money(310), costPrice: money(240), quantity: 6, reorderThreshold: 5, expiryDate: daysFromNow(14), batchNumber: "CB240601", scheduleClass: "OTC", requiresPrescription: false, pushToMarketplace: true, clearanceDiscountPct: 35 },
    { merchantId: "m_medical_01", name: "Limcee Vitamin C 500mg (15 tabs)", brand: "Abbott", category: "Vitamins", barcode: "8901234500099", mrp: money(35), costPrice: money(25), quantity: 80, reorderThreshold: 20, expiryDate: daysFromNow(240), scheduleClass: "OTC", requiresPrescription: false, pushToMarketplace: false, clearanceDiscountPct: 0 },
  ];

  const medicalIds: string[] = [];
  for (const p of medicalProducts) {
    const id = randomUUID();
    medicalIds.push(id);
    await db.insert(products).values({ id, ...p });
  }

  // --------- Transactions (last 60 days) ---------
  const allIds = [...kiranaIds, ...medicalIds];
  const allProducts = [...kiranaProducts, ...medicalProducts];
  const merchantOf = new Map<string, string>(allIds.map((id, idx) => [id, allProducts[idx].merchantId]));
  const mrpOf = new Map<string, number>(allIds.map((id, idx) => [id, parseFloat(String(allProducts[idx].mrp))]));

  const txRows: Array<typeof transactions.$inferInsert> = [];
  for (let day = 0; day < 60; day++) {
    const date = daysAgo(day);
    const txCount = 18 + Math.floor(Math.random() * 12);
    for (let i = 0; i < txCount; i++) {
      const pid = allIds[Math.floor(Math.random() * allIds.length)];
      const qty = 1 + Math.floor(Math.random() * 3);
      const unitPrice = mrpOf.get(pid) ?? 50;
      const total = +(unitPrice * qty).toFixed(2);
      const mid = merchantOf.get(pid)!;
      txRows.push({
        id: randomUUID(),
        merchantId: mid,
        productId: pid,
        quantity: qty,
        unitPrice: money(unitPrice),
        total: money(total),
        soldBy: mid === "m_kirana_01" ? (Math.random() > 0.5 ? "u_owner_01" : "u_clerk_01") : "u_owner_02",
        createdAt: date,
      });
    }
  }
  const BATCH = 400;
  for (let i = 0; i < txRows.length; i += BATCH) {
    await db.insert(transactions).values(txRows.slice(i, i + BATCH));
  }

  // --------- Prediction cache ---------
  const predictions = [
    { merchantId: "m_kirana_01", productId: kiranaIds[3], forecastQty: 40, confidence: "0.84", reason: "Evening-snack velocity up 32% this week; festive week approaching." },
    { merchantId: "m_kirana_01", productId: kiranaIds[4], forecastQty: 25, confidence: "0.78", reason: "Stock < reorder threshold; historical sell-rate rising." },
    { merchantId: "m_kirana_01", productId: kiranaIds[0], forecastQty: 60, confidence: "0.91", reason: "Dairy staple; high morning velocity; expiry risk in 4 days." },
    { merchantId: "m_medical_01", productId: medicalIds[0], forecastQty: 50, confidence: "0.88", reason: "Seasonal fever wave detected in PIN region; +27% week-on-week." },
    { merchantId: "m_medical_01", productId: medicalIds[5], forecastQty: 40, confidence: "0.82", reason: "Chronic-refill cycle: 73% of diabetic patients due for refill this week." },
    { merchantId: "m_medical_01", productId: medicalIds[1], forecastQty: 30, confidence: "0.75", reason: "Monsoon allergy season — antihistamine demand trending up." },
  ];
  for (const p of predictions) {
    await db.insert(predictionCache).values({ id: randomUUID(), ...p });
  }

  // --------- Platform ledger ---------
  const months = ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09"];
  const ledgerSeeds = [
    { merchantId: "m_kirana_01", saasTier: "Growth", saasFee: money(999) },
    { merchantId: "m_kirana_02", saasTier: "Starter", saasFee: money(499) },
    { merchantId: "m_medical_01", saasTier: "Enterprise", saasFee: money(2499) },
  ];
  for (const l of ledgerSeeds) {
    for (const m of months) {
      const grossGmv = +(120000 + Math.random() * 180000).toFixed(2);
      const commPct = l.saasTier === "Enterprise" ? 2.5 : l.saasTier === "Growth" ? 3.5 : 4.5;
      const commAmount = +((grossGmv * commPct) / 100).toFixed(2);
      await db.insert(platformLedger).values({
        id: randomUUID(),
        merchantId: l.merchantId,
        month: m,
        grossGmv: money(grossGmv),
        commissionPct: money(commPct),
        commissionAmount: money(commAmount),
        saasTier: l.saasTier,
        saasFee: l.saasFee,
      });
    }
  }

  // --------- Regional tickers (anonymized) ---------
  const tickerSeed = [
    { region: "Pune", category: "Dairy", avgWholesale: 58, trendPct: 4.2, sampleSize: 182 },
    { region: "Pune", category: "Biscuits", avgWholesale: 112, trendPct: -1.1, sampleSize: 96 },
    { region: "Pune", category: "Staples", avgWholesale: 34, trendPct: 2.8, sampleSize: 210 },
    { region: "Pune", category: "Analgesic", avgWholesale: 26, trendPct: 9.1, sampleSize: 64 },
    { region: "Mumbai", category: "Dairy", avgWholesale: 61, trendPct: 3.5, sampleSize: 302 },
    { region: "Mumbai", category: "Snacks", avgWholesale: 28, trendPct: 1.9, sampleSize: 158 },
    { region: "Mumbai", category: "Staples", avgWholesale: 32, trendPct: 0.6, sampleSize: 190 },
    { region: "Bengaluru", category: "Antihistamine", avgWholesale: 28, trendPct: 11.4, sampleSize: 74 },
    { region: "Bengaluru", category: "Diabetic", avgWholesale: 68, trendPct: 0.8, sampleSize: 111 },
    { region: "Ahmedabad", category: "Staples", avgWholesale: 31, trendPct: 2.1, sampleSize: 140 },
    { region: "Ahmedabad", category: "Dairy", avgWholesale: 56, trendPct: 3.0, sampleSize: 168 },
  ];
  for (const t of tickerSeed) {
    await db.insert(regionalTickers).values({
      id: randomUUID(),
      region: t.region,
      category: t.category,
      avgWholesale: money(t.avgWholesale),
      trendPct: money(t.trendPct),
      sampleSize: t.sampleSize,
    });
  }

  // --------- Notification rules (vendors) ---------
  const notifRules = [
    { merchantId: "m_kirana_01", channel: "WHATSAPP", eventType: "LOW_STOCK", enabled: true, threshold: 15, messageTemplate: "⚠️ {{product}} is below {{threshold}} units. Order soon." },
    { merchantId: "m_kirana_01", channel: "WHATSAPP", eventType: "EXPIRY", enabled: true, threshold: 30, messageTemplate: "⏰ {{product}} expires in {{days}} days. Push to clearance?" },
    { merchantId: "m_kirana_01", channel: "EMAIL", eventType: "DAILY_SUMMARY", enabled: true, scheduleTime: "20:00", scheduleDays: "MON,TUE,WED,THU,FRI", recipientEmail: "owner@sharmastore.in", messageTemplate: "Today's summary: {{orders}} orders, ₹{{revenue}} revenue." },
    { merchantId: "m_kirana_01", channel: "IN_APP", eventType: "REORDER_DUE", enabled: true, threshold: 10 },
    { merchantId: "m_medical_01", channel: "WHATSAPP", eventType: "LOW_STOCK", enabled: true, threshold: 25, messageTemplate: "💊 Rx stock alert: {{product}} running low ({{current}} units)." },
    { merchantId: "m_medical_01", channel: "SMS", eventType: "EXPIRY", enabled: true, threshold: 15, messageTemplate: "Legal disposal alert: {{product}} expires in {{days}} days. Follow disposal protocol." },
    { merchantId: "m_medical_01", channel: "EMAIL", eventType: "DAILY_SUMMARY", enabled: true, scheduleTime: "21:00", scheduleDays: "MON,TUE,WED,THU,FRI,SAT", recipientEmail: "dispenser@arogyapharmacy.in" },
    { merchantId: "m_medical_01", channel: "WHATSAPP", eventType: "PRICE_CHANGE", enabled: true, messageTemplate: "📈 Price update: {{product}} now ₹{{newPrice}}." },
  ];
  for (const r of notifRules) {
    await db.insert(notificationRules).values({ id: randomUUID(), ...r });
  }

  // --------- Audit logs ---------
  const auditEntries = [
    { actorId: "u_admin_01", actorName: "Platform Admin", actorRole: "ADMIN", action: "APPROVE_KYC", target: "Sharma General Store" },
    { actorId: "u_admin_01", actorName: "Platform Admin", actorRole: "ADMIN", action: "APPROVE_KYC", target: "Green Basket Kirana" },
    { actorId: "u_admin_01", actorName: "Platform Admin", actorRole: "ADMIN", action: "APPROVE_KYC", target: "Arogya Pharmacy" },
    { actorId: "u_admin_01", actorName: "Platform Admin", actorRole: "ADMIN", action: "TOGGLE_COMPLIANCE", target: "block_schedule_h_on_marketplace → ON" },
    { actorId: "u_admin_01", actorName: "Platform Admin", actorRole: "ADMIN", action: "TOGGLE_COMPLIANCE", target: "allow_clearance_marketplace (MEDICAL) → OFF" },
    { actorId: "u_owner_01", actorName: "Rajesh Sharma", actorRole: "VENDOR_OWNER", merchantId: "m_kirana_01", action: "STOCK_ADJUST", target: "Amul Gold Milk +24 units" },
    { actorId: "u_owner_01", actorName: "Rajesh Sharma", actorRole: "VENDOR_OWNER", merchantId: "m_kirana_01", action: "CLEARANCE_PUSH", target: "Mother Dairy Dahi → 40% off" },
    { actorId: "u_clerk_01", actorName: "Suresh (Clerk)", actorRole: "VENDOR_CLERK", merchantId: "m_kirana_01", action: "SCAN_BARCODE", target: "8901187110018" },
    { actorId: "u_owner_02", actorName: "Dr. Anil Kulkarni", actorRole: "VENDOR_OWNER", merchantId: "m_medical_01", action: "STOCK_ADJUST", target: "Dolo 650 +50 units" },
    { actorId: "u_owner_02", actorName: "Dr. Anil Kulkarni", actorRole: "VENDOR_OWNER", merchantId: "m_medical_01", action: "LOGIN", target: "Passkey authentication" },
  ];
  for (let i = 0; i < auditEntries.length; i++) {
    const e = auditEntries[i];
    await db.insert(auditLogs).values({
      id: randomUUID(),
      actorId: e.actorId,
      actorName: e.actorName,
      actorRole: e.actorRole,
      merchantId: e.merchantId ?? null,
      action: e.action,
      target: e.target,
      createdAt: daysAgo(i),
    });
  }

  // --------- Announcements ---------
  const announcementsSeed = [
    { title: "🎉 Diwali readiness checklist", body: "Update your festive inventory now. Predictive engine is flagging sweets & dry-fruit demand spikes for next 2 weeks.", severity: "info", audience: "KIRANA" },
    { title: "⚠️ Monsoon pharma advisory", body: "Regional antihistamine demand up 27% in Bengaluru. Stock Cetzine, Allegra, and ORS sachets.", severity: "warning", audience: "MEDICAL" },
    { title: "🚨 Schedule H1 compliance reminder", body: "All Schedule H1 drugs must have prescription logs by Oct 31. Update clerk training.", severity: "critical", audience: "MEDICAL" },
    { title: "💡 New: Barcode printer integration", body: "Print shelf labels directly from the inventory tab. Enable in Store Settings.", severity: "info", audience: "ALL" },
  ];
  for (const a of announcementsSeed) {
    await db.insert(announcements).values({ id: randomUUID(), ...a });
  }

  // --------- Suppliers ---------
  const suppliersSeed = [
    { merchantId: "m_kirana_01", name: "Amul Dairy Distributor Pune", contactPerson: "Vinod Patil", phone: "+919820000101", email: "vinod@amul-dist.in", category: "Dairy", leadTimeDays: 1, rating: "4.8" },
    { merchantId: "m_kirana_01", name: "Britannia Regional Wholesaler", contactPerson: "Meera Joshi", phone: "+919820000102", email: "orders@britannia-wh.in", category: "Biscuits & Bakery", leadTimeDays: 2, rating: "4.5" },
    { merchantId: "m_kirana_01", name: "Tata Consumer FMCG Distributor", contactPerson: "Rohit Kulkarni", phone: "+919820000103", category: "Staples", leadTimeDays: 3, rating: "4.6" },
    { merchantId: "m_medical_01", name: "MedPlus Wholesale", contactPerson: "Dr. Kavita Rao", phone: "+919820000201", email: "kavita@medplus.in", category: "OTC & Generic", leadTimeDays: 1, rating: "4.9" },
    { merchantId: "m_medical_01", name: "Cipla Direct Channel", contactPerson: "Sanjay Menon", phone: "+919820000202", email: "sanjay@cipla-direct.in", category: "Rx & Specialty", leadTimeDays: 2, rating: "4.7" },
  ];
  for (const s of suppliersSeed) {
    await db.insert(suppliers).values({ id: randomUUID(), ...s });
  }

  // --------- Purchase orders ---------
  const poSeed = [
    { merchantId: "m_kirana_01", status: "RECEIVED", totalAmount: money(18400), itemCount: 6, notes: "Weekly dairy restock" },
    { merchantId: "m_kirana_01", status: "SENT", totalAmount: money(12300), itemCount: 4, notes: "Biscuits top-up", expectedDate: daysFromNow(2) },
    { merchantId: "m_medical_01", status: "DRAFT", totalAmount: money(42000), itemCount: 8, notes: "Monthly Rx restock" },
    { merchantId: "m_medical_01", status: "PARTIAL", totalAmount: money(28500), itemCount: 5, notes: "Partial OTC delivery" },
  ];
  for (const po of poSeed) {
    await db.insert(purchaseOrders).values({ id: randomUUID(), ...po });
  }

  // --------- Store notes ---------
  const notesSeed = [
    { merchantId: "m_kirana_01", authorId: "u_owner_01", authorName: "Rajesh", title: "Diwali promo plan", body: "Buy 2 get 1 on biscuits starting Oct 20. Coordinate with Britannia rep.", pinned: true },
    { merchantId: "m_kirana_01", authorId: "u_clerk_01", authorName: "Suresh", title: "Broken stock incident", body: "3 Amul milk packets damaged in fridge power-cut. Write off needed.", pinned: false },
    { merchantId: "m_medical_01", authorId: "u_owner_02", authorName: "Dr. Anil", title: "Schedule H audit", body: "Drug inspector visit scheduled next week. Pull all H1 logs by Friday.", pinned: true },
  ];
  for (const n of notesSeed) {
    await db.insert(storeNotes).values({ id: randomUUID(), ...n });
  }

  // --------- Support tickets ---------
  const ticketsSeed = [
    { merchantId: "m_kirana_02", merchantName: "Green Basket Kirana", requesterName: "Priya Nair", requesterEmail: "priya@greenbasket.in", subject: "Scanner not detecting dairy barcodes", body: "Camera-based scanner fails on curved milk packets. Works fine on flat boxes.", priority: "high", status: "open" },
    { merchantId: "m_pending_01", merchantName: "Wellness Medicals", requesterName: "Sana Khan", subject: "KYC stuck in pending", body: "Submitted license 4 days ago. Customer onboarding blocked.", priority: "urgent", status: "open" },
    { requesterName: "Guest user", subject: "Marketplace expiry date display wrong", body: "A listing shows 'expires in -2d'. Please fix.", priority: "high", status: "in_progress" },
    { merchantId: "m_kirana_01", merchantName: "Sharma General Store", requesterName: "Rajesh", subject: "WhatsApp OTP not arriving", body: "Tried 3 times. No OTP on +919811100001.", priority: "medium", status: "resolved" },
  ];
  for (const t of ticketsSeed) {
    await db.insert(supportTickets).values({ id: randomUUID(), ...t });
  }

  // --------- Vendor scorecards ---------
  const scorecardSeed = [
    { merchantId: "m_kirana_01", month: "2026-09", fulfillmentScore: "92.4", accuracyScore: "96.1", complianceScore: "99.9", responseScore: "88.5", overallScore: "94.2" },
    { merchantId: "m_kirana_02", month: "2026-09", fulfillmentScore: "85.3", accuracyScore: "91.8", complianceScore: "95.0", responseScore: "82.0", overallScore: "88.5" },
    { merchantId: "m_medical_01", month: "2026-09", fulfillmentScore: "97.1", accuracyScore: "98.8", complianceScore: "99.9", responseScore: "95.2", overallScore: "97.8" },
  ];
  for (const s of scorecardSeed) {
    await db.insert(vendorScorecards).values({ id: randomUUID(), ...s });
  }

  // --------- Store settings ---------
  await db.insert(storeSettings).values({ id: randomUUID(), merchantId: "m_kirana_01", openTime: "07:00", closeTime: "22:00", taxRatePct: "5.00", gstNumber: "27AABCS1234A1Z5", deliveryRadiusKm: 5, enableDelivery: true });
  await db.insert(storeSettings).values({ id: randomUUID(), merchantId: "m_medical_01", openTime: "08:00", closeTime: "23:00", taxRatePct: "12.00", gstNumber: "27AABCA5678B1Z3", deliveryRadiusKm: 3, enableDelivery: true });

  // --------- Sales returns ---------
  const returnsSeed = [
    { merchantId: "m_kirana_01", quantity: 2, refundAmount: money(136), reason: "Expired — customer returned" },
    { merchantId: "m_kirana_01", quantity: 1, refundAmount: money(150), reason: "Damaged packaging" },
    { merchantId: "m_medical_01", quantity: 1, refundAmount: money(32), reason: "Wrong item dispensed" },
  ];
  for (const r of returnsSeed) {
    await db.insert(salesReturns).values({ id: randomUUID(), ...r, createdAt: daysAgo(Math.floor(Math.random() * 10)) });
  }

  // --------- API keys (demo) ---------
  await db.insert(apiKeys).values({
    id: randomUUID(),
    merchantId: "m_kirana_01",
    name: "POS Terminal #1",
    keyHash: "abc123",
    last4: "x4f2",
    scopes: "read:inventory,write:sales",
    active: true,
  });

  // --------- Consumers (demo customers) ---------
  await db.insert(consumers).values([
    { id: "c_priya", name: "Priya Sharma", phone: "+919876543210", email: "priya@example.com", defaultAddress: "42 MG Road, Pune", createdAt: daysAgo(45) },
    { id: "c_rohit", name: "Rohit Mehta", phone: "+919876543211", email: "rohit@example.com", defaultAddress: "15 FC Road, Pune", createdAt: daysAgo(30) },
    { id: "c_ananya", name: "Ananya Desai", phone: "+919876543212", email: "ananya@example.com", defaultAddress: "78 JM Road, Pune", createdAt: daysAgo(20) },
    { id: "c_vikram", name: "Vikram Singh", phone: "+919876543213", email: "vikram@example.com", defaultAddress: "23 Baner Road, Pune", createdAt: daysAgo(10) },
  ]);

  // --------- Orders (demo orders with different statuses) ---------
  const orderId1 = randomUUID();
  const orderId2 = randomUUID();
  const orderId3 = randomUUID();
  const orderId4 = randomUUID();

  await db.insert(orders).values([
    {
      id: orderId1,
      consumerId: "c_priya",
      merchantId: "m_kirana_01",
      consumerName: "Priya Sharma",
      totalAmount: money(450),
      status: "pending",
      deliveryAddress: "42 MG Road, Pune 411001",
      deliveryPhone: "+919876543210",
      notes: "Please deliver before 6 PM",
      createdAt: daysAgo(0),
    },
    {
      id: orderId2,
      consumerId: "c_rohit",
      merchantId: "m_kirana_01",
      consumerName: "Rohit Mehta",
      totalAmount: money(280),
      status: "confirmed",
      deliveryAddress: "15 FC Road, Pune 411005",
      deliveryPhone: "+919876543211",
      notes: null,
      createdAt: daysAgo(1),
    },
    {
      id: orderId3,
      consumerId: "c_ananya",
      merchantId: "m_kirana_01",
      consumerName: "Ananya Desai",
      totalAmount: money(620),
      status: "packed",
      deliveryAddress: "78 JM Road, Pune 411004",
      deliveryPhone: "+919876543212",
      notes: "Call before delivery",
      createdAt: daysAgo(2),
    },
    {
      id: orderId4,
      consumerId: "c_vikram",
      merchantId: "m_kirana_01",
      consumerName: "Vikram Singh",
      totalAmount: money(195),
      status: "delivered",
      deliveryAddress: "23 Baner Road, Pune 411045",
      deliveryPhone: "+919876543213",
      notes: null,
      createdAt: daysAgo(5),
      deliveredAt: daysAgo(4),
    },
  ]);

  // --------- Order Items ---------
  // We need valid product IDs from existing products. Use first 4 kirana products.
  // Order 1: Priya's pending order
  await db.insert(orderItems).values([
    { id: randomUUID(), orderId: orderId1, productId: kiranaIds[0], productName: "Amul Gold Milk 1L", quantity: 3, price: money(68), subtotal: money(204) },
    { id: randomUUID(), orderId: orderId1, productId: kiranaIds[1], productName: "Britannia Bread", quantity: 2, price: money(45), subtotal: money(90) },
    { id: randomUUID(), orderId: orderId1, productId: kiranaIds[4], productName: "Parle-G Biscuits", quantity: 4, price: money(20), subtotal: money(80) },
    { id: randomUUID(), orderId: orderId1, productId: kiranaIds[2], productName: "Tata Salt 1kg", quantity: 1, price: money(28), subtotal: money(28) },
  ]);

  // Order 2: Rohit's confirmed order
  await db.insert(orderItems).values([
    { id: randomUUID(), orderId: orderId2, productId: kiranaIds[7], productName: "Mother Dairy Curd 400g", quantity: 4, price: money(35), subtotal: money(140) },
    { id: randomUUID(), orderId: orderId2, productId: kiranaIds[3], productName: "Haldiram Namkeen", quantity: 2, price: money(70), subtotal: money(140) },
  ]);

  // Order 3: Ananya's packed order
  await db.insert(orderItems).values([
    { id: randomUUID(), orderId: orderId3, productId: kiranaIds[6], productName: "Aashirvaad Atta 5kg", quantity: 1, price: money(320), subtotal: money(320) },
    { id: randomUUID(), orderId: orderId3, productId: kiranaIds[5], productName: "Fortune Oil 1L", quantity: 1, price: money(180), subtotal: money(180) },
    { id: randomUUID(), orderId: orderId3, productId: kiranaIds[4], productName: "MDH Spices Pack", quantity: 2, price: money(60), subtotal: money(120) },
  ]);

  // Order 4: Vikram's delivered order
  await db.insert(orderItems).values([
    { id: randomUUID(), orderId: orderId4, productId: kiranaIds[3], productName: "Maggi Noodles Pack", quantity: 5, price: money(14), subtotal: money(70) },
    { id: randomUUID(), orderId: orderId4, productId: kiranaIds[3], productName: "Lays Chips", quantity: 3, price: money(20), subtotal: money(60) },
    { id: randomUUID(), orderId: orderId4, productId: kiranaIds[3], productName: "Coca Cola 750ml", quantity: 2, price: money(35), subtotal: money(70) },
  ]);

  console.log("✅ Seeded demo orders for vendor orders page");
}

export async function resetAndSeed() {
  // Reset tables in FK-safe order
  await db.delete(activityFeed);
  await db.delete(reviews);
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(scheduleHLogs);
  await db.delete(consumers);
  await db.delete(consumerFavorites);
  await db.delete(apiKeys);
  await db.delete(salesReturns);
  await db.delete(vendorScorecards);
  await db.delete(storeSettings);
  await db.delete(storeNotes);
  await db.delete(supportTickets);
  await db.delete(purchaseOrders);
  await db.delete(suppliers);
  await db.delete(announcements);
  await db.delete(auditLogs);
  await db.delete(notificationRules);
  await db.delete(inferenceLogs);
  await db.delete(predictionCache);
  await db.delete(transactions);
  await db.delete(products);
  await db.delete(platformLedger);
  await db.delete(regionalTickers);
  await db.delete(complianceSwitches);
  await db.delete(otpSessions);
  await db.delete(users);
  await db.delete(merchants);
  await seedIfEmpty();
}
