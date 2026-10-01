import Link from "next/link";

const highlights = [
  {
    number: "01",
    title: "Know what’s on your shelves",
    description:
      "Keep stock, expiry dates, and everyday sales together, whether you run a grocery or a pharmacy.",
  },
  {
    number: "02",
    title: "Run your store with confidence",
    description:
      "Give your team the right access and keep important store activity easy to follow.",
  },
  {
    number: "03",
    title: "Built for the way you work",
    description:
      "Use OmniShelf from the shop counter, a tablet, or your phone—and install it for quick access.",
  },
];

export default function HomePage() {
  return (
    <div>
      <section className="relative isolate overflow-hidden bg-[#f5f8f3]">
        <div className="absolute inset-0 -z-10 bg-grid opacity-40" />
        <div className="absolute -right-24 -top-32 -z-10 h-96 w-96 rounded-full bg-emerald-200/50 blur-3xl" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:px-8 md:min-h-[590px] md:grid-cols-[1.1fr_0.9fr] md:py-24">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              A simpler way to manage your store
            </div>
            <h1 className="mt-6 text-4xl font-black leading-[1.08] tracking-tight text-slate-950 sm:text-5xl md:text-6xl">
              Your store,
              <br />
              <span className="text-emerald-800">all in one place.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              OmniShelf brings inventory, sales, and day-to-day store work
              together—so you can spend less time juggling tools and more time
              looking after your customers.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/onboarding"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-800 px-6 text-sm font-bold text-white shadow-lg shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:bg-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
              >
                Create your account
                <span aria-hidden="true" className="ml-2">→</span>
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-sm font-bold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Sign in
              </Link>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Set up a grocery or pharmacy store in a few simple steps.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-5 rounded-[2rem] bg-emerald-200/50 blur-2xl" />
            <div className="relative rotate-1 rounded-[1.75rem] border border-white/80 bg-white p-5 shadow-2xl shadow-slate-900/10 sm:p-7">
              <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Store overview</p>
                  <h2 className="mt-1 text-lg font-bold text-slate-900">Good morning</h2>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 10h18M5 10v10h14V10M4 10l1.5-6h13L20 10M9 20v-6h6v6" />
                  </svg>
                </span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[#f5f8f3] p-4">
                  <p className="text-xs font-medium text-slate-500">Inventory</p>
                  <p className="mt-2 text-xl font-bold text-slate-900">In control</p>
                  <p className="mt-1 text-xs text-emerald-700">Stock at a glance</p>
                </div>
                <div className="rounded-2xl bg-amber-50 p-4">
                  <p className="text-xs font-medium text-slate-500">Your next step</p>
                  <p className="mt-2 text-xl font-bold text-slate-900">Restock</p>
                  <p className="mt-1 text-xs text-amber-800">Stay ready for customers</p>
                </div>
              </div>
              <div className="mt-3 rounded-2xl border border-slate-100 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">A little more organized</p>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">Your store</span>
                </div>
                <div className="mt-4 space-y-3">
                  {["Keep inventory up to date", "Track sales in one place", "Bring your team on board"].map((item, index) => (
                    <div key={item} className="flex items-center gap-3 text-sm text-slate-600">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${index === 0 ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>
                        {index === 0 ? "✓" : index + 1}
                      </span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-950 p-4 text-white">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="2" width="14" height="20" rx="2" />
                    <path d="M12 18h.01" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-semibold">Ready when you are</p>
                  <p className="mt-0.5 text-xs text-slate-300">A store companion for every screen</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 md:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">Less juggling, more running your store</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            The essentials, without the clutter.
          </h2>
        </div>
        <div className="mt-9 grid gap-4 md:grid-cols-3">
          {highlights.map((item) => (
            <article key={item.number} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <span className="text-xs font-bold tracking-widest text-emerald-700">{item.number}</span>
              <h3 className="mt-5 text-lg font-bold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-5 mb-16 overflow-hidden rounded-3xl bg-emerald-950 sm:mx-8 md:mx-auto md:max-w-7xl">
        <div className="flex flex-col items-start justify-between gap-6 px-6 py-9 sm:px-10 md:flex-row md:items-center md:px-14 md:py-12">
          <div className="max-w-xl">
            <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Ready to get your store set up?</h2>
            <p className="mt-2 text-sm leading-6 text-emerald-100">Create your account and start with the tools your shop needs.</p>
          </div>
          <Link
            href="/onboarding"
            className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-white px-6 text-sm font-bold text-emerald-950 transition hover:bg-emerald-50"
          >
            Sign up for OmniShelf
            <span aria-hidden="true" className="ml-2">→</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
