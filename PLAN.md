# OmniShelf Error Audit and Remediation Plan

**Audit date:** 2026-09-28
**Scope:** Current repository checkout. This document records findings and a proposed fix order; application code has not been changed as part of the audit.

## Verification performed

- `npm ci` — passed.
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm run build` without `DATABASE_URL` — failed while collecting `/_not-found` page data because `src/db/index.ts` throws when the variable is missing. Re-running with a placeholder PostgreSQL URL passed. A real database connection was not tested.
- `npm audit` — 7 reported vulnerabilities (4 moderate, 2 high, 1 critical). `npm audit --omit=dev` reports 3 runtime vulnerabilities (1 critical, 2 high), including the pinned Next.js version and its PostCSS/Sharp dependencies.
- No automated test script or test files were found.

## Findings, highest priority first

### P1 — Public onboarding can claim unverified phone accounts

`src/lib/actions.ts:createMerchant` has no authentication/phone-ownership requirement. It looks up the supplied phone and, when a matching user has no merchant, changes that user's role, name, and merchant association. It then issues an owner session. An anonymous caller can therefore claim an existing unlinked account (including an admin account with no merchant) by submitting its phone number. The public `/onboarding` page calls this action directly.

**Plan:** Require a verified identity/OTP before account linking or session creation; never change an existing user's role or identity based only on a submitted phone number; validate all fields server-side. Add regression tests for anonymous enrollment and attempts to claim another user's/admin's phone.

### P1 — License and prescription documents are not private in local/fallback storage

`src/app/api/upload/route.ts:POST` accepts uploads without authentication. When R2 is absent it writes documents beneath `public/uploads` and returns a public URL. `GET` immediately redirects `/uploads/...` and `/docs/...` keys before checking the session, so possession of the URL is enough to read a license or prescription. Unauthenticated uploads can also consume local/R2 storage.

**Plan:** Require the correct authenticated uploader/role and enforce size limits before buffering; remove the public-directory fallback for sensitive files; serve files only after record- and tenant-level authorization (or fail closed when private storage is unavailable). Test guest upload denial, owner/admin access, cross-tenant denial, and anonymous GET denial.

### P1 — Runtime dependencies have known advisories

The lockfile pins `next@16.2.6`; the current `npm audit` flags it as critical and reports high-severity PostCSS and Sharp advisories. The full audit also reports moderate `esbuild`/`drizzle-kit` dependency issues.

**Plan:** Upgrade Next.js and its related runtime/tooling dependencies to patched, mutually compatible releases; review the Drizzle Kit/esbuild chain without blindly applying a major downgrade. Regenerate the lockfile and require `npm audit` (including production-only audit) to be clean or document accepted exceptions.

### P1 — Removed staff sessions remain valid; session expiry is only client-side

`src/lib/auth.ts:getSession` validates the HMAC cookie but does not load the user from the database or check an expiry claim. `removeStaff` deletes the user row, but a clerk's already-issued signed cookie still carries the role and merchant ID and continues to pass action checks. The seven-day cookie setting is not a server-side expiry check, and a copied token can be replayed after the browser discards it.

**Plan:** Add a signed `iat`/`exp` check and server-side revocation/versioning (or re-fetch active user, role, access level, and merchant on each request). Revoke sessions when staff is removed or access changes. Test expiry, deletion, and role-change revocation.

### P1 — Exported server actions permit sensitive reads and forged compliance/audit records

- `listMyOrders` returns customer address and phone to any session with a `merchantId`, including clerks; `listOrderItems` also allows any same-merchant session. The UI hides the orders page from clerks, but the exported actions still need their own authorization.
- `logScheduleHSale` only checks for a merchant ID; it does not require the appropriate role or verify that the product/transaction belongs to that merchant.
- `logAudit` accepts arbitrary action/target values from a callable server action, and `postActivity` accepts arbitrary activity text. These allow a signed-in user to forge audit/activity entries. Separately, KYC decisions, compliance toggles, and stock adjustments are not consistently audited despite the README claim.

**Plan:** Apply authorization and tenant checks inside every exported action; explicitly define which roles may read customer PII; make audit/activity helpers private implementation details or strictly validate event types and write records in the same transaction as mutations. Add RBAC and audit-integrity tests.

### P2 — Guest customers cannot reliably place repeat orders

`src/db/schema.ts` makes `consumers.phone` unique. `createOrder` creates a fresh random consumer ID for each guest order and only upserts on `consumers.id`, not phone. A second order from the same phone therefore hits the phone unique constraint and fails.

**Plan:** Normalize phone numbers and upsert/find the consumer by the intended identity; preserve the order transaction's rollback guarantees. Test two consecutive orders from the same guest phone and concurrent submissions.

### P2 — Marketplace displays products that checkout will reject

`listMarketplace` filters by marketplace flag, approved merchant, stock, and city, but not expiry or `requiresPrescription`. `createOrder` later rejects expired and prescription-required products. Customers can consequently see and add items that cannot be ordered.

**Plan:** Make listing and checkout eligibility rules consistent; hide expired and prescription-only products from the public listing, while retaining authoritative checks in the order action. Test the boundary at expiry and Rx classification.

### P2 — Local prescription POS flow always fails without R2

The local upload fallback returns a key like `/uploads/...`, but `completePosSale` accepts prescription keys only when they start with `${session.id}/prescription/`. Since R2 is optional in `.env.example`, regulated POS sales cannot complete in a normal local setup without R2.

**Plan:** Use a private local storage abstraction that returns an ownership-verifiable key compatible with the sale flow, or make R2 mandatory for this path and show that requirement before upload. Keep the document private in either case. Add a no-R2 prescription-sale test.

### P2 — `ALL` and expired announcements do not behave as expected

The vendor page calls `listAnnouncements(session.merchantType)`, while `listAnnouncements` matches only the exact audience. Announcements addressed to `ALL` are therefore absent from vendor dashboards. The query also does not exclude expired announcements.

**Plan:** Query `(audience = merchant type OR audience = ALL)` and filter `expiresAt` against the current time. Add tests for both merchant types and expiration.

### P2 — Returns and purchase orders lack server-side integrity checks

`createSalesReturn` does not validate positive quantities/refunds or link a return to a sale, so it can insert arbitrary refunds and adjust stock without a proven sale/return balance. `createPurchaseOrder` does not verify that a supplied `supplierId` belongs to the current merchant; the purchase-order list then joins and displays that supplier name across tenant boundaries.

**Plan:** Validate all amounts and quantities, link returns to the original transaction, cap cumulative returned quantities/refunds, and scope supplier selection to the current merchant. Add cross-tenant and over-return tests.

### P2 — Compliance controls may never be provisioned on a fresh non-demo database

`seedIfEmpty` returns as soon as any merchant exists, while compliance defaults are inserted only after that check. A merchant created by onboarding before demo seeding can leave the database with no compliance-switch rows. The admin screen only toggles existing rows, and missing `allow_clearance_marketplace` values fail closed, so there is no UI path to enable marketplace clearance.

**Plan:** Provision platform-level compliance defaults through an idempotent migration/bootstrap independent of demo merchants. Keep demo data seeding separate. Test a fresh database where the first row is a real merchant.

### P2 — Server-side validation is inconsistent

`updateProductDetails` and `updateStoreSettings` accept unvalidated numbers/dates; `createSalesReturn` and several other actions rely on client-side form constraints. Server Action arguments are untrusted even when TypeScript types are present.

**Plan:** Add shared runtime schemas for every mutation (numeric ranges, dates, enum values, text lengths, and tenant ownership) and return structured validation errors. Test invalid direct action calls, not only UI validation.

### P3 — Setup documentation disagrees with the actual environment-loading flow

`DEMO_SETUP.md` tells users to copy `.env.example` to `.env.local`, but its seed command is `npx tsx --env-file=.env seed-demo.ts`. `seed-demo.ts` imports the database module directly and does not load `.env.local`, so following the guide can fail with a missing `DATABASE_URL`. README also says WebAuthn passkeys are supported, while the login UI says passkeys are not connected and no WebAuthn implementation is present.

**Plan:** Align the seed command with `.env.local` loading, explain that the seed script clears existing data, and make authentication documentation consistent with implemented behavior.

## Recommended execution order

1. Fix onboarding identity/account linking and private upload handling; add security regression tests.
2. Patch vulnerable dependencies and implement server-side session expiry/revocation.
3. Close exported-action authorization gaps and audit/compliance-log forgery paths.
4. Fix marketplace eligibility, repeat guest orders, local Rx checkout, announcements, and compliance bootstrap.
5. Add input validation and tenant-safe return/PO workflows.
6. Add automated unit/integration tests and reconcile setup/product documentation; run lint, typecheck, build with configured environment, and dependency audits in CI.
