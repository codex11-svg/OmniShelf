import type { products } from "@/db/schema";

export type Product = typeof products.$inferSelect;

export type SeriesPoint = { day: string; revenue: number; orders: number; units: number };

export type TopProduct = {
  productId: string | null;
  name: string;
  category: string;
  brand: string;
  units: number;
  revenue: number;
};

export type Prediction = {
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

export type Staff = {
  id: string;
  name: string;
  phone: string | null;
  email?: string | null;
  role: string;
  accessLevel: string | null;
  passkeyEnabled: boolean;
};

export type Supplier = {
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

export type PurchaseOrder = {
  id: string;
  status: string;
  totalAmount: string | number;
  itemCount: number;
  notes: string | null;
  expectedDate: Date | null;
  createdAt: Date;
  supplierName: string | null;
};

export type NotificationRule = {
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

export type StoreNote = {
  id: string;
  authorName: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: Date;
};

export type SalesReturn = {
  id: string;
  quantity: number;
  refundAmount: string | number;
  reason: string | null;
  createdAt: Date;
  productName: string | null;
};

export type AuditEntry = {
  id: string;
  action: string;
  target: string | null;
  createdAt: Date;
};

export type ActivityItem = {
  id: string;
  actorName: string;
  action: string;
  target: string | null;
  createdAt: Date;
};

export type StoreSettingsRow = {
  id: string;
  openTime: string;
  closeTime: string;
  taxRatePct: string | number;
  gstNumber: string | null;
  deliveryRadiusKm: number;
  enableDelivery: boolean;
} | null;

export type ApiKey = {
  id: string;
  name: string;
  last4: string;
  scopes: string;
  active: boolean;
  createdAt: Date;
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  severity: string;
  createdAt: Date;
};

export type CartItem = Product & { cartQty: number };
