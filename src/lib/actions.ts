"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  merchants,
  users,
  products,
  complianceSwitches,
  platformLedger,
  predictionCache,
  regionalTickers,
  transactions,
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
  orders,
  orderItems,
  consumers,
  consumerFavorites,
  scheduleHLogs,
} from "@/db/schema";
import { eq, and, sql, gte, inArray, desc } from "drizzle-orm";
import {
  getSession,
  setSession,
  clearSession,
  createOtpSession,
  verifyOtp,
  getUserByPhone,
  requireRole,
  type SessionUser,
} from "@/lib/auth";
import { seedIfEmpty } from "@/lib/seed";
import { randomUUID, createHmac } from "node:crypto";

// Drizzle attaches the raw SQL of a failed statement to its errors.
// Customer-facing flows must never surface that to the shopper.
const DATABASE_ERROR_PATTERN =
  /failed query|duplicate key value|violates .*constraint|syntax error|relation .* does not exist/i;

function toCustomerFacingError(error: unknown, fallback: string): string {
  if (!(error instanceof Error) || !error.message) return fallback;
  if (DATABASE_ERROR_PATTERN.test(error.message)) return fallback;
  return error.message;
}

// ---------------------------------------------------------
// Ensure seed runs on first request (cheap check)
// ---------------------------------------------------------
export async function ensureSeeded(accessKey = "") {
  if (process.env.NODE_ENV === "production" && (!process.env.DEMO_ACCESS_KEY || accessKey !== process.env.DEMO_ACCESS_KEY)) {
    return;
  }
  await seedIfEmpty();
}

// ---------------------------------------------------------
// Auth actions
// ---------------------------------------------------------
export async function requestOtp(phone: string) {
  if (!/^\+?[0-9]{9,15}$/.test(phone.replace(/\s/g, ""))) {
    return { ok: false, error: "Invalid phone number" };
  }
  if (process.env.NODE_ENV === "production") {
    return { ok: false, error: "Phone OTP delivery is not configured for this deployment." };
  }
  // Ensure seeded demo users exist
  await seedIfEmpty();
  const result = await createOtpSession(phone, "WHATSAPP");
  // Demo convenience: expose OTP in response. In production, never do this.
  return { ok: true, otp: result.otp, channel: "WHATSAPP" } as const;
}

export async function verifyAndLogin(phone: string, otp: string) {
  const valid = await verifyOtp(phone, otp);
  if (!valid) return { ok: false, error: "Invalid or expired OTP" };
  const info = await getUserByPhone(phone);
  if (!info) return { ok: false, error: "No account registered for this phone." };
  await setSession(info.session);
  const redirect = info.user.role === "ADMIN" ? "/admin" : "/vendor";
  return { ok: true, redirect, role: info.user.role };
}

export async function logout() {
  await clearSession();
}

export async function impersonateDemo(phone: string, accessKey: string) {
  const configuredKey = process.env.DEMO_ACCESS_KEY;
  if (process.env.NODE_ENV === "production" && !configuredKey) {
    return { ok: false, error: "Demo access is disabled on this deployment." };
  }
  if (configuredKey && accessKey !== configuredKey) {
    return { ok: false, error: "Invalid prototype access key." };
  }
  await seedIfEmpty();
  const info = await getUserByPhone(phone);
  if (!info) return { ok: false, error: "Demo account not found" };
  await setSession(info.session);
  const redirect = info.user.role === "ADMIN" ? "/admin" : "/vendor";
  return { ok: true, redirect };
}

// ---------------------------------------------------------
// Admin: KYC approvals
// ---------------------------------------------------------
export async function listPendingKyc() {
  const session = await getSession();
  const s = requireRole(session, ["ADMIN"]);
  void s;
  return db
    .select()
    .from(merchants)
    .where(inArray(merchants.kycStatus, ["PENDING", "UNDER_REVIEW"]))
    .orderBy(desc(merchants.createdAt));
}

export async function listAllMerchants() {
  const session = await getSession();
  const s = requireRole(session, ["ADMIN"]);
  void s;
  return db.select().from(merchants).orderBy(desc(merchants.createdAt));
}

export async function approveKyc(merchantId: string, notes?: string) {
  const session = await getSession();
  const s = requireRole(session, ["ADMIN"]);
  void s;
  await db
    .update(merchants)
    .set({ kycStatus: "APPROVED", approvedAt: new Date(), kycNotes: notes ?? null })
    .where(eq(merchants.id, merchantId));
  revalidatePath("/admin");
  return { ok: true };
}

export async function rejectKyc(merchantId: string, notes: string) {
  const session = await getSession();
  const s = requireRole(session, ["ADMIN"]);
  void s;
  await db
    .update(merchants)
    .set({ kycStatus: "REJECTED", kycNotes: notes })
    .where(eq(merchants.id, merchantId));
  revalidatePath("/admin");
  return { ok: true };
}

// ---------------------------------------------------------
// Admin: compliance switches
// ---------------------------------------------------------
export async function listComplianceSwitches() {
  const session = await getSession();
  const s = requireRole(session, ["ADMIN"]);
  void s;
  return db.select().from(complianceSwitches);
}

export async function toggleCompliance(id: string, enabled: boolean) {
  const session = await getSession();
  const s = requireRole(session, ["ADMIN"]);
  void s;
  await db
    .update(complianceSwitches)
    .set({ enabled, updatedAt: new Date() })
    .where(eq(complianceSwitches.id, id));
  revalidatePath("/admin");
  return { ok: true };
}

// ---------------------------------------------------------
// Admin: ledger
// ---------------------------------------------------------
export async function listPlatformLedger() {
  const session = await getSession();
  const s = requireRole(session, ["ADMIN"]);
  void s;
  const rows = await db
    .select({
      id: platformLedger.id,
      merchantId: platformLedger.merchantId,
      month: platformLedger.month,
      grossGmv: platformLedger.grossGmv,
      commissionPct: platformLedger.commissionPct,
      commissionAmount: platformLedger.commissionAmount,
      saasTier: platformLedger.saasTier,
      saasFee: platformLedger.saasFee,
      merchantName: merchants.name,
      merchantType: merchants.type,
      merchantCity: merchants.city,
    })
    .from(platformLedger)
    .leftJoin(merchants, eq(platformLedger.merchantId, merchants.id))
    .orderBy(desc(platformLedger.month));
  return rows;
}

export async function listRegionalTickers() {
  const session = await getSession();
  const s = requireRole(session, ["ADMIN"]);
  void s;
  return db.select().from(regionalTickers).orderBy(regionalTickers.region, regionalTickers.category);
}

// ---------------------------------------------------------
// Vendor: inventory
// ---------------------------------------------------------
export async function listMyProducts() {
  const session = await getSession();
  const s = requireRole(session, ["VENDOR_OWNER", "VENDOR_CLERK"]);
  if (!s.merchantId) return [];
  return db
    .select()
    .from(products)
    .where(eq(products.merchantId, s.merchantId))
    .orderBy(products.expiryDate);
}

export async function updateProductClearance(productId: string, push: boolean, discount: number) {
  const session = await getSession();
  const s = requireRole(session, ["VENDOR_OWNER"]);
  if (!s.merchantId) throw new Error("No merchant");

  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.merchantId, s.merchantId)))
    .limit(1);
  if (!product) throw new Error("Product not found");

  let finalPush = push;
  const blocked = await getMarketplaceBlocks(s.merchantType ?? "KIRANA", product.scheduleClass);
  if (push && blocked.blocked) {
    finalPush = false;
  }

  await db
    .update(products)
    .set({
      pushToMarketplace: finalPush,
      clearanceDiscountPct: Math.max(0, Math.min(90, Math.round(discount))),
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId));
  revalidatePath("/vendor");
  revalidatePath("/marketplace");
  return { ok: true, blocked: blocked.blocked, reason: blocked.reason };
}

async function getMarketplaceBlocks(merchantType: "KIRANA" | "MEDICAL", scheduleClass: string | null | undefined) {
  const switches = await db
    .select()
    .from(complianceSwitches)
    .where(eq(complianceSwitches.merchantType, merchantType));
  const map = new Map(switches.map((sw) => [sw.key, sw.enabled]));

  if (merchantType === "MEDICAL") {
    if (!map.get("allow_clearance_marketplace")) {
      return { blocked: true, reason: "Medical marketplace clearance is disabled by platform compliance." };
    }
    if (scheduleClass === "SCHEDULE_H" && map.get("block_schedule_h_on_marketplace")) {
      return { blocked: true, reason: "Schedule H drugs are hard-blocked from public clearance." };
    }
    if (scheduleClass === "SCHEDULE_X" && map.get("block_schedule_x_on_marketplace")) {
      return { blocked: true, reason: "Schedule X drugs are hard-blocked from public clearance." };
    }
    if (scheduleClass === "SCHEDULE_H1" && map.get("block_schedule_h_on_marketplace")) {
      return { blocked: true, reason: "Schedule H1 drugs are hard-blocked from public clearance." };
    }
  }
  if (merchantType === "KIRANA" && !map.get("allow_clearance_marketplace")) {
    return { blocked: true, reason: "Kirana marketplace clearance is disabled by platform compliance." };
  }
  return { blocked: false, reason: null };
}

export async function updateStock(productId: string, newQty: number) {
  const session = await getSession();
  const s = requireRole(session, ["VENDOR_OWNER"]);
  if (!s.merchantId) throw new Error("No merchant");
  if (!Number.isSafeInteger(newQty) || newQty < 0) {
    return { ok: false, error: "Stock quantity must be a non-negative whole number." };
  }
  await db
    .update(products)
    .set({ quantity: Math.max(0, newQty), updatedAt: new Date() })
    .where(and(eq(products.id, productId), eq(products.merchantId, s.merchantId)));
  revalidatePath("/vendor");
  return { ok: true };
}

export async function completePosSale(data: {
  items: Array<{ productId: string; quantity: number }>;
  patientName?: string;
  doctorName?: string;
  prescriptionKey?: string;
}) {
  const session = requireRole(await getSession(), ["VENDOR_OWNER", "VENDOR_CLERK"]);
  if (!session.merchantId) return { ok: false, error: "No store is attached to this account." };
  if (session.role === "VENDOR_CLERK" && session.accessLevel === "SCAN_ONLY") {
    return { ok: false, error: "Your staff account is scan-only." };
  }
  if (!data.items.length || data.items.length > 100) {
    return { ok: false, error: "Add at least one item to the bill." };
  }
  const productIds = data.items.map((item) => item.productId);
  if (new Set(productIds).size !== productIds.length || data.items.some((item) => !Number.isSafeInteger(item.quantity) || item.quantity < 1)) {
    return { ok: false, error: "The bill contains invalid items or quantities." };
  }

  try {
    const receiptId = randomUUID();
    const sale = await db.transaction(async (tx) => {
      const storedProducts = await tx.select().from(products).where(
        and(inArray(products.id, productIds), eq(products.merchantId, session.merchantId!))
      );
      if (storedProducts.length !== productIds.length) throw new Error("One or more items do not belong to this store.");

      const productById = new Map(storedProducts.map((product) => [product.id, product]));
      const lines = data.items.map((item) => {
        const product = productById.get(item.productId);
        if (!product || product.quantity < item.quantity) throw new Error(`${product?.name ?? "Item"} has insufficient stock.`);
        if (product.expiryDate && product.expiryDate.getTime() < Date.now()) throw new Error(`${product.name} is expired and cannot be sold.`);
        return { product, quantity: item.quantity, unitPrice: Number(product.mrp) };
      });

      const regulatedLines = lines.filter(({ product }) =>
        product.scheduleClass === "SCHEDULE_H" || product.scheduleClass === "SCHEDULE_H1" || product.scheduleClass === "SCHEDULE_X" || product.requiresPrescription
      );
      if (regulatedLines.length) {
        if (!data.patientName?.trim() || !data.doctorName?.trim()) {
          throw new Error("Patient and doctor names are required for prescription medicines.");
        }
        if (!data.prescriptionKey?.startsWith(`${session.id}/prescription/`)) {
          throw new Error("Upload a prescription for this sale before completing checkout.");
        }
      }

      const [settings] = await tx.select({ taxRatePct: storeSettings.taxRatePct }).from(storeSettings)
        .where(eq(storeSettings.merchantId, session.merchantId!)).limit(1);
      const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
      const taxRatePct = Number(settings?.taxRatePct ?? "5");
      const tax = subtotal * taxRatePct / 100;

      for (const line of lines) {
        const updated = await tx.update(products)
          .set({ quantity: sql`${products.quantity} - ${line.quantity}`, updatedAt: new Date() })
          .where(and(
            eq(products.id, line.product.id),
            eq(products.merchantId, session.merchantId!),
            gte(products.quantity, line.quantity)
          ))
          .returning({ id: products.id });
        if (!updated.length) throw new Error(`${line.product.name} just sold out. Refresh and try again.`);

        const transactionId = randomUUID();
        await tx.insert(transactions).values({
          id: transactionId,
          merchantId: session.merchantId!,
          productId: line.product.id,
          quantity: line.quantity,
          unitPrice: line.unitPrice.toFixed(2),
          total: (line.unitPrice * line.quantity).toFixed(2),
          soldBy: session.id,
        });

        if (regulatedLines.some((regulated) => regulated.product.id === line.product.id)) {
          await tx.insert(scheduleHLogs).values({
            id: randomUUID(),
            merchantId: session.merchantId!,
            productId: line.product.id,
            transactionId,
            patientName: data.patientName!.trim(),
            doctorName: data.doctorName!.trim(),
            prescriptionUrl: data.prescriptionKey!,
            quantity: line.quantity,
          });
        }
      }

      await tx.insert(activityFeed).values({
        id: randomUUID(),
        merchantId: session.merchantId!,
        actorName: session.name,
        action: "POS_SALE",
        target: `${lines.length} products · ₹${(subtotal + tax).toFixed(2)}`,
      });

      return { subtotal, tax, total: subtotal + tax, taxRatePct };
    });

    revalidatePath("/vendor");
    return { ok: true, receiptId, ...sale };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not complete this sale." };
  }
}

export async function scanBarcode(barcode: string) {
  const session = await getSession();
  const s = requireRole(session, ["VENDOR_OWNER", "VENDOR_CLERK"]);
  if (!s.merchantId) return { found: false };
  const [row] = await db
    .select()
    .from(products)
    .where(and(eq(products.barcode, barcode), eq(products.merchantId, s.merchantId)))
    .limit(1);
  if (!row) return { found: false };
  return { found: true, product: row };
}

export async function addInventoryProduct(data: {
  name: string;
  brand?: string;
  category: string;
  barcode?: string;
  mrp: number;
  costPrice: number;
  quantity: number;
  reorderThreshold: number;
  batchNumber?: string;
  expiryDate?: string;
  scheduleClass?: "OTC" | "SCHEDULE_H" | "SCHEDULE_H1" | "SCHEDULE_X";
  requiresPrescription?: boolean;
  imageUrl?: string;
}) {
  const session = requireRole(await getSession(), ["VENDOR_OWNER"]);
  if (!session.merchantId) return { ok: false, error: "No store is attached to this account." };
  if (!data.name.trim() || !data.category.trim() || !Number.isFinite(data.mrp) || data.mrp <= 0 ||
      !Number.isFinite(data.costPrice) || data.costPrice < 0 || !Number.isSafeInteger(data.quantity) || data.quantity < 0 ||
      !Number.isSafeInteger(data.reorderThreshold) || data.reorderThreshold < 0) {
    return { ok: false, error: "Enter a product name, category, valid prices, and whole-number stock values." };
  }
  if (session.merchantType === "MEDICAL" && !data.scheduleClass) {
    return { ok: false, error: "Select the medicine schedule classification." };
  }
  if (data.expiryDate && Number.isNaN(new Date(`${data.expiryDate}T23:59:59.000Z`).getTime())) {
    return { ok: false, error: "Enter a valid expiry date." };
  }

  try {
    if (data.barcode?.trim()) {
      const [existing] = await db.select({ id: products.id }).from(products).where(
        and(eq(products.merchantId, session.merchantId), eq(products.barcode, data.barcode.trim()))
      ).limit(1);
      if (existing) return { ok: false, error: "This barcode is already in your inventory." };
    }
    const productId = randomUUID();
    await db.transaction(async (tx) => {
      await tx.insert(products).values({
        id: productId,
        merchantId: session.merchantId!,
        name: data.name.trim(),
        brand: data.brand?.trim() || null,
        category: data.category.trim(),
        barcode: data.barcode?.trim() || null,
        mrp: data.mrp.toFixed(2),
        costPrice: data.costPrice.toFixed(2),
        quantity: data.quantity,
        reorderThreshold: data.reorderThreshold,
        batchNumber: data.batchNumber?.trim() || null,
        expiryDate: data.expiryDate ? new Date(`${data.expiryDate}T23:59:59.000Z`) : null,
        scheduleClass: session.merchantType === "MEDICAL" ? data.scheduleClass ?? "OTC" : null,
        requiresPrescription: Boolean(data.requiresPrescription),
        imageUrl: data.imageUrl ?? null,
      });
      await tx.insert(auditLogs).values({
        id: randomUUID(), actorId: session.id, actorName: session.name, actorRole: session.role,
        merchantId: session.merchantId, action: "CREATE_PRODUCT", target: data.name.trim(),
      });
      await tx.insert(activityFeed).values({
        id: randomUUID(), merchantId: session.merchantId, actorName: session.name,
        action: "PRODUCT_ADDED", target: data.name.trim(),
      });
    });
    revalidatePath("/vendor");
    return { ok: true, productId };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not add product." };
  }
}

export async function updateProductDetails(
  productId: string,
  data: {
    name: string;
    brand?: string;
    category: string;
    barcode?: string;
    mrp: number;
    costPrice: number;
    quantity: number;
    reorderThreshold: number;
    batchNumber?: string;
    expiryDate?: string;
    scheduleClass?: "OTC" | "SCHEDULE_H" | "SCHEDULE_H1" | "SCHEDULE_X";
    requiresPrescription?: boolean;
    clearanceDiscountPct?: number;
    pushToMarketplace?: boolean;
  }
) {
  const session = requireRole(await getSession(), ["VENDOR_OWNER"]);
  if (!session.merchantId) return { ok: false, error: "No store attached to this account." };

  try {
    await db
      .update(products)
      .set({
        name: data.name.trim(),
        brand: data.brand?.trim() || null,
        category: data.category.trim(),
        barcode: data.barcode?.trim() || null,
        mrp: data.mrp.toFixed(2),
        costPrice: data.costPrice.toFixed(2),
        quantity: Math.max(0, data.quantity),
        reorderThreshold: Math.max(0, data.reorderThreshold),
        batchNumber: data.batchNumber?.trim() || null,
        expiryDate: data.expiryDate ? new Date(`${data.expiryDate}T23:59:59.000Z`) : null,
        scheduleClass: session.merchantType === "MEDICAL" ? data.scheduleClass ?? "OTC" : null,
        requiresPrescription: Boolean(data.requiresPrescription),
        clearanceDiscountPct: Math.max(0, Math.min(90, data.clearanceDiscountPct ?? 0)),
        pushToMarketplace: Boolean(data.pushToMarketplace),
        updatedAt: new Date(),
      })
      .where(and(eq(products.id, productId), eq(products.merchantId, session.merchantId)));

    await logAudit("UPDATE_PRODUCT", data.name.trim());
    revalidatePath("/vendor");
    revalidatePath("/marketplace");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to update product." };
  }
}

export async function deleteProduct(productId: string) {
  const session = requireRole(await getSession(), ["VENDOR_OWNER"]);
  if (!session.merchantId) return { ok: false, error: "No store attached." };

  try {
    const [p] = await db
      .select({ name: products.name })
      .from(products)
      .where(and(eq(products.id, productId), eq(products.merchantId, session.merchantId)))
      .limit(1);
    if (!p) return { ok: false, error: "Product not found." };

    await db
      .delete(products)
      .where(and(eq(products.id, productId), eq(products.merchantId, session.merchantId)));

    await logAudit("DELETE_PRODUCT", p.name);
    revalidatePath("/vendor");
    revalidatePath("/marketplace");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not delete product." };
  }
}

// ---------------------------------------------------------
// Vendor: predictions
// ---------------------------------------------------------
export async function listMyPredictions() {
  const session = await getSession();
  const s = requireRole(session, ["VENDOR_OWNER"]);
  if (!s.merchantId) return [];
  const rows = await db
    .select({
      id: predictionCache.id,
      productId: predictionCache.productId,
      forecastQty: predictionCache.forecastQty,
      confidence: predictionCache.confidence,
      reason: predictionCache.reason,
      productName: products.name,
      costPrice: products.costPrice,
      category: products.category,
      brand: products.brand,
      currentStock: products.quantity,
      reorderThreshold: products.reorderThreshold,
      expiryDate: products.expiryDate,
    })
    .from(predictionCache)
    .leftJoin(products, eq(predictionCache.productId, products.id))
    .where(eq(predictionCache.merchantId, s.merchantId))
    .orderBy(desc(predictionCache.confidence));
  return rows;
}

// ---------------------------------------------------------
// Vendor: sales analytics (last 30 days)
// ---------------------------------------------------------
export async function getMySalesSeries() {
  const session = await getSession();
  const s = requireRole(session, ["VENDOR_OWNER"]);
  if (!s.merchantId) return [];
  const since = new Date(Date.now() - 30 * 86400000);
  const rows = await db
    .select({
      day: sql<string>`date_trunc('day', ${transactions.createdAt})::date::text`.as("day"),
      revenue: sql<string>`coalesce(sum(${transactions.total}), 0)`.as("revenue"),
      orders: sql<string>`count(*)::int`.as("orders"),
      units: sql<string>`coalesce(sum(${transactions.quantity}), 0)`.as("units"),
    })
    .from(transactions)
    .where(and(eq(transactions.merchantId, s.merchantId), gte(transactions.createdAt, since)))
    .groupBy(sql`date_trunc('day', ${transactions.createdAt})::date`)
    .orderBy(sql`date_trunc('day', ${transactions.createdAt})::date`);
  return rows.map((r) => ({
    day: r.day,
    revenue: parseFloat(r.revenue),
    orders: parseInt(r.orders, 10),
    units: parseInt(r.units, 10),
  }));
}

export async function getTopProducts() {
  const session = await getSession();
  const s = requireRole(session, ["VENDOR_OWNER"]);
  if (!s.merchantId) return [];
  const since = new Date(Date.now() - 30 * 86400000);
  const rows = await db
    .select({
      productId: transactions.productId,
      name: products.name,
      category: products.category,
      brand: products.brand,
      units: sql<string>`coalesce(sum(${transactions.quantity}), 0)`.as("units"),
      revenue: sql<string>`coalesce(sum(${transactions.total}), 0)`.as("revenue"),
    })
    .from(transactions)
    .leftJoin(products, eq(transactions.productId, products.id))
    .where(and(eq(transactions.merchantId, s.merchantId), gte(transactions.createdAt, since)))
    .groupBy(transactions.productId, products.name, products.category, products.brand)
    .orderBy(desc(sql`sum(${transactions.total})`))
    .limit(8);
  return rows.map((r) => ({
    productId: r.productId,
    name: r.name ?? "Unknown",
    category: r.category ?? "",
    brand: r.brand ?? "",
    units: parseInt(r.units, 10),
    revenue: parseFloat(r.revenue),
  }));
}

// ---------------------------------------------------------
// Vendor: staff management (owner only)
// ---------------------------------------------------------
export async function listMyStaff() {
  const session = await getSession();
  const s = requireRole(session, ["VENDOR_OWNER"]);
  if (!s.merchantId) return [];
  return db
    .select({
      id: users.id,
      name: users.name,
      phone: users.phone,
      role: users.role,
      accessLevel: users.accessLevel,
      passkeyEnabled: users.passkeyEnabled,
    })
    .from(users)
    .where(and(eq(users.merchantId, s.merchantId), eq(users.role, "VENDOR_CLERK")));
}

export async function addStaff(name: string, phone: string, access: "SCAN_ONLY" | "BILLING" | "FULL") {
  const session = await getSession();
  const s = requireRole(session, ["VENDOR_OWNER"]);
  if (!s.merchantId) throw new Error("No merchant");
  const existing = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  if (existing.length > 0) {
    return { ok: false, error: "Phone already registered" };
  }
  await db.insert(users).values({
    id: randomUUID(),
    name,
    phone,
    role: "VENDOR_CLERK",
    merchantId: s.merchantId,
    accessLevel: access,
    passkeyEnabled: false,
  });
  revalidatePath("/vendor");
  return { ok: true };
}

export async function removeStaff(userId: string) {
  const session = await getSession();
  const s = requireRole(session, ["VENDOR_OWNER"]);
  if (!s.merchantId) throw new Error("No merchant");
  await db.delete(users).where(and(eq(users.id, userId), eq(users.merchantId, s.merchantId)));
  revalidatePath("/vendor");
  return { ok: true };
}

// ---------------------------------------------------------
// Marketplace (public)
// ---------------------------------------------------------
export async function listMarketplace(city?: string | null) {
  // Only approved merchants; only items flagged for marketplace; compliance guards applied
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      brand: products.brand,
      category: products.category,
      mrp: products.mrp,
      clearanceDiscountPct: products.clearanceDiscountPct,
      expiryDate: products.expiryDate,
      batchNumber: products.batchNumber,
      quantity: products.quantity,
      merchantId: products.merchantId,
      merchantName: merchants.name,
      merchantCity: merchants.city,
      merchantType: merchants.type,
      scheduleClass: products.scheduleClass,
      requiresPrescription: products.requiresPrescription,
    })
    .from(products)
    .innerJoin(merchants, eq(products.merchantId, merchants.id))
    .where(
      and(
        eq(products.pushToMarketplace, true),
        eq(merchants.kycStatus, "APPROVED"),
        gte(products.quantity, 1),
        city ? eq(merchants.city, city) : sql`true`
      )
    )
    .orderBy(products.expiryDate);

  // Apply compliance guardrail filter in JS as a safety net (admin switches)
  const filtered: typeof rows = [];
  for (const r of rows) {
    const block = await getMarketplaceBlocks(r.merchantType, r.scheduleClass);
    if (!block.blocked) filtered.push(r);
  }
  return filtered;
}

export async function listMarketplaceCities() {
  const rows = await db
    .select({ city: merchants.city })
    .from(merchants)
    .where(eq(merchants.kycStatus, "APPROVED"));
  return Array.from(new Set(rows.map((r) => r.city)));
}

// ---------------------------------------------------------
// Public: demo helper to list seed users (for login screen)
// ---------------------------------------------------------
export async function listDemoAccounts(accessKey = "") {
  if (process.env.NODE_ENV === "production" && (!process.env.DEMO_ACCESS_KEY || accessKey !== process.env.DEMO_ACCESS_KEY)) return [];
  return db
    .select({
      id: users.id,
      name: users.name,
      phone: users.phone,
      email: users.email,
      role: users.role,
      merchantName: merchants.name,
      merchantType: merchants.type,
      merchantKycStatus: merchants.kycStatus,
    })
    .from(users)
    .leftJoin(merchants, eq(users.merchantId, merchants.id));
}

// ---------------------------------------------------------
// Notification rules (vendor)
// ---------------------------------------------------------
export async function listMyNotificationRules() {
  const session = await getSession();
  const s = requireRole(session, ["VENDOR_OWNER"]);
  if (!s.merchantId) return [];
  return db
    .select()
    .from(notificationRules)
    .where(eq(notificationRules.merchantId, s.merchantId))
    .orderBy(notificationRules.eventType);
}

export async function createNotificationRule(
  channel: string,
  eventType: string,
  threshold: number | null,
  scheduleTime: string | null,
  scheduleDays: string | null,
  recipient: string,
  template: string | null
) {
  const session = await getSession();
  const s = requireRole(session, ["VENDOR_OWNER"]);
  if (!s.merchantId) throw new Error("No merchant");
  if (channel !== "IN_APP" || !["LOW_STOCK", "EXPIRY"].includes(eventType)) {
    return { ok: false, error: "Only in-app low-stock and expiry alerts are currently available. Email/SMS/WhatsApp need provider setup." };
  }
  if (threshold === null || !Number.isSafeInteger(threshold) || threshold < 1 || threshold > 365) {
    return { ok: false, error: "Alert threshold must be between 1 and 365." };
  }
  await db.insert(notificationRules).values({
    id: randomUUID(),
    merchantId: s.merchantId,
    channel,
    eventType,
    enabled: true,
    threshold: threshold ?? null,
    scheduleTime: scheduleTime ?? null,
    scheduleDays: scheduleDays ?? null,
    recipientPhone: null,
    recipientEmail: null,
    messageTemplate: template ?? null,
  });
  revalidatePath("/vendor");
  return { ok: true };
}

export async function toggleNotificationRule(id: string, enabled: boolean) {
  const session = await getSession();
  const s = requireRole(session, ["VENDOR_OWNER"]);
  if (!s.merchantId) throw new Error("No merchant");
  await db
    .update(notificationRules)
    .set({ enabled, updatedAt: new Date() })
    .where(and(eq(notificationRules.id, id), eq(notificationRules.merchantId, s.merchantId)));
  revalidatePath("/vendor");
  return { ok: true };
}

export async function deleteNotificationRule(id: string) {
  const session = await getSession();
  const s = requireRole(session, ["VENDOR_OWNER"]);
  if (!s.merchantId) throw new Error("No merchant");
  await db
    .delete(notificationRules)
    .where(and(eq(notificationRules.id, id), eq(notificationRules.merchantId, s.merchantId)));
  revalidatePath("/vendor");
  return { ok: true };
}

// ---------------------------------------------------------
// Audit logs (admin + vendor)
// ---------------------------------------------------------
export async function logAudit(action: string, target: string) {
  const session = await getSession();
  if (!session) return;
  await db.insert(auditLogs).values({
    id: randomUUID(),
    actorId: session.id,
    actorName: session.name,
    actorRole: session.role,
    merchantId: session.merchantId,
    action,
    target,
  });
}

export async function listAdminAuditLogs() {
  const session = await getSession();
  const s = requireRole(session, ["ADMIN"]);
  void s;
  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100);
}

export async function listMyAuditLogs() {
  const session = await getSession();
  const s = requireRole(session, ["VENDOR_OWNER"]);
  if (!s.merchantId) return [];
  return db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.merchantId, s.merchantId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(50);
}

// ---------------------------------------------------------
// Announcements (admin)
// ---------------------------------------------------------
export async function listAnnouncements(audience?: string | null) {
  return db
    .select()
    .from(announcements)
    .where(audience ? eq(announcements.audience, audience) : sql`true`)
    .orderBy(desc(announcements.createdAt));
}

export async function createAnnouncement(title: string, body: string, severity: string, audience: string) {
  const session = await getSession();
  const s = requireRole(session, ["ADMIN"]);
  void s;
  await db.insert(announcements).values({
    id: randomUUID(),
    title,
    body,
    severity,
    audience,
  });
  revalidatePath("/admin");
  revalidatePath("/vendor");
  return { ok: true };
}

// ---------------------------------------------------------
// Suppliers (vendor)
// ---------------------------------------------------------
export async function listMySuppliers() {
  const session = await getSession();
  const s = requireRole(session, ["VENDOR_OWNER", "VENDOR_CLERK"]);
  if (!s.merchantId) return [];
  return db
    .select()
    .from(suppliers)
    .where(eq(suppliers.merchantId, s.merchantId))
    .orderBy(suppliers.name);
}

export async function addSupplier(name: string, contactPerson: string, phone: string, email: string, category: string, leadTimeDays: number) {
  const session = await getSession();
  const s = requireRole(session, ["VENDOR_OWNER"]);
  if (!s.merchantId) throw new Error("No merchant");
  await db.insert(suppliers).values({
    id: randomUUID(),
    merchantId: s.merchantId,
    name,
    contactPerson: contactPerson || null,
    phone: phone || null,
    email: email || null,
    category: category || null,
    leadTimeDays,
  });
  revalidatePath("/vendor");
  return { ok: true };
}

// ---------------------------------------------------------
// Purchase orders (vendor)
// ---------------------------------------------------------
export async function listMyPurchaseOrders() {
  const session = await getSession();
  const s = requireRole(session, ["VENDOR_OWNER"]);
  if (!s.merchantId) return [];
  return db
    .select({
      id: purchaseOrders.id,
      status: purchaseOrders.status,
      totalAmount: purchaseOrders.totalAmount,
      itemCount: purchaseOrders.itemCount,
      notes: purchaseOrders.notes,
      expectedDate: purchaseOrders.expectedDate,
      createdAt: purchaseOrders.createdAt,
      supplierName: suppliers.name,
    })
    .from(purchaseOrders)
    .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .where(eq(purchaseOrders.merchantId, s.merchantId))
    .orderBy(desc(purchaseOrders.createdAt));
}

export async function createPurchaseOrder(
  totalAmount: number,
  itemCount: number,
  notes: string,
  supplierId?: string | null,
  expectedDate?: string | null
) {
  const session = await getSession();
  const s = requireRole(session, ["VENDOR_OWNER"]);
  if (!s.merchantId) throw new Error("No merchant");
  if (!Number.isFinite(totalAmount) || totalAmount < 0 || !Number.isSafeInteger(itemCount) || itemCount < 1 || itemCount > 500) {
    return { ok: false, error: "Purchase order details are invalid." };
  }
  await db.insert(purchaseOrders).values({
    id: randomUUID(),
    merchantId: s.merchantId,
    supplierId: supplierId || null,
    status: "DRAFT",
    totalAmount: totalAmount.toFixed(2),
    itemCount,
    notes,
    expectedDate: expectedDate ? new Date(`${expectedDate}T23:59:59.000Z`) : null,
  });
  await logAudit("CREATE_PO", `${itemCount} items, ₹${totalAmount.toFixed(0)}`);
  revalidatePath("/vendor");
  return { ok: true };
}

export async function receivePurchaseOrder(poId: string) {
  const session = requireRole(await getSession(), ["VENDOR_OWNER"]);
  if (!session.merchantId) return { ok: false, error: "Not authorized." };

  try {
    const [po] = await db
      .select()
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.id, poId), eq(purchaseOrders.merchantId, session.merchantId)))
      .limit(1);

    if (!po) return { ok: false, error: "Purchase order not found." };
    if (po.status === "RECEIVED") return { ok: false, error: "PO already marked as received." };

    await db.transaction(async (tx) => {
      await tx
        .update(purchaseOrders)
        .set({ status: "RECEIVED" })
        .where(eq(purchaseOrders.id, poId));

      await tx.insert(activityFeed).values({
        id: randomUUID(),
        merchantId: session.merchantId!,
        actorName: session.name,
        action: "PO_RECEIVED",
        target: `PO #${po.id.slice(0, 8)} (${po.itemCount} items, ₹${po.totalAmount})`,
      });

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        actorId: session.id,
        actorName: session.name,
        actorRole: session.role,
        merchantId: session.merchantId,
        action: "RECEIVE_PO",
        target: `PO #${po.id.slice(0, 8)}`,
      });
    });

    revalidatePath("/vendor");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to receive PO." };
  }
}

// ---------------------------------------------------------
// Store notes / memos (vendor)
// ---------------------------------------------------------
export async function listMyNotes() {
  const session = await getSession();
  const s = requireRole(session, ["VENDOR_OWNER", "VENDOR_CLERK"]);
  if (!s.merchantId) return [];
  return db
    .select()
    .from(storeNotes)
    .where(eq(storeNotes.merchantId, s.merchantId))
    .orderBy(desc(storeNotes.pinned), desc(storeNotes.createdAt));
}

export async function createNote(title: string, body: string, pinned: boolean) {
  const session = await getSession();
  const s = requireRole(session, ["VENDOR_OWNER", "VENDOR_CLERK"]);
  if (!s.merchantId) throw new Error("No merchant");
  await db.insert(storeNotes).values({
    id: randomUUID(),
    merchantId: s.merchantId,
    authorId: s.id,
    authorName: s.name,
    title,
    body,
    pinned,
  });
  revalidatePath("/vendor");
  return { ok: true };
}

export async function deleteNote(id: string) {
  const session = await getSession();
  const s = requireRole(session, ["VENDOR_OWNER"]);
  if (!s.merchantId) throw new Error("No merchant");
  await db
    .delete(storeNotes)
    .where(and(eq(storeNotes.id, id), eq(storeNotes.merchantId, s.merchantId)));
  revalidatePath("/vendor");
  return { ok: true };
}

// ---------------------------------------------------------
// Store settings (vendor)
// ---------------------------------------------------------
export async function getMyStoreSettings() {
  const session = await getSession();
  const s = requireRole(session, ["VENDOR_OWNER"]);
  if (!s.merchantId) return null;
  const [row] = await db
    .select()
    .from(storeSettings)
    .where(eq(storeSettings.merchantId, s.merchantId))
    .limit(1);
  return row ?? null;
}

export async function updateStoreSettings(updates: {
  openTime?: string;
  closeTime?: string;
  taxRatePct?: number;
  gstNumber?: string;
  deliveryRadiusKm?: number;
  enableDelivery?: boolean;
}) {
  const session = await getSession();
  const s = requireRole(session, ["VENDOR_OWNER"]);
  if (!s.merchantId) throw new Error("No merchant");
  const existing = await db
    .select()
    .from(storeSettings)
    .where(eq(storeSettings.merchantId, s.merchantId))
    .limit(1);
  if (existing.length === 0) {
    await db.insert(storeSettings).values({
      id: randomUUID(),
      merchantId: s.merchantId,
      openTime: updates.openTime ?? "09:00",
      closeTime: updates.closeTime ?? "21:00",
      taxRatePct: (updates.taxRatePct ?? 5).toFixed(2),
      gstNumber: updates.gstNumber ?? null,
      deliveryRadiusKm: updates.deliveryRadiusKm ?? 3,
      enableDelivery: updates.enableDelivery ?? false,
    });
  } else {
    await db
      .update(storeSettings)
      .set({
        ...(updates.openTime !== undefined && { openTime: updates.openTime }),
        ...(updates.closeTime !== undefined && { closeTime: updates.closeTime }),
        ...(updates.taxRatePct !== undefined && { taxRatePct: updates.taxRatePct.toFixed(2) }),
        ...(updates.gstNumber !== undefined && { gstNumber: updates.gstNumber }),
        ...(updates.deliveryRadiusKm !== undefined && { deliveryRadiusKm: updates.deliveryRadiusKm }),
        ...(updates.enableDelivery !== undefined && { enableDelivery: updates.enableDelivery }),
        updatedAt: new Date(),
      })
      .where(eq(storeSettings.merchantId, s.merchantId));
  }
  revalidatePath("/vendor");
  return { ok: true };
}

// ---------------------------------------------------------
// Support tickets (admin)
// ---------------------------------------------------------
export async function listAllTickets() {
  const session = await getSession();
  const s = requireRole(session, ["ADMIN"]);
  void s;
  return db.select().from(supportTickets).orderBy(desc(supportTickets.createdAt));
}

export async function updateTicketStatus(id: string, status: string) {
  const session = await getSession();
  const s = requireRole(session, ["ADMIN"]);
  void s;
  await db
    .update(supportTickets)
    .set({ status, updatedAt: new Date() })
    .where(eq(supportTickets.id, id));
  revalidatePath("/admin");
  return { ok: true };
}

export async function createSupportTicket(data: {
  subject: string;
  body: string;
  priority: "low" | "medium" | "high" | "urgent";
}) {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated" };

  try {
    await db.insert(supportTickets).values({
      id: randomUUID(),
      merchantId: session.merchantId ?? null,
      merchantName: session.merchantName ?? null,
      requesterName: session.name,
      requesterEmail: session.email ?? null,
      subject: data.subject.trim(),
      body: data.body.trim(),
      priority: data.priority,
      status: "open",
    });

    revalidatePath("/admin");
    revalidatePath("/vendor");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not create support ticket." };
  }
}

// ---------------------------------------------------------
// Vendor scorecards (admin)
// ---------------------------------------------------------
export async function listAllScorecards() {
  const session = await getSession();
  const s = requireRole(session, ["ADMIN"]);
  void s;
  return db
    .select({
      id: vendorScorecards.id,
      month: vendorScorecards.month,
      fulfillmentScore: vendorScorecards.fulfillmentScore,
      accuracyScore: vendorScorecards.accuracyScore,
      complianceScore: vendorScorecards.complianceScore,
      responseScore: vendorScorecards.responseScore,
      overallScore: vendorScorecards.overallScore,
      merchantName: merchants.name,
      merchantType: merchants.type,
      merchantCity: merchants.city,
    })
    .from(vendorScorecards)
    .leftJoin(merchants, eq(vendorScorecards.merchantId, merchants.id))
    .orderBy(desc(vendorScorecards.overallScore));
}

// ---------------------------------------------------------
// Sales returns (vendor)
// ---------------------------------------------------------
export async function listMyReturns() {
  const session = await getSession();
  const s = requireRole(session, ["VENDOR_OWNER"]);
  if (!s.merchantId) return [];
  return db
    .select({
      id: salesReturns.id,
      quantity: salesReturns.quantity,
      refundAmount: salesReturns.refundAmount,
      reason: salesReturns.reason,
      createdAt: salesReturns.createdAt,
      productName: products.name,
    })
    .from(salesReturns)
    .leftJoin(products, eq(salesReturns.productId, products.id))
    .where(eq(salesReturns.merchantId, s.merchantId))
    .orderBy(desc(salesReturns.createdAt));
}

export async function createSalesReturn(data: {
  productId: string;
  quantity: number;
  refundAmount: number;
  reason: string;
}) {
  const session = requireRole(await getSession(), ["VENDOR_OWNER"]);
  if (!session.merchantId) return { ok: false, error: "Not authorized." };

  try {
    const [p] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, data.productId), eq(products.merchantId, session.merchantId)))
      .limit(1);
    if (!p) return { ok: false, error: "Product not found." };

    await db.transaction(async (tx) => {
      const returnId = randomUUID();
      await tx.insert(salesReturns).values({
        id: returnId,
        merchantId: session.merchantId!,
        productId: data.productId,
        quantity: data.quantity,
        refundAmount: data.refundAmount.toFixed(2),
        reason: data.reason.trim(),
      });

      // Increment inventory stock back
      await tx
        .update(products)
        .set({
          quantity: sql`${products.quantity} + ${data.quantity}`,
          updatedAt: new Date(),
        })
        .where(eq(products.id, data.productId));

      await tx.insert(activityFeed).values({
        id: randomUUID(),
        merchantId: session.merchantId!,
        actorName: session.name,
        action: "REFUND_ISSUED",
        target: `${p.name} × ${data.quantity} (₹${data.refundAmount.toFixed(2)})`,
      });

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        actorId: session.id,
        actorName: session.name,
        actorRole: session.role,
        merchantId: session.merchantId,
        action: "SALES_RETURN",
        target: `${p.name} × ${data.quantity}`,
      });
    });

    revalidatePath("/vendor");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to process return." };
  }
}

// ---------------------------------------------------------
// Activity feed (vendor + admin)
// ---------------------------------------------------------
export async function listMyActivityFeed() {
  const session = await getSession();
  const s = requireRole(session, ["VENDOR_OWNER", "VENDOR_CLERK"]);
  if (!s.merchantId) return [];
  return db
    .select()
    .from(activityFeed)
    .where(eq(activityFeed.merchantId, s.merchantId))
    .orderBy(desc(activityFeed.createdAt))
    .limit(30);
}

export async function postActivity(action: string, target: string) {
  const session = await getSession();
  if (!session?.merchantId) return;
  await db.insert(activityFeed).values({
    id: randomUUID(),
    merchantId: session.merchantId,
    actorName: session.name,
    action,
    target,
  });
}

// ---------------------------------------------------------
// API keys (vendor)
// ---------------------------------------------------------
export async function listMyApiKeys() {
  const session = await getSession();
  const s = requireRole(session, ["VENDOR_OWNER"]);
  if (!s.merchantId) return [];
  return db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.merchantId, s.merchantId))
    .orderBy(desc(apiKeys.createdAt));
}

export async function generateApiKey(name: string, scopes: string) {
  const session = requireRole(await getSession(), ["VENDOR_OWNER"]);
  if (!session.merchantId) return { ok: false, error: "Not authorized." };

  try {
    const rawSecret = `osk_live_${randomUUID().replace(/-/g, "")}`;
    const hash = createHmac("sha256", "omnishelf-apikey-salt").update(rawSecret).digest("hex");
    const last4 = rawSecret.slice(-4);

    await db.insert(apiKeys).values({
      id: randomUUID(),
      merchantId: session.merchantId,
      name: name.trim(),
      keyHash: hash,
      last4,
      scopes: scopes || "inventory:read,inventory:write,pos:write",
      active: true,
    });

    revalidatePath("/vendor");
    return { ok: true, apiKey: rawSecret };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to generate API key." };
  }
}

export async function revokeApiKey(keyId: string) {
  const session = requireRole(await getSession(), ["VENDOR_OWNER"]);
  if (!session.merchantId) return { ok: false, error: "Not authorized." };

  try {
    await db
      .update(apiKeys)
      .set({ active: false })
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.merchantId, session.merchantId)));

    revalidatePath("/vendor");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to revoke API key." };
  }
}

// ---------------------------------------------------------
// Merchant creation (onboarding)
// ---------------------------------------------------------
export async function createMerchant(data: {
  storeName: string;
  storeType: "KIRANA" | "MEDICAL";
  ownerName: string;
  address: string;
  city: string;
  pincode: string;
  phone: string;
  licenseNumber?: string;
  licenseDocUrl?: string;
}) {
  const session = await getSession();
  const phone = data.phone.trim().replace(/\s/g, "");

  // Check if phone is already linked to an existing merchant
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.phone, phone))
    .limit(1);

  if (existingUser?.merchantId) {
    return { ok: false, error: "A store is already registered with this phone number." };
  }

  const merchantId = randomUUID();
  const userId = session?.id ?? existingUser?.id ?? randomUUID();

  try {
    await db.transaction(async (tx) => {
      // 1. Create merchant
      await tx.insert(merchants).values({
        id: merchantId,
        name: data.storeName.trim(),
        ownerName: data.ownerName.trim(),
        type: data.storeType,
        address: data.address.trim(),
        city: data.city.trim(),
        pincode: data.pincode.trim(),
        phone,
        whatsapp: phone,
        licenseNumber: data.licenseNumber?.trim() || null,
        licenseDocUrl: data.licenseDocUrl ?? null,
        kycStatus: "PENDING",
      });

      // 2. Link or create user
      if (existingUser) {
        await tx
          .update(users)
          .set({
            merchantId,
            role: "VENDOR_OWNER",
            name: data.ownerName.trim(),
          })
          .where(eq(users.id, existingUser.id));
      } else {
        await tx.insert(users).values({
          id: userId,
          name: data.ownerName.trim(),
          phone,
          role: "VENDOR_OWNER",
          merchantId,
          accessLevel: "FULL",
        });
      }

      // 3. Create default store settings
      await tx.insert(storeSettings).values({
        id: randomUUID(),
        merchantId,
        openTime: "09:00",
        closeTime: "21:00",
        taxRatePct: "5.00",
        currency: "INR",
        gstNumber: data.licenseNumber?.trim() || null,
        deliveryRadiusKm: 5,
        enableDelivery: true,
      });

      // 4. Log audit
      await tx.insert(auditLogs).values({
        id: randomUUID(),
        actorId: userId,
        actorName: data.ownerName.trim(),
        actorRole: "VENDOR_OWNER",
        merchantId,
        action: "CREATE_MERCHANT",
        target: data.storeName.trim(),
      });
    });

    // 5. Establish session for the user
    await setSession({
      id: userId,
      name: data.ownerName.trim(),
      phone,
      role: "VENDOR_OWNER",
      merchantId,
      accessLevel: "FULL",
      merchantName: data.storeName.trim(),
      merchantType: data.storeType,
      merchantKycStatus: "PENDING",
    });

    revalidatePath("/vendor");
    revalidatePath("/admin");
    return { ok: true, merchantId };
  } catch (err) {
    console.error("Create merchant error:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Failed to create store." };
  }
}

export async function createMerchantForAdmin(data: {
  type: "KIRANA" | "MEDICAL";
  name: string;
  ownerName: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  pincode: string;
  licenseNumber: string;
  licenseDocUrl?: string;
  notes?: string;
}) {
  const session = requireRole(await getSession(), ["ADMIN"]);
  const requiredValues = [data.name, data.ownerName, data.phone, data.whatsapp, data.address, data.city, data.pincode, data.licenseNumber];
  if (requiredValues.some((value) => !value.trim()) || !/^\+?[0-9\s-]{9,18}$/.test(data.phone)) {
    return { ok: false, error: "Complete all required merchant fields and enter a valid phone number." };
  }

  const merchantId = randomUUID();
  const ownerId = randomUUID();
  try {
    await db.transaction(async (tx) => {
      const [existingOwner] = await tx.select({ id: users.id }).from(users).where(eq(users.phone, data.phone.trim())).limit(1);
      if (existingOwner) throw new Error("An account already uses this phone number.");

      await tx.insert(merchants).values({
        id: merchantId,
        name: data.name.trim(),
        ownerName: data.ownerName.trim(),
        type: data.type,
        address: data.address.trim(),
        city: data.city.trim(),
        pincode: data.pincode.trim(),
        phone: data.phone.trim(),
        whatsapp: data.whatsapp.trim(),
        licenseNumber: data.licenseNumber.trim(),
        licenseDocUrl: data.licenseDocUrl ?? null,
        kycStatus: "PENDING",
        kycNotes: data.notes?.trim() || null,
      });
      await tx.insert(users).values({
        id: ownerId,
        name: data.ownerName.trim(),
        phone: data.phone.trim(),
        role: "VENDOR_OWNER",
        merchantId,
        accessLevel: "FULL",
      });
      await tx.insert(auditLogs).values({
        id: randomUUID(),
        actorId: session.id,
        actorName: session.name,
        actorRole: session.role,
        merchantId,
        action: "ADMIN_CREATE_MERCHANT",
        target: data.name.trim(),
      });
    });

    revalidatePath("/admin");
    return { ok: true, merchantId };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not create merchant." };
  }
}

// ---------------------------------------------------------
// Orders (marketplace)
// ---------------------------------------------------------
export async function createOrder(data: {
  merchantId: string;
  items: Array<{ productId: string; productName: string; quantity: number; price: number }>;
  deliveryAddress: string;
  deliveryPhone?: string;
  consumerName: string;
  notes?: string;
}) {
  if (
    !data.merchantId ||
    !data.items.length ||
    data.items.length > 50 ||
    !data.consumerName.trim() ||
    !data.deliveryAddress.trim() ||
    !data.deliveryPhone?.trim()
  ) {
    return { ok: false, error: "Complete the delivery details and check your cart." };
  }
  const deliveryPhone = data.deliveryPhone.trim();

  const productIds = data.items.map((item) => item.productId);
  if (
    new Set(productIds).size !== productIds.length ||
    data.items.some((item) => !Number.isSafeInteger(item.quantity) || item.quantity < 1)
  ) {
    return { ok: false, error: "Cart contains invalid items or quantities." };
  }

  try {
    const session = await getSession();
    const orderId = randomUUID();

    await db.transaction(async (tx) => {
      const consumerName = data.consumerName.trim();
      const consumerAddress = data.deliveryAddress.trim();

      // Phone is the stable identity for guest checkout, and consumers.phone is UNIQUE.
      // A returning shopper must reuse their existing row; inserting a fresh id would
      // collide on the phone constraint and roll back the whole order.
      const [existingConsumer] = await tx
        .select({ id: consumers.id })
        .from(consumers)
        .where(eq(consumers.phone, deliveryPhone))
        .limit(1);
      const consumerId = existingConsumer?.id ?? session?.id ?? randomUUID();

      await tx.insert(consumers).values({
        id: consumerId,
        name: consumerName,
        phone: deliveryPhone,
        defaultAddress: consumerAddress,
      }).onConflictDoUpdate({
        target: consumers.id,
        set: {
          name: consumerName,
          phone: deliveryPhone,
          defaultAddress: consumerAddress,
        },
      });

      const [merchant] = await tx
        .select()
        .from(merchants)
        .where(and(eq(merchants.id, data.merchantId), eq(merchants.kycStatus, "APPROVED")))
        .limit(1);
      if (!merchant) throw new Error("This store is not currently accepting marketplace orders.");

      const storedProducts = await tx
        .select()
        .from(products)
        .where(and(inArray(products.id, productIds), eq(products.merchantId, merchant.id)));
      if (storedProducts.length !== productIds.length) {
        throw new Error("One or more products are no longer available from this store.");
      }

      const productById = new Map(storedProducts.map((product) => [product.id, product]));
      const pricedItems = await Promise.all(data.items.map(async (item) => {
        const product = productById.get(item.productId);
        if (!product || !product.pushToMarketplace || product.quantity < item.quantity) {
          throw new Error(`${item.productName} is no longer available in the requested quantity.`);
        }
        if (product.requiresPrescription) {
          throw new Error("Prescription-required products are not available for online ordering yet.");
        }
        if (product.expiryDate && product.expiryDate.getTime() < Date.now()) {
          throw new Error(`${product.name} has expired and cannot be ordered.`);
        }
        const blocked = await getMarketplaceBlocks(merchant.type, product.scheduleClass);
        if (blocked.blocked) throw new Error(blocked.reason ?? "This item cannot be sold on the marketplace.");

        const mrp = Number(product.mrp);
        const unitPrice = (mrp * (100 - product.clearanceDiscountPct)) / 100;
        if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
          throw new Error(`${product.name} has an invalid price.`);
        }
        return { product, quantity: item.quantity, unitPrice };
      }));

      const bundleRate = pricedItems.length >= 2 ? 0.95 : 1;
      const finalItems = pricedItems.map((item) => ({
        ...item,
        unitPrice: item.unitPrice * bundleRate,
      }));
      const totalAmount = finalItems.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0
      );

      await tx.insert(orders).values({
        id: orderId,
        consumerId,
        merchantId: merchant.id,
        status: "pending",
        totalAmount: totalAmount.toFixed(2),
        deliveryAddress: data.deliveryAddress.trim(),
        deliveryPhone,
        consumerName: data.consumerName.trim(),
        notes: data.notes?.trim() || null,
      });

      for (const item of finalItems) {
        const updated = await tx
          .update(products)
          .set({
            quantity: sql`${products.quantity} - ${item.quantity}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(products.id, item.product.id),
              eq(products.merchantId, merchant.id),
              eq(products.pushToMarketplace, true),
              eq(products.requiresPrescription, false),
              gte(products.quantity, item.quantity)
            )
          )
          .returning({ id: products.id });
        if (!updated.length) throw new Error(`${item.product.name} just sold out. Refresh the marketplace and try again.`);

        await tx.insert(orderItems).values({
          id: randomUUID(),
          orderId,
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.unitPrice.toFixed(2),
          subtotal: (item.unitPrice * item.quantity).toFixed(2),
        });
      }
    });

    revalidatePath("/vendor");
    revalidatePath("/shop");
    revalidatePath("/marketplace");
    return { ok: true, orderId };
  } catch (error) {
    return {
      ok: false,
      error: toCustomerFacingError(
        error,
        "We could not place your order. Check your delivery details and try again."
      ),
    };
  }
}

export async function listMyOrders() {
  const session = await getSession();
  if (!session) return [];
  
  if (session.role === "ADMIN") {
    return db
      .select({
        id: orders.id,
        status: orders.status,
        totalAmount: orders.totalAmount,
        consumerName: orders.consumerName,
        createdAt: orders.createdAt,
        merchantName: merchants.name,
        merchantCity: merchants.city,
      })
      .from(orders)
      .leftJoin(merchants, eq(orders.merchantId, merchants.id))
      .orderBy(desc(orders.createdAt))
      .limit(100);
  }

  if (!session.merchantId) return [];

  return db
    .select({
      id: orders.id,
      status: orders.status,
      totalAmount: orders.totalAmount,
      consumerName: orders.consumerName,
      deliveryAddress: orders.deliveryAddress,
      deliveryPhone: orders.deliveryPhone,
      notes: orders.notes,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(eq(orders.merchantId, session.merchantId))
    .orderBy(desc(orders.createdAt))
    .limit(50);
}

export async function updateOrderStatus(orderId: string, status: string) {
  const session = await getSession();
  const vendor = requireRole(session, ["VENDOR_OWNER"]);
  if (!vendor.merchantId) throw new Error("Not authorized");

  const nextStatus: Record<string, string> = {
    pending: "confirmed",
    confirmed: "packed",
    packed: "out_for_delivery",
    out_for_delivery: "delivered",
  };
  if (!Object.values(nextStatus).includes(status) && status !== "cancelled") {
    return { ok: false, error: "Invalid order status." };
  }

  const [currentOrder] = await db
    .select({ status: orders.status })
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.merchantId, vendor.merchantId)))
    .limit(1);
  if (!currentOrder) return { ok: false, error: "Order not found." };
  if (nextStatus[currentOrder.status] !== status && !(status === "cancelled" && currentOrder.status === "pending")) {
    return { ok: false, error: "This order cannot transition to that status." };
  }

  const updated = await db
    .update(orders)
    .set({
      status: status as any,
      updatedAt: new Date(),
      deliveredAt: status === "delivered" ? new Date() : undefined,
    })
    .where(
      and(eq(orders.id, orderId), eq(orders.merchantId, vendor.merchantId), eq(orders.status, currentOrder.status))
    )
    .returning({ id: orders.id });
  if (!updated.length) return { ok: false, error: "Order status changed. Refresh and try again." };

  revalidatePath("/vendor");
  return { ok: true };
}

export async function listOrderItems(orderId: string) {
  const session = await getSession();
  if (!session) return [];
  const [order] = await db.select({ merchantId: orders.merchantId }).from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || (session.role !== "ADMIN" && order.merchantId !== session.merchantId)) return [];
  return db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));
}

// ---------------------------------------------------------
// Open Food Facts product lookup (for barcode scanner)
// ---------------------------------------------------------
export async function lookupBarcodeOnline(barcode: string) {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;

    return {
      name: data.product.product_name || data.product.product_name_en || null,
      brand: data.product.brands || null,
      category: data.product.categories?.split(",")[0]?.trim() || null,
      imageUrl: data.product.image_url || null,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------
// Schedule H logs (pharma compliance)
// ---------------------------------------------------------
export async function logScheduleHSale(data: {
  productId: string;
  transactionId?: string;
  patientName: string;
  doctorName: string;
  prescriptionUrl?: string;
  quantity: number;
}) {
  const session = await getSession();
  if (!session?.merchantId) throw new Error("Not authorized");

  await db.insert(scheduleHLogs).values({
    id: randomUUID(),
    merchantId: session.merchantId,
    productId: data.productId,
    transactionId: data.transactionId ?? null,
    patientName: data.patientName,
    doctorName: data.doctorName,
    prescriptionUrl: data.prescriptionUrl ?? null,
    quantity: data.quantity,
  });

  return { ok: true };
}

// ---------------------------------------------------------
// Consumer favorites
// ---------------------------------------------------------
export async function toggleFavorite(merchantId: string) {
  const session = await getSession();
  if (!session) return { ok: false };
  
  const [existing] = await db
    .select()
    .from(consumerFavorites)
    .where(
      and(
        eq(consumerFavorites.consumerId, session.id),
        eq(consumerFavorites.merchantId, merchantId)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .delete(consumerFavorites)
      .where(eq(consumerFavorites.id, existing.id));
    return { ok: true, favorited: false };
  }

  await db.insert(consumerFavorites).values({
    id: randomUUID(),
    consumerId: session.id,
    merchantId,
  });
  return { ok: true, favorited: true };
}
