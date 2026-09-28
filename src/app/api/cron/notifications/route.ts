import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { activityFeed, merchants, notificationRules, predictionCache, products, transactions } from "@/db/schema";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rules = await db.select().from(notificationRules).where(and(
    eq(notificationRules.enabled, true),
    eq(notificationRules.channel, "IN_APP"),
    inArray(notificationRules.eventType, ["LOW_STOCK", "EXPIRY"])
  ));
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000);
  let created = 0;

  for (const rule of rules) {
    const inventory = await db.select().from(products).where(eq(products.merchantId, rule.merchantId));
    const existing = await db.select({ target: activityFeed.target }).from(activityFeed).where(and(
      eq(activityFeed.merchantId, rule.merchantId),
      eq(activityFeed.action, "IN_APP_NOTIFICATION"),
      gte(activityFeed.createdAt, today)
    ));
    const sentToday = new Set(existing.map((entry) => entry.target));

    for (const product of inventory) {
      if (rule.productId && rule.productId !== product.id) continue;
      if (rule.category && rule.category !== product.category) continue;

      let message: string | null = null;
      if (rule.eventType === "LOW_STOCK") {
        const limit = rule.threshold ?? product.reorderThreshold;
        if (product.quantity < limit) message = `${product.name}: ${product.quantity} units left (threshold ${limit}).`;
      } else if (product.expiryDate && rule.threshold !== null) {
        const daysLeft = Math.ceil((product.expiryDate.getTime() - now.getTime()) / 86400000);
        if (daysLeft >= 0 && daysLeft <= rule.threshold) message = `${product.name} expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`;
      }
      if (!message) continue;

      const target = `${rule.id}:${product.id}:${rule.eventType}:${today.toISOString().slice(0, 10)}|${message}`;
      if (sentToday.has(target)) continue;
      await db.insert(activityFeed).values({
        id: randomUUID(),
        merchantId: rule.merchantId,
        actorName: "OmniShelf Alerts",
        action: "IN_APP_NOTIFICATION",
        target,
      });
      sentToday.add(target);
      created += 1;
    }
  }

  const merchantRows = await db.select({ id: merchants.id }).from(merchants);
  let forecastsUpdated = 0;
  for (const merchant of merchantRows) {
    const inventory = await db.select().from(products).where(eq(products.merchantId, merchant.id));
    const velocity = await db.select({
      productId: transactions.productId,
      unitsSold: sql<number>`coalesce(sum(${transactions.quantity}), 0)::int`,
    }).from(transactions).where(and(
      eq(transactions.merchantId, merchant.id),
      gte(transactions.createdAt, ninetyDaysAgo)
    )).groupBy(transactions.productId);
    const unitsByProduct = new Map(velocity.map((row) => [row.productId, Number(row.unitsSold)]));
    const recommendations = inventory.flatMap((product) => {
      const unitsSold = unitsByProduct.get(product.id) ?? 0;
      if (unitsSold === 0) return [];
      const forecastQty = Math.ceil(unitsSold / 90 * 30);
      if (forecastQty <= product.quantity + product.reorderThreshold) return [];
      const confidence = Math.min(0.95, 0.55 + Math.min(unitsSold / 1000, 0.4));
      return [{
        id: randomUUID(),
        merchantId: merchant.id,
        productId: product.id,
        forecastQty,
        confidence: confidence.toFixed(2),
        reason: `90-day moving average: ${forecastQty} units forecast over the next 30 days; current stock is ${product.quantity}.`,
      }];
    });

    await db.transaction(async (tx) => {
      await tx.delete(predictionCache).where(eq(predictionCache.merchantId, merchant.id));
      if (recommendations.length) await tx.insert(predictionCache).values(recommendations);
    });
    forecastsUpdated += recommendations.length;
  }

  return Response.json({
    ok: true,
    evaluatedRules: rules.length,
    notificationsCreated: created,
    merchantsForecast: merchantRows.length,
    procurementRecommendations: forecastsUpdated,
  });
}