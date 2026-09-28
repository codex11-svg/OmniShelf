# 🚀 OmniShelf AI - Quick Start Guide

## ✅ What's Been Built

This is a fully functional **multi-tenant B2B2C platform** for Kirana and Medical shops with:

### Core Features
- ✅ **Local Demo Authentication** - signed demo sessions and simulated OTP; external identity provider not configured
- ✅ **Multi-Tenant Architecture** - Admin, Vendor Owner, Vendor Clerk roles
- ✅ **Barcode Scanner** - Real camera-based scanning with html5-qrcode
- ✅ **Open Food Facts Integration** - Auto-lookup product details from barcodes
- ✅ **Consumer Marketplace** - Browse clearance deals, add to cart, place orders
- ✅ **Order Management** - Track order status from pending → delivered
- ✅ **Inventory Management** - Stock tracking, clearance control, expiry alerts
- ✅ **Predictive Procurement** - ML-based "What to Order Next" recommendations
- ✅ **In-app Notifications** - daily low-stock/expiry checks; external message delivery requires provider setup
- ✅ **Compliance Engine** - Schedule H drug tracking, KYC verification
- ✅ **Analytics Dashboard** - Sales velocity, top products, predictions

### Database Tables
- ✅ `merchants` - Kirana/Medical stores
- ✅ `users` - Platform users (Admin, Vendor Owner, Clerk)
- ✅ `consumers` - Marketplace customers
- ✅ `products` - Inventory items
- ✅ `orders` + `order_items` - Marketplace orders
- ✅ `transactions` - Sales history
- ✅ `notification_rules` - Custom alerts
- ✅ `compliance_switches` - Platform controls
- ✅ `schedule_h_logs` - Pharma compliance
- ✅ `suppliers` + `purchase_orders` - Procurement
- ✅ `vendor_scorecards` - Performance metrics

### Demo Data
- ✅ 5 merchants (3 Kirana, 2 Medical)
- ✅ 5 demo users (1 Admin, 2 Owners, 1 Clerk, 1 Pending)
- ✅ 4 consumers with addresses
- ✅ 4 demo orders (pending, confirmed, packed, delivered)
- ✅ 12 order items
- ✅ 60 days of transaction history
- ✅ Notification rules, suppliers, predictions

---

## 🏃 Run in VS Code

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Setup Database
```bash
# Push schema to PostgreSQL
npx drizzle-kit push
```

### Step 3: Seed Demo Data
```bash
# Run the seed script
npx tsx --env-file=.env seed-demo.ts
```

This will:
- Clear existing data
- Create demo merchants, users, products
- Create demo orders with different statuses
- Create consumers and order items
- Generate 60 days of transaction history

### Step 4: Start Development Server
```bash
npm run dev
```

### Step 5: Access the App
Open http://localhost:3000

---

## 🎭 Demo Accounts

### Login via http://localhost:3000/login

| Phone | Role | Store | Access |
|-------|------|-------|--------|
| +919000000001 | **Admin** | Platform | Full admin console |
| +919811100001 | **Vendor Owner** | Sharma General Store (Kirana) | Full vendor access |
| +919811100003 | **Vendor Owner** | Arogya Pharmacy (Medical) | Full vendor access |
| +919811100011 | **Vendor Clerk** | Sharma General Store | Scan + billing only |

### Public Pages (No Login Required)
- **Consumer Shop**: http://localhost:3000/shop
- **Marketplace**: http://localhost:3000/marketplace

---

## 🧪 Test Flows

### Flow 1: Consumer Places Order
1. Go to `/shop` (no login needed)
2. Browse clearance deals
3. Add items to cart
4. Click "Checkout"
5. Enter delivery details
6. Place order
7. Verify order appears in vendor dashboard

### Flow 2: Vendor Manages Order
1. Login as Rajesh Sharma (+919811100001)
2. Go to "Orders" tab
3. See demo orders with different statuses
4. Click on an order to view details
5. Update order status (pending → confirmed → packed → delivered)
6. Verify status updates correctly

### Flow 3: Real Barcode Scanner
1. Login as any vendor
2. Go to "Inventory" → "Real Scanner" tab
3. Grant camera permission
4. Point at a product barcode (or use demo barcodes below)
5. System looks up product in inventory
6. If not found, queries Open Food Facts API
7. Add product to inventory

**Demo Barcodes:**
- `8901187110018` - Amul Gold Milk 1L
- `8901063018218` - Britannia Bread
- `8901234500011` - Dolo 650

### Flow 4: Admin KYC Approval
1. Login as Admin (+919000000001)
2. Go to "Pending Verifications"
3. Review pending merchant (Wellness Medicals)
4. Approve or reject with notes
5. Verify merchant moves to "Approved" list

### Flow 5: Clearance Control
1. Login as Vendor Owner
2. Go to "Clearance Control" tab
3. See products nearing expiry
4. Set discount percentage
5. Toggle "Push to Marketplace"
6. Verify product appears in `/marketplace`

---

## 🔑 Environment Variables

Copy `.env.example` to `.env.local` for local database/session settings. Clerk, real phone OTP delivery, email/SMS/WhatsApp notifications, payment processing, and production delivery are not integrated yet. For Vercel, set a private `DEMO_ACCESS_KEY` only when intentionally inviting prototype testers, and set `CRON_SECRET` for daily in-app alerts. R2 credentials are required to store KYC documents and prescriptions.

---

## 📊 Database Schema

All tables are in PostgreSQL with proper indexes:
- `merchants` - Multi-tenant stores (KIRANA/MEDICAL)
- `users` - Platform users with RBAC
- `products` - Inventory with expiry tracking
- `orders` - Consumer orders with status workflow
- `order_items` - Order line items
- `transactions` - Sales history for analytics
- `notification_rules` - Custom alert rules
- `compliance_switches` - Platform-wide controls
- `schedule_h_logs` - Pharma compliance logs
- `suppliers` - Vendor suppliers
- `purchase_orders` - Procurement orders
- `vendor_scorecards` - Performance metrics

---

## 🎯 Key Features to Demo

### For Kirana Shops
1. **Barcode Scanning** - Scan FMCG products, auto-fill details
2. **Expiry Alerts** - Get notified before products expire
3. **Clearance Marketplace** - Sell near-expiry items at discount
4. **Predictive Ordering** - AI suggests what to reorder
5. **Sales Analytics** - Track revenue, top products, trends

### For Medical Shops
1. **Schedule H Compliance** - Track restricted drug sales
2. **Batch Number Tracking** - Record batch/expiry for each product
3. **Prescription Logging** - Maintain records for audit
4. **Auto-Block Restricted Items** - Can't sell Schedule H on marketplace

### For Platform Admin
1. **KYC Verification** - Approve/reject merchant applications
2. **Compliance Controls** - Toggle marketplace access by category
3. **Regional Analytics** - View wholesale trends by city/category
4. **Vendor Scorecards** - Track merchant performance
5. **Support Tickets** - Manage merchant issues

---

## 🐛 Troubleshooting

### "Database connection error"
```bash
# Check PostgreSQL is running
pg_isready -h 127.0.0.1 -p 5432

# Restart PostgreSQL if needed
sudo service postgresql restart
```

### "Schema out of sync"
```bash
# Reset and reseed
npx drizzle-kit push
npx tsx --env-file=.env seed-demo.ts
```

### "Port 3000 already in use"
```bash
# Kill existing process
lsof -ti:3000 | xargs kill -9

# Start again
npm run dev
```

### "Clerk authentication error"
The app works without Clerk. Just use demo phone login at `/login`.

---

## 📦 Production Deployment

### Deploy to Vercel
1. Push to GitHub
2. Import in Vercel
3. Add environment variables:
   - `DATABASE_URL` - PostgreSQL connection string
   - `CLERK_PUBLISHABLE_KEY` (optional)
   - `CLERK_SECRET_KEY` (optional)
4. Deploy

### Database Setup
```bash
# Run on production database
npx drizzle-kit push
```

---

## 🎉 You're Ready!

Everything is working and ready to demo. The app has:
- ✅ Real authentication (Clerk or demo mode)
- ✅ Multi-tenant architecture
- ✅ Real barcode scanning
- ✅ Consumer marketplace with orders
- ✅ Vendor dashboard with analytics
- ✅ Admin controls
- ✅ Compliance engine
- ✅ Demo data for all flows

**Start exploring at http://localhost:3000** 🚀
