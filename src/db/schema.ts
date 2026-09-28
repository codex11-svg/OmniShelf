import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  numeric,
  pgEnum,
  index,
  jsonb,
} from "drizzle-orm/pg-core";

// ---------- Enums ----------
export const userRoleEnum = pgEnum("user_role", [
  "ADMIN",
  "VENDOR_OWNER",
  "VENDOR_CLERK",
]);

export const merchantTypeEnum = pgEnum("merchant_type", ["KIRANA", "MEDICAL"]);

export const kycStatusEnum = pgEnum("kyc_status", [
  "PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
]);

export const scheduleClassEnum = pgEnum("schedule_class", [
  "OTC",
  "SCHEDULE_H",
  "SCHEDULE_H1",
  "SCHEDULE_X",
]);

export const staffAccessEnum = pgEnum("staff_access", [
  "SCAN_ONLY",
  "BILLING",
  "FULL",
]);

// ---------- Merchants (stores) ----------
export const merchants = pgTable(
  "merchants",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    ownerName: text("owner_name").notNull(),
    type: merchantTypeEnum("type").notNull(),
    address: text("address").notNull(),
    city: text("city").notNull(),
    pincode: text("pincode").notNull(),
    phone: text("phone").notNull(),
    whatsapp: text("whatsapp").notNull(),
    licenseNumber: text("license_number"),
    licenseDocUrl: text("license_doc_url"),
    kycStatus: kycStatusEnum("kyc_status").notNull().default("PENDING"),
    kycNotes: text("kyc_notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    approvedAt: timestamp("approved_at"),
  },
  (t) => [
    index("merchants_type_idx").on(t.type),
    index("merchants_kyc_idx").on(t.kycStatus),
  ]
);

// ---------- Users ----------
export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(), // Clerk user ID (e.g., user_xxxxx)
    name: text("name").notNull(),
    email: text("email").unique(), // Email for email signups
    phone: text("phone").unique(), // Phone for phone signups (now optional)
    role: userRoleEnum("role").notNull().default("VENDOR_CLERK"),
    merchantId: text("merchant_id").references(() => merchants.id),
    accessLevel: staffAccessEnum("staff_access").default("FULL"),
    passkeyEnabled: boolean("passkey_enabled").notNull().default(false),
    lastLogin: timestamp("last_login"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("users_email_idx").on(t.email),
    index("users_phone_idx").on(t.phone),
  ]
);

// ---------- Products (dual domain) ----------
export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey(),
    merchantId: text("merchant_id")
      .notNull()
      .references(() => merchants.id),
    name: text("name").notNull(),
    brand: text("brand"),
    barcode: text("barcode"),
    category: text("category").notNull(),
    mrp: numeric("mrp", { precision: 10, scale: 2 }).notNull(),
    costPrice: numeric("cost_price", { precision: 10, scale: 2 }).notNull(),
    quantity: integer("quantity").notNull().default(0),
    reorderThreshold: integer("reorder_threshold").notNull().default(10),
    batchNumber: text("batch_number"),
    manufactureDate: timestamp("manufacture_date"),
    expiryDate: timestamp("expiry_date"),
    scheduleClass: scheduleClassEnum("schedule_class"), // medical only
    requiresPrescription: boolean("requires_prescription").notNull().default(false),
    pushToMarketplace: boolean("push_to_marketplace").notNull().default(false),
    clearanceDiscountPct: integer("clearance_discount_pct").notNull().default(0),
    imageUrl: text("image_url"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("products_merchant_idx").on(t.merchantId),
    index("products_expiry_idx").on(t.expiryDate),
    index("products_barcode_idx").on(t.barcode),
  ]
);

// ---------- Transactions (for analytics) ----------
export const transactions = pgTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    merchantId: text("merchant_id")
      .notNull()
      .references(() => merchants.id),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    quantity: integer("quantity").notNull(),
    unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
    total: numeric("total", { precision: 10, scale: 2 }).notNull(),
    soldBy: text("sold_by").references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("transactions_merchant_idx").on(t.merchantId),
    index("transactions_created_idx").on(t.createdAt),
    index("transactions_product_idx").on(t.productId),
  ]
);

// ---------- Compliance switches (per merchant type) ----------
export const complianceSwitches = pgTable("compliance_switches", {
  id: text("id").primaryKey(),
  merchantType: merchantTypeEnum("merchant_type").notNull(),
  key: text("key").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  description: text("description"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// NOTE: Per-type+key uniqueness for complianceSwitches is enforced at runtime in seed / actions.
// (Drizzle's standalone uniqueIndex on enum/text columns triggers a build-time bug in this version.)

// ---------- Platform commissions / ledger ----------
export const platformLedger = pgTable(
  "platform_ledger",
  {
    id: text("id").primaryKey(),
    merchantId: text("merchant_id")
      .notNull()
      .references(() => merchants.id),
    month: text("month").notNull(), // "YYYY-MM"
    grossGmv: numeric("gross_gmv", { precision: 12, scale: 2 }).notNull(),
    commissionPct: numeric("commission_pct", { precision: 5, scale: 2 }).notNull(),
    commissionAmount: numeric("commission_amount", { precision: 12, scale: 2 }).notNull(),
    saasTier: text("saas_tier").notNull().default("Starter"),
    saasFee: numeric("saas_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  },
  (t) => [index("ledger_month_idx").on(t.month)]
);

// ---------- WhatsApp OTP sessions ----------
export const otpSessions = pgTable("otp_sessions", {
  id: text("id").primaryKey(),
  phone: text("phone").notNull(),
  otp: text("otp").notNull(),
  channel: text("channel").notNull().default("WHATSAPP"),
  verified: boolean("verified").notNull().default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- Predictions cache ----------
export const predictionCache = pgTable(
  "prediction_cache",
  {
    id: text("id").primaryKey(),
    merchantId: text("merchant_id")
      .notNull()
      .references(() => merchants.id),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    forecastQty: integer("forecast_qty").notNull(),
    confidence: numeric("confidence", { precision: 5, scale: 2 }).notNull(),
    reason: text("reason").notNull(),
    computedAt: timestamp("computed_at").notNull().defaultNow(),
  },
  (t) => [index("pred_merchant_idx").on(t.merchantId)]
);

// ---------- Regional tickers (anonymized) ----------
export const regionalTickers = pgTable("regional_tickers", {
  id: text("id").primaryKey(),
  region: text("region").notNull(), // city
  category: text("category").notNull(),
  avgWholesale: numeric("avg_wholesale", { precision: 10, scale: 2 }).notNull(),
  trendPct: numeric("trend_pct", { precision: 5, scale: 2 }).notNull(),
  sampleSize: integer("sample_size").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------- Inference log for "next to sell" (ml_engine) ----------
export const inferenceLogs = pgTable("inference_logs", {
  id: text("id").primaryKey(),
  merchantId: text("merchant_id").notNull(),
  productId: text("product_id").notNull(),
  score: numeric("score", { precision: 6, scale: 3 }).notNull(),
  featureSnapshot: jsonb("feature_snapshot"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- Consumers (marketplace customers) ----------
export const consumers = pgTable(
  "consumers",
  {
    id: text("id").primaryKey(), // Clerk user ID
    name: text("name").notNull(),
    email: text("email").unique(),
    phone: text("phone").unique(),
    defaultAddress: text("default_address"),
    city: text("city"),
    pincode: text("pincode"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("consumers_email_idx").on(t.email),
    index("consumers_phone_idx").on(t.phone),
  ]
);

// ---------- Orders (marketplace) ----------
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "packed",
  "out_for_delivery",
  "delivered",
  "cancelled",
]);

export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    consumerId: text("consumer_id")
      .notNull()
      .references(() => consumers.id),
    merchantId: text("merchant_id")
      .notNull()
      .references(() => merchants.id),
    status: orderStatusEnum("status").notNull().default("pending"),
    totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
    deliveryAddress: text("delivery_address").notNull(),
    deliveryPhone: text("delivery_phone"),
    consumerName: text("consumer_name").notNull(),
    notes: text("notes"),
    trackingId: text("tracking_id"), // For 3rd-party delivery
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deliveredAt: timestamp("delivered_at"),
  },
  (t) => [
    index("orders_consumer_idx").on(t.consumerId),
    index("orders_merchant_idx").on(t.merchantId),
    index("orders_status_idx").on(t.status),
  ]
);

// ---------- Order Items ----------
export const orderItems = pgTable(
  "order_items",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    productName: text("product_name").notNull(),
    quantity: integer("quantity").notNull(),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)]
);

// ---------- Schedule H Drug Logs (Pharma compliance) ----------
export const scheduleHLogs = pgTable(
  "schedule_h_logs",
  {
    id: text("id").primaryKey(),
    merchantId: text("merchant_id")
      .notNull()
      .references(() => merchants.id),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    transactionId: text("transaction_id").references(() => transactions.id),
    patientName: text("patient_name").notNull(),
    doctorName: text("doctor_name").notNull(),
    prescriptionUrl: text("prescription_url"),
    quantity: integer("quantity").notNull(),
    soldAt: timestamp("sold_at").notNull().defaultNow(),
  },
  (t) => [
    index("schedule_h_merchant_idx").on(t.merchantId),
    index("schedule_h_sold_idx").on(t.soldAt),
  ]
);

// ---------- Consumer Favorites ----------
export const consumerFavorites = pgTable(
  "consumer_favorites",
  {
    id: text("id").primaryKey(),
    consumerId: text("consumer_id")
      .notNull()
      .references(() => consumers.id),
    merchantId: text("merchant_id")
      .notNull()
      .references(() => merchants.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("fav_consumer_idx").on(t.consumerId)]
);

// ---------- Reviews ----------
export const reviews = pgTable(
  "reviews",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    consumerId: text("consumer_id")
      .notNull()
      .references(() => consumers.id),
    merchantId: text("merchant_id")
      .notNull()
      .references(() => merchants.id),
    rating: integer("rating").notNull(), // 1-5
    comment: text("comment"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("reviews_merchant_idx").on(t.merchantId)]
);

// ---------- Vendor notification rules (custom stock alerts) ----------
export const notificationRules = pgTable(
  "notification_rules",
  {
    id: text("id").primaryKey(),
    merchantId: text("merchant_id")
      .notNull()
      .references(() => merchants.id),
    channel: text("channel").notNull().default("WHATSAPP"), // WHATSAPP | SMS | EMAIL | IN_APP
    eventType: text("event_type").notNull(), // LOW_STOCK | EXPIRY | DAILY_SUMMARY | REORDER_DUE | PRICE_CHANGE
    enabled: boolean("enabled").notNull().default(true),
    scheduleTime: text("schedule_time"), // HH:MM format for scheduled digests
    scheduleDays: text("schedule_days"), // comma-separated: "MON,TUE,WED,THU,FRI"
    threshold: integer("threshold"), // for low-stock events
    productId: text("product_id").references(() => products.id), // optional per-product rule
    category: text("category"), // optional per-category rule
    recipientPhone: text("recipient_phone"),
    recipientEmail: text("recipient_email"),
    messageTemplate: text("message_template"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("notifs_merchant_idx").on(t.merchantId)]
);

// ---------- Audit log (admin + vendor actions) ----------
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    actorId: text("actor_id").references(() => users.id),
    actorName: text("actor_name").notNull(),
    actorRole: text("actor_role").notNull(),
    merchantId: text("merchant_id"),
    action: text("action").notNull(), // APPROVE_KYC, REJECT_KYC, TOGGLE_COMPLIANCE, STOCK_ADJUST, CLEARANCE_PUSH, LOGIN, etc.
    target: text("target"), // description of what was affected
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("audit_created_idx").on(t.createdAt), index("audit_merchant_idx").on(t.merchantId)]
);

// ---------- Platform announcements ----------
export const announcements = pgTable(
  "announcements",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    severity: text("severity").notNull().default("info"), // info | warning | critical
    audience: text("audience").notNull().default("ALL"), // ALL | KIRANA | MEDICAL
    createdAt: timestamp("created_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at"),
  },
  (t) => [index("ann_created_idx").on(t.createdAt)]
);

// ---------- Suppliers (vendors' wholesale suppliers) ----------
export const suppliers = pgTable(
  "suppliers",
  {
    id: text("id").primaryKey(),
    merchantId: text("merchant_id")
      .notNull()
      .references(() => merchants.id),
    name: text("name").notNull(),
    contactPerson: text("contact_person"),
    phone: text("phone"),
    email: text("email"),
    category: text("category"), // what they supply
    leadTimeDays: integer("lead_time_days").default(3),
    rating: numeric("rating", { precision: 2, scale: 1 }).default("4.0"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("suppliers_merchant_idx").on(t.merchantId)]
);

// ---------- Purchase orders ----------
export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    id: text("id").primaryKey(),
    merchantId: text("merchant_id")
      .notNull()
      .references(() => merchants.id),
    supplierId: text("supplier_id").references(() => suppliers.id),
    status: text("status").notNull().default("DRAFT"), // DRAFT | SENT | PARTIAL | RECEIVED | CANCELLED
    totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    itemCount: integer("item_count").notNull().default(0),
    notes: text("notes"),
    expectedDate: timestamp("expected_date"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("po_merchant_idx").on(t.merchantId)]
);

// ---------- Store notes / memos ----------
export const storeNotes = pgTable(
  "store_notes",
  {
    id: text("id").primaryKey(),
    merchantId: text("merchant_id")
      .notNull()
      .references(() => merchants.id),
    authorId: text("author_id").references(() => users.id),
    authorName: text("author_name").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    pinned: boolean("pinned").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("notes_merchant_idx").on(t.merchantId)]
);

// ---------- Support tickets ----------
export const supportTickets = pgTable(
  "support_tickets",
  {
    id: text("id").primaryKey(),
    merchantId: text("merchant_id").references(() => merchants.id),
    merchantName: text("merchant_name"),
    requesterName: text("requester_name").notNull(),
    requesterEmail: text("requester_email"),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    priority: text("priority").notNull().default("medium"), // low | medium | high | urgent
    status: text("status").notNull().default("open"), // open | in_progress | resolved | closed
    assignedTo: text("assigned_to"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("tickets_status_idx").on(t.status)]
);

// ---------- Sales returns / refunds ----------
export const salesReturns = pgTable(
  "sales_returns",
  {
    id: text("id").primaryKey(),
    merchantId: text("merchant_id")
      .notNull()
      .references(() => merchants.id),
    transactionId: text("transaction_id").references(() => transactions.id),
    productId: text("product_id").references(() => products.id),
    quantity: integer("quantity").notNull(),
    refundAmount: numeric("refund_amount", { precision: 10, scale: 2 }).notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("returns_merchant_idx").on(t.merchantId)]
);

// ---------- Store settings ----------
export const storeSettings = pgTable(
  "store_settings",
  {
    id: text("id").primaryKey(),
    merchantId: text("merchant_id")
      .notNull()
      .unique()
      .references(() => merchants.id),
    openTime: text("open_time").notNull().default("09:00"),
    closeTime: text("close_time").notNull().default("21:00"),
    taxRatePct: numeric("tax_rate_pct", { precision: 5, scale: 2 }).notNull().default("5.00"),
    currency: text("currency").notNull().default("INR"),
    gstNumber: text("gst_number"),
    deliveryRadiusKm: integer("delivery_radius_km").notNull().default(3),
    enableDelivery: boolean("enable_delivery").notNull().default(false),
    darkModeDefault: boolean("dark_mode_default").notNull().default(false),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  }
);

// ---------- Vendor performance scorecard ----------
export const vendorScorecards = pgTable(
  "vendor_scorecards",
  {
    id: text("id").primaryKey(),
    merchantId: text("merchant_id")
      .notNull()
      .references(() => merchants.id),
    month: text("month").notNull(),
    fulfillmentScore: numeric("fulfillment_score", { precision: 4, scale: 2 }).notNull(),
    accuracyScore: numeric("accuracy_score", { precision: 4, scale: 2 }).notNull(),
    complianceScore: numeric("compliance_score", { precision: 4, scale: 2 }).notNull(),
    responseScore: numeric("response_score", { precision: 4, scale: 2 }).notNull(),
    overallScore: numeric("overall_score", { precision: 4, scale: 2 }).notNull(),
    flags: jsonb("flags"),
  },
  (t) => [index("scorecard_month_idx").on(t.month)]
);

// ---------- Customer favorites (marketplace) ----------
export const customerFavorites = pgTable(
  "customer_favorites",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull(),
    productId: text("product_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("fav_session_idx").on(t.sessionId)]
);

// ---------- API keys (integrations) ----------
export const apiKeys = pgTable(
  "api_keys",
  {
    id: text("id").primaryKey(),
    merchantId: text("merchant_id")
      .notNull()
      .references(() => merchants.id),
    name: text("name").notNull(),
    keyHash: text("key_hash").notNull(),
    last4: text("last4").notNull(),
    scopes: text("scopes").notNull(), // comma-separated
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at"),
  },
  (t) => [index("apikey_merchant_idx").on(t.merchantId)]
);

// ---------- Store activity feed (realtime log) ----------
export const activityFeed = pgTable(
  "activity_feed",
  {
    id: text("id").primaryKey(),
    merchantId: text("merchant_id").references(() => merchants.id),
    actorName: text("actor_name").notNull(),
    action: text("action").notNull(),
    target: text("target"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("activity_created_idx").on(t.createdAt)]
);
