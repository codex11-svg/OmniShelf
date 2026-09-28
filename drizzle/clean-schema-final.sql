CREATE TYPE "public"."kyc_status" AS ENUM('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');
CREATE TYPE "public"."merchant_type" AS ENUM('KIRANA', 'MEDICAL');
CREATE TYPE "public"."schedule_class" AS ENUM('OTC', 'SCHEDULE_H', 'SCHEDULE_H1', 'SCHEDULE_X');
CREATE TYPE "public"."staff_access" AS ENUM('SCAN_ONLY', 'BILLING', 'FULL');
CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'VENDOR_OWNER', 'VENDOR_CLERK');
CREATE TABLE "activity_feed" (
	"id" text PRIMARY KEY NOT NULL,
	"merchant_id" text,
	"actor_name" text NOT NULL,
	"action" text NOT NULL,
	"target" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE "announcements" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"audience" text DEFAULT 'ALL' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp
);
CREATE TABLE "api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"merchant_id" text NOT NULL,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"last4" text NOT NULL,
	"scopes" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp
);
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text,
	"actor_name" text NOT NULL,
	"actor_role" text NOT NULL,
	"merchant_id" text,
	"action" text NOT NULL,
	"target" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE "compliance_switches" (
	"id" text PRIMARY KEY NOT NULL,
	"merchant_type" "merchant_type" NOT NULL,
	"key" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"description" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE "customer_favorites" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"product_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE "inference_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"merchant_id" text NOT NULL,
	"product_id" text NOT NULL,
	"score" numeric(6, 3) NOT NULL,
	"feature_snapshot" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE "merchants" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"owner_name" text NOT NULL,
	"type" "merchant_type" NOT NULL,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"pincode" text NOT NULL,
	"phone" text NOT NULL,
	"whatsapp" text NOT NULL,
	"license_number" text,
	"license_doc_url" text,
	"kyc_status" "kyc_status" DEFAULT 'PENDING' NOT NULL,
	"kyc_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"approved_at" timestamp
);
CREATE TABLE "notification_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"merchant_id" text NOT NULL,
	"channel" text DEFAULT 'WHATSAPP' NOT NULL,
	"event_type" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"schedule_time" text,
	"schedule_days" text,
	"threshold" integer,
	"product_id" text,
	"category" text,
	"recipient_phone" text,
	"recipient_email" text,
	"message_template" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE "otp_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"otp" text NOT NULL,
	"channel" text DEFAULT 'WHATSAPP' NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE "platform_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"merchant_id" text NOT NULL,
	"month" text NOT NULL,
	"gross_gmv" numeric(12, 2) NOT NULL,
	"commission_pct" numeric(5, 2) NOT NULL,
	"commission_amount" numeric(12, 2) NOT NULL,
	"saas_tier" text DEFAULT 'Starter' NOT NULL,
	"saas_fee" numeric(10, 2) DEFAULT '0' NOT NULL
);
CREATE TABLE "prediction_cache" (
	"id" text PRIMARY KEY NOT NULL,
	"merchant_id" text NOT NULL,
	"product_id" text NOT NULL,
	"forecast_qty" integer NOT NULL,
	"confidence" numeric(5, 2) NOT NULL,
	"reason" text NOT NULL,
	"computed_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"merchant_id" text NOT NULL,
	"name" text NOT NULL,
	"brand" text,
	"barcode" text,
	"category" text NOT NULL,
	"mrp" numeric(10, 2) NOT NULL,
	"cost_price" numeric(10, 2) NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"reorder_threshold" integer DEFAULT 10 NOT NULL,
	"batch_number" text,
	"manufacture_date" timestamp,
	"expiry_date" timestamp,
	"schedule_class" "schedule_class",
	"requires_prescription" boolean DEFAULT false NOT NULL,
	"push_to_marketplace" boolean DEFAULT false NOT NULL,
	"clearance_discount_pct" integer DEFAULT 0 NOT NULL,
	"image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE "purchase_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"merchant_id" text NOT NULL,
	"supplier_id" text,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"total_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"item_count" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"expected_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE "regional_tickers" (
	"id" text PRIMARY KEY NOT NULL,
	"region" text NOT NULL,
	"category" text NOT NULL,
	"avg_wholesale" numeric(10, 2) NOT NULL,
	"trend_pct" numeric(5, 2) NOT NULL,
	"sample_size" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE "sales_returns" (
	"id" text PRIMARY KEY NOT NULL,
	"merchant_id" text NOT NULL,
	"transaction_id" text,
	"product_id" text,
	"quantity" integer NOT NULL,
	"refund_amount" numeric(10, 2) NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE "store_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"merchant_id" text NOT NULL,
	"author_id" text,
	"author_name" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE "store_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"merchant_id" text NOT NULL,
	"open_time" text DEFAULT '09:00' NOT NULL,
	"close_time" text DEFAULT '21:00' NOT NULL,
	"tax_rate_pct" numeric(5, 2) DEFAULT '5.00' NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"gst_number" text,
	"delivery_radius_km" integer DEFAULT 3 NOT NULL,
	"enable_delivery" boolean DEFAULT false NOT NULL,
	"dark_mode_default" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "store_settings_merchant_id_unique" UNIQUE("merchant_id")
);
CREATE TABLE "suppliers" (
	"id" text PRIMARY KEY NOT NULL,
	"merchant_id" text NOT NULL,
	"name" text NOT NULL,
	"contact_person" text,
	"phone" text,
	"email" text,
	"category" text,
	"lead_time_days" integer DEFAULT 3,
	"rating" numeric(2, 1) DEFAULT '4.0',
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE "support_tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"merchant_id" text,
	"merchant_name" text,
	"requester_name" text NOT NULL,
	"requester_email" text,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"assigned_to" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"merchant_id" text NOT NULL,
	"product_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"sold_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"role" "user_role" NOT NULL,
	"merchant_id" text,
	"staff_access" "staff_access" DEFAULT 'FULL',
	"passkey_enabled" boolean DEFAULT false NOT NULL,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
CREATE TABLE "vendor_scorecards" (
	"id" text PRIMARY KEY NOT NULL,
	"merchant_id" text NOT NULL,
	"month" text NOT NULL,
	"fulfillment_score" numeric(4, 2) NOT NULL,
	"accuracy_score" numeric(4, 2) NOT NULL,
	"compliance_score" numeric(4, 2) NOT NULL,
	"response_score" numeric(4, 2) NOT NULL,
	"overall_score" numeric(4, 2) NOT NULL,
	"flags" jsonb
);
ALTER TABLE "activity_feed" ADD CONSTRAINT "activity_feed_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "notification_rules" ADD CONSTRAINT "notification_rules_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "notification_rules" ADD CONSTRAINT "notification_rules_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "platform_ledger" ADD CONSTRAINT "platform_ledger_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "prediction_cache" ADD CONSTRAINT "prediction_cache_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "prediction_cache" ADD CONSTRAINT "prediction_cache_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "products" ADD CONSTRAINT "products_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "store_notes" ADD CONSTRAINT "store_notes_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "store_notes" ADD CONSTRAINT "store_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "store_settings" ADD CONSTRAINT "store_settings_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_sold_by_users_id_fk" FOREIGN KEY ("sold_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "users" ADD CONSTRAINT "users_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "vendor_scorecards" ADD CONSTRAINT "vendor_scorecards_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;
CREATE INDEX "activity_created_idx" ON "activity_feed" USING btree ("created_at");
CREATE INDEX "ann_created_idx" ON "announcements" USING btree ("created_at");
CREATE INDEX "apikey_merchant_idx" ON "api_keys" USING btree ("merchant_id");
CREATE INDEX "audit_created_idx" ON "audit_logs" USING btree ("created_at");
CREATE INDEX "audit_merchant_idx" ON "audit_logs" USING btree ("merchant_id");
CREATE INDEX "fav_session_idx" ON "customer_favorites" USING btree ("session_id");
CREATE INDEX "merchants_type_idx" ON "merchants" USING btree ("type");
CREATE INDEX "merchants_kyc_idx" ON "merchants" USING btree ("kyc_status");
CREATE INDEX "notifs_merchant_idx" ON "notification_rules" USING btree ("merchant_id");
CREATE INDEX "ledger_month_idx" ON "platform_ledger" USING btree ("month");
CREATE INDEX "pred_merchant_idx" ON "prediction_cache" USING btree ("merchant_id");
CREATE INDEX "products_merchant_idx" ON "products" USING btree ("merchant_id");
CREATE INDEX "products_expiry_idx" ON "products" USING btree ("expiry_date");
CREATE INDEX "products_barcode_idx" ON "products" USING btree ("barcode");
CREATE INDEX "po_merchant_idx" ON "purchase_orders" USING btree ("merchant_id");
CREATE INDEX "returns_merchant_idx" ON "sales_returns" USING btree ("merchant_id");
CREATE INDEX "notes_merchant_idx" ON "store_notes" USING btree ("merchant_id");
CREATE INDEX "suppliers_merchant_idx" ON "suppliers" USING btree ("merchant_id");
CREATE INDEX "tickets_status_idx" ON "support_tickets" USING btree ("status");
CREATE INDEX "transactions_merchant_idx" ON "transactions" USING btree ("merchant_id");
CREATE INDEX "transactions_created_idx" ON "transactions" USING btree ("created_at");
CREATE INDEX "transactions_product_idx" ON "transactions" USING btree ("product_id");
CREATE INDEX "users_phone_idx" ON "users" USING btree ("phone");
CREATE INDEX "scorecard_month_idx" ON "vendor_scorecards" USING btree ("month");