/**
 * Pure stock and expiry helpers for shelf state.
 *
 * These replace the same inline date/quantity arithmetic that used to be copy-pasted
 * across the vendor console, the marketplace, and the notification cron. Keeping them
 * pure and dependency-free means every screen agrees on what "low", "out", and
 * "expiring soon" mean, and the rules can be unit-tested without a database.
 */

export const EXPIRY_WARNING_DAYS = 30;
export const EXPIRY_CRITICAL_DAYS = 7;

export type StockStatus = "OUT" | "LOW" | "OK";

export type ExpiryTone = "none" | "expired" | "critical" | "warning" | "ok";

function assertFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number, received ${String(value)}`);
  }
}

/**
 * Classifies shelf quantity against a reorder threshold.
 *
 * `0` units is out of stock, at-or-below the threshold is low, anything above is fine.
 * A threshold of `0` means "never alert", so only a true zero counts as out.
 */
export function getStockStatus(currentStock: number, minimumStock: number): StockStatus {
  assertFiniteNumber(currentStock, "currentStock");
  assertFiniteNumber(minimumStock, "minimumStock");

  if (currentStock <= 0) return "OUT";
  if (minimumStock > 0 && currentStock <= minimumStock) return "LOW";
  return "OK";
}

export function isLowStock(currentStock: number, minimumStock: number): boolean {
  return getStockStatus(currentStock, minimumStock) !== "OK";
}

/** Whole days from `now` until `expiryDate`. Negative means already expired. */
export function daysToExpiry(
  expiryDate: Date | string | null | undefined,
  now: number = Date.now()
): number | null {
  if (!expiryDate) return null;
  const expiry = expiryDate instanceof Date ? expiryDate.getTime() : new Date(expiryDate).getTime();
  if (Number.isNaN(expiry)) return null;
  // Round up so a batch expiring later today reads as 1 day left, not 0.
  // `+ 0` normalizes the -0 that Math.ceil produces for a fraction of a day overdue.
  return Math.ceil((expiry - now) / 86_400_000) + 0;
}

export function isExpired(
  expiryDate: Date | string | null | undefined,
  now: number = Date.now()
): boolean {
  const days = daysToExpiry(expiryDate, now);
  return days !== null && days <= 0;
}

/** Drives the colour/label of an expiry chip without each caller re-deriving the bands. */
export function expiryTone(
  expiryDate: Date | string | null | undefined,
  now: number = Date.now()
): ExpiryTone {
  const days = daysToExpiry(expiryDate, now);
  if (days === null) return "none";
  if (days <= 0) return "expired";
  if (days <= EXPIRY_CRITICAL_DAYS) return "critical";
  if (days <= EXPIRY_WARNING_DAYS) return "warning";
  return "ok";
}

/**
 * True for batches that will expire within the warning window but are still sellable.
 * Already-expired stock is excluded — it is blocked at checkout, not "expiring soon".
 */
export function isExpiringSoon(
  expiryDate: Date | string | null | undefined,
  now: number = Date.now()
): boolean {
  const days = daysToExpiry(expiryDate, now);
  return days !== null && days > 0 && days <= EXPIRY_WARNING_DAYS;
}

/** Counts batches that expire within the warning window but are not yet expired. */
export function countExpiringSoon(
  expiryDates: Array<Date | string | null | undefined>,
  now: number = Date.now()
): number {
  return expiryDates.filter((date) => isExpiringSoon(date, now)).length;
}

/** Human label for an expiry chip: "Expired", "3d left", or the day count. */
export function expiryLabel(
  expiryDate: Date | string | null | undefined,
  now: number = Date.now()
): string | null {
  const days = daysToExpiry(expiryDate, now);
  if (days === null) return null;
  if (days <= 0) return "Expired";
  if (days === 1) return "1d left";
  return `${days}d left`;
}
