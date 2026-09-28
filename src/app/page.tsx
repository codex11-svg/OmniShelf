import Link from "next/link";

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-white to-slate-50">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              <span className="live-dot" />
              2026 Multi-Tenant B2B2C Blueprint · Live
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 md:text-6xl">
              One shelf OS.
              <br />
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                Two perspectives. Infinite kiranas.
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
              OmniShelf AI unifies the <b>Platform Owner</b> and <b>Vendor</b> perspectives
              into one compliant, predictive, mobile-first operating system for Kirana &amp;
              Medical shops — with demo role switching, tenant-scoped workflows, and
              pharma compliance guardrails.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/login"
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-slate-800"
              >
                Open Console →
              </Link>
              <Link
                href="/marketplace"
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Browse Clearance Marketplace
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500">
              <span>✓ Local demo sign-in · Private deployment gate</span>
              <span>✓ KYC + Pharmacy License Workflows</span>
              <span>✓ Time-decay Clearance Engine</span>
              <span>✓ Next-product Prediction</span>
            </div>
          </div>
        </div>
      </section>

      {/* Persona split */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-8 text-center">
          <div className="text-xs font-bold uppercase tracking-widest text-indigo-600">Two perspectives, one platform</div>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Built for both sides of the counter</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <PersonaCard
            badge="Admin"
            badgeClass="bg-rose-100 text-rose-700"
            title="Platform Owner"
            gradient="from-rose-500 to-orange-500"
            href="/login"
            features={[
              "KYC & Pharmacy License approval workflows",
              "Compliance control switches (per merchant type)",
              "Commission ledger + SaaS tier tracking",
              "Anonymized regional wholesale tickers",
              "Hard-block Schedule H/X drugs from clearance",
            ]}
          />
          <PersonaCard
            badge="Vendor"
            badgeClass="bg-emerald-100 text-emerald-700"
            title="Kirana / Medical Shopkeeper"
            gradient="from-emerald-500 to-teal-500"
            href="/login"
            features={[
              "Owner vs Clerk RBAC with fast role switching",
              "Camera-first barcode / invoice OCR scanning",
              "Predictive ‘What to Order Next’ procurement engine",
              "Time-decay clearance control with compliance guardrails",
              "Device-agnostic layouts — phone, tablet, counter POS",
            ]}
          />
        </div>
      </section>

      {/* Dual-domain matrix */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="mb-6 text-center">
          <div className="text-xs font-bold uppercase tracking-widest text-indigo-600">Dual-domain system matrix</div>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Same engine, different rules</h2>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Feature layer</th>
                <th className="px-4 py-3">🛒 Kirana</th>
                <th className="px-4 py-3">💊 Medical / Pharmacy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <Row a="Ingestion" b="FMCG barcodes" c="Pharma barcodes, QR, Batch #" />
              <Row a="Expiry & Clearance" b="Time-decay discounts on perishables" c="Legal disposal alerts; no clearance for Schedule H/X" />
              <Row a="Next-Sell Prediction" b="Festival + staple velocity + combo baskets" c="Chronic-refill cycles + seasonal disease waves" />
              <Row a="Compliance" b="FSSAI basics" c="Schedule H/X logs, Rx matching, batch tracing" />
              <Row a="Vendor POV" b="Quick camera scanning, multi-brand catalog" c="Strict batch controls, separate clerk Rx logins" />
              <Row a="Admin POV" b="Auto radius verification for clearance zones" c="Manual license checks + auto flags for restricted items" />
            </tbody>
          </table>
        </div>
      </section>

      {/* Demo accounts */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-bold text-slate-900">Try the demo</h3>
          <p className="mt-1 text-sm text-slate-600">
            Local previews can use the demo personas. Deployed demos require a private access key;
            phone OTP delivery and passkeys need a configured identity provider.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/login" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
              Go to login →
            </Link>
            <Link href="/marketplace" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
              Browse clearance marketplace →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function PersonaCard({
  badge, badgeClass, title, gradient, features, href,
}: {
  badge: string; badgeClass: string; title: string; gradient: string; features: string[]; href: string;
}) {
  return (
    <div className="card flex flex-col p-6">
      <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow`}>
        {badge === "Admin" ? (
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l1.5-5h15L21 9" />
            <path d="M4 9v11h16V9" />
            <path d="M9 13h6" />
          </svg>
        )}
      </div>
      <div className={`mb-2 inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}>
        {badge}
      </div>
      <h3 className="text-xl font-bold text-slate-900">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm text-slate-700">
        {features.map((f) => (
          <li key={f} className="flex gap-2">
            <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            {f}
          </li>
        ))}
      </ul>
      <Link href={href} className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-center text-sm font-semibold text-slate-800 hover:bg-slate-100">
        Enter console →
      </Link>
    </div>
  );
}

function Row({ a, b, c }: { a: string; b: string; c: string }) {
  return (
    <tr>
      <td className="px-4 py-3 font-semibold text-slate-900">{a}</td>
      <td className="px-4 py-3">{b}</td>
      <td className="px-4 py-3">{c}</td>
    </tr>
  );
}
