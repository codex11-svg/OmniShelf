# 🛒 OmniShelf AI

**Multi-Tenant B2B2C Operating System for Kirana & Medical shops (2026 Edition)**

A unified platform for Kirana grocers and Medical pharmacies — unifying the **Platform Owner (Admin)** and **Vendor (Shopkeeper)** perspectives into one compliant, predictive, mobile-first operating system.

## ✨ Features

### 👑 Platform Owner (Admin Console)
- **KYC & License Verification** — approve/reject workflow with document viewer
- **Compliance Switches** — per-merchant-type toggles (block Schedule H/X from B2C)
- **Commission Ledger** — GMV, take-rate, SaaS-tier tracking with charts
- **Anonymized Regional Tickers** — city × category wholesale signals
- **Broadcast Announcements** — info/warning/critical to ALL or by domain
- **Support Ticket Queue** — priority + status flow (open → in_progress → resolved)
- **Vendor Scorecards** — fulfillment / accuracy / compliance / response + Gold/Silver/Bronze badges
- **Immutable Audit Log** — every KYC toggle, stock mutation, login
- **Vendor Onboarding Wizard** — 3-step guided registration

### 🏪 Vendor Console (Kirana + Medical)
- **RBAC roles** — Owner (full) vs Clerk (scan/billing only)
- **Dashboard** — sales velocity, top sellers, activity feed, announcements banner
- **Inventory & Barcode Scanner** — camera-first mock, stock adjustments
- **Quick POS** — full cart, tax calc, checkout flow
- **Clearance Control** — time-decay with admin compliance guardrails (Schedule H/X hard-blocked)
- **Predictive Procurement** — ML-style "What to Order Next" with confidence + reasoning
- **Suppliers & Purchase Orders** — supplier directory + PO tracking
- **🔔 Notifications** — custom WhatsApp/SMS/Email/In-app rules with thresholds + schedules
- **Reports & Returns** — 30d KPIs + refund log + audit trail
- **Team Notes** — shared pinned notes across clerks
- **Staff & API Keys** — clerk management + external POS/barcode printer integrations
- **Store Settings** — hours, GST, license, delivery radius, home delivery toggle

### 🏷️ Public Clearance Marketplace
- City / category / search / sort filters
- Shopping cart with drawer UI
- Favorites + recently viewed
- Bundle deals (auto 5% off same-store multi-item)
- Prescription upload modal for restricted drugs
- Compliance-enforced: Schedule H / H1 / X drugs auto-blocked
- Verified-store badges

### 🔐 Authentication
- **Firebase Authentication** with Google and email/password sign-in
- HMAC-signed httpOnly session cookies — no tokens in localStorage
- Per-tenant RBAC with session re-verification on every server action
- Server verifies Firebase ID tokens before issuing application sessions

## 🛠️ Stack

- **Next.js 16** (App Router, Server Components, Server Actions)
- **TypeScript** strict mode
- **PostgreSQL** via **Drizzle ORM**
- **Tailwind CSS v4**
- **Recharts** for data visualization
- **Lucide Icons**

## 📁 Folder Structure

```
src/
├── app/
│   ├── admin/          # 👑 Platform Owner console
│   ├── vendor/         # 🏪 Vendor console (Owner + Clerk)
│   ├── marketplace/    # 🏷️ Public B2C clearance
│   ├── login/          # 🔐 Passwordless auth
│   └── api/health/     # Healthcheck
├── components/         # Shared UI (TopNav)
├── db/                 # Drizzle schema + connection
└── lib/
    ├── auth.ts         # Session / Firebase identity / RBAC
    ├── actions.ts      # All server actions (~1000 LOC)
    └── seed.ts         # Demo dataset (merchants, products, txs, predictions)
```

## 🚀 Local Development

```bash
npm install
# macOS local database setup (one time)
brew install postgresql@16
brew services start postgresql@16
createdb app_db
# copy .env.example to .env.local and keep the local values for this machine
npm run db:push
npm run dev
```

## 📲 Install and sign up

OmniShelf includes a web app manifest, install icons, and a service worker. In a
supported browser, open the app over HTTPS (or `localhost`) and use the browser's
install option; browsers that expose an install prompt also show an **Install app**
button in the top navigation. When offline, the app displays a reconnect screen
instead of caching private store pages or API responses.

Use **Sign up** or visit `/onboarding` to register a grocery or pharmacy store.
New registrations are marked pending until KYC review. Existing account holders
should sign in before linking a store to their account.

For an existing PostgreSQL database, set its connection string in `.env.local`. Local development seeds demo records on the login page.

### Private document storage

New license and prescription uploads use Supabase Storage. Create a **private** bucket (default name: `documents`) and configure `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_STORAGE_BUCKET` in the server environment. The service-role key must never use a `NEXT_PUBLIC_` prefix. The upload route verifies the bucket is private and serves documents only after checking their database ownership record. Set `STORAGE_PROVIDER=local` only for local development without Supabase.

```bash
npm run db:push
npm run dev
```

## 🌐 Deploy to Vercel

1. Push this repo to GitHub
2. Import into [Vercel](https://vercel.com)
3. Provision a PostgreSQL database (Vercel Postgres / Neon / Supabase)
4. Set env vars in Vercel dashboard:
   - `DATABASE_URL` — your PostgreSQL connection string
    - `SESSION_SECRET` — a unique random secret with at least 32 characters
    - `CRON_SECRET` — a separate random secret for the daily in-app alert job
    - `DEMO_ACCESS_KEY` — optional private key to enable seeded one-tap prototype accounts
    - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` — required for private license/prescription uploads; the bucket must be private
    - Legacy `R2_*` credentials are only needed to retrieve documents uploaded before the Supabase storage migration
5. Apply the schema from a trusted environment with `npm run db:push` using the production `DATABASE_URL`.
6. Do not enable public demo personas for real accounts. Email/SMS/WhatsApp notifications, payment processing, and delivery integrations require separate provider setup.

### Demo accounts
Accounts seed automatically in local development. On production, demo seeding and one-tap sign-in are disabled unless `DEMO_ACCESS_KEY` is configured; users must enter that key on `/login` to load the demo personas.

| Phone | Role | Merchant |
|---|---|---|
| +919000000001 | ADMIN | Platform Admin |
| +919811100001 | VENDOR_OWNER | Sharma General Store (Kirana) |
| +919811100003 | VENDOR_OWNER | Arogya Pharmacy (Medical) |
| +919811100011 | VENDOR_CLERK | Sharma General Store (Clerk) |
| +919811100004 | VENDOR_OWNER | Wellness Medicals (Pending KYC) |

## 📄 License

MIT
