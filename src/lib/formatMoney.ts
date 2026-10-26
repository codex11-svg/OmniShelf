/**
 * Money and local-time formatting for printed documents.
 *
 * The rest of the app renders UTC (see formatDate.ts) because it compares timestamps
 * across regions. A receipt is a physical document handed to a customer in the shop's
 * own time zone, so it formats locally and uses Indian digit grouping.
 */

const currencyFormatters = new Map<string, Intl.NumberFormat>();

function formatterFor(currency: string): Intl.NumberFormat {
  const cached = currencyFormatters.get(currency);
  if (cached) return cached;
  let created: Intl.NumberFormat;
  try {
    created = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch {
    // Unknown currency code: fall back to a plain grouped number rather than crashing
    // the till.
    created = new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  currencyFormatters.set(currency, created);
  return created;
}

export function formatMoney(amount: number, currency = "INR"): string {
  const value = Number.isFinite(amount) ? amount : 0;
  return formatterFor(currency).format(value);
}

export function formatQuantity(value: number): string {
  return Number.isFinite(value) ? String(value) : "0";
}

/** "12 Mar 2026, 18:42" in the viewer's local time. */
export function formatLocalDateTime(value: Date | string | number | null | undefined): string {
  if (value == null) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}, ${hours}:${minutes}`;
}
