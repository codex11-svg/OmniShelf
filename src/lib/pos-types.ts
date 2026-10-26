/**
 * Shared shapes for the counter POS: held (parked) tabs and printed receipts.
 *
 * Plain module (no `"use server"`), so it can be imported from server actions and
 * client components alike. Money crosses the boundary as a `number` of rupees and
 * dates as ISO strings, because both are stable through serialization and print
 * identically on the receipt.
 */

export type PosPaymentMode = "CASH" | "UPI" | "CARD" | "CREDIT";

export const POS_PAYMENT_MODES: readonly PosPaymentMode[] = [
  "CASH",
  "UPI",
  "CARD",
  "CREDIT",
] as const;

/** A line inside a held tab. Prices are a snapshot from the moment the bill was parked. */
export type HeldTabLine = {
  productId: string;
  name: string;
  brand: string | null;
  quantity: number;
  unitPrice: number;
};

export type HeldTab = {
  id: string;
  refNumber: string;
  customerName: string | null;
  customerPhone: string | null;
  note: string | null;
  lines: HeldTabLine[];
  itemCount: number;
  estimatedTotal: number;
  status: "HELD" | "COMPLETED" | "VOIDED";
  heldByName: string;
  createdAt: string;
  updatedAt: string;
};

/** A line on a printed receipt, snapshotted at the moment of sale. */
export type ReceiptLine = {
  productId: string;
  name: string;
  brand: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  batchNumber: string | null;
  expiryDate: string | null;
  scheduleClass: string | null;
};

export type ReceiptDoc = {
  receiptId: string;
  refNumber: string;
  storeName: string;
  storeCity: string;
  storePhone: string | null;
  gstNumber: string | null;
  merchantType: "KIRANA" | "MEDICAL";
  currency: string;
  createdAt: string;
  cashierName: string;
  paymentMode: PosPaymentMode;
  paymentRef: string | null;
  customerName: string | null;
  customerPhone: string | null;
  patientName: string | null;
  doctorName: string | null;
  taxRatePct: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  itemCount: number;
  queuedOffline: boolean;
  lines: ReceiptLine[];
};

/** Recent counter sales, as listed in the POS tab. */
export type RecentSale = {
  receiptId: string;
  refNumber: string;
  createdAt: string;
  cashierName: string;
  itemCount: number;
  total: number;
  paymentMode: PosPaymentMode;
  queuedOffline: boolean;
  customerName: string | null;
};
