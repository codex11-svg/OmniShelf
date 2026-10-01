import Link from "next/link";
import { getSession } from "@/lib/auth";
import { logout } from "@/lib/actions";
import { PwaRegister } from "@/components/PwaRegister";

export async function TopNav() {
  const session = await getSession();
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-green-800 text-white shadow-sm">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 4.6a1 1 0 00.9 1.4H19" />
              <circle cx="9" cy="20" r="1.5" />
              <circle cx="17" cy="20" r="1.5" />
            </svg>
          </span>
          <div>
            <div className="text-sm font-bold tracking-tight text-slate-900">OmniShelf</div>
            <div className="-mt-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">
              STORE MANAGEMENT
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <NavLink href="/shop">Shop</NavLink>
          <NavLink href="/marketplace">Marketplace</NavLink>
          {session?.role === "ADMIN" && <NavLink href="/admin">Admin Console</NavLink>}
          {(session?.role === "VENDOR_OWNER" || session?.role === "VENDOR_CLERK") && (
            <NavLink href="/vendor">Vendor Console</NavLink>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <PwaRegister />
          {session ? (
            <>
              <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 md:flex">
                <span className="live-dot" />
                <span className="text-xs font-semibold text-slate-800">{session.name}</span>
                <span className="chip bg-indigo-100 text-indigo-700">
                  {roleLabel(session.role)}
                </span>
                {session.merchantName && (
                  <span className="chip bg-emerald-50 text-emerald-700">
                    {session.merchantName}
                  </span>
                )}
              </div>
              <form action={logout}>
                <button
                  type="submit"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Sign in
              </Link>
              <Link
                href="/onboarding"
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
    >
      {children}
    </Link>
  );
}

function roleLabel(role: string) {
  switch (role) {
    case "ADMIN":
      return "Platform Admin";
    case "VENDOR_OWNER":
      return "Store Owner";
    case "VENDOR_CLERK":
      return "Billing Clerk";
    default:
      return role;
  }
}
