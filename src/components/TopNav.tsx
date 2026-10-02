import Link from "next/link";
import { Menu, Store } from "lucide-react";
import { getSession } from "@/lib/auth";
import { logout } from "@/lib/actions";
import { PwaRegister } from "@/components/PwaRegister";

export async function TopNav() {
  const session = await getSession();
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-800 text-white">
            <Store aria-hidden="true" size={18} strokeWidth={1.8} />
          </span>
          <div>
            <div className="text-sm font-bold text-slate-900">OmniShelf</div>
            <div className="-mt-0.5 hidden text-[10px] font-medium uppercase tracking-wider text-slate-500 sm:block">
              STORE MANAGEMENT
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <NavLink href="/marketplace">Shop</NavLink>
          {session?.role === "ADMIN" && <NavLink href="/admin">Admin Console</NavLink>}
          {(session?.role === "VENDOR_OWNER" || session?.role === "VENDOR_CLERK") && (
            <NavLink href="/vendor">Vendor Console</NavLink>
          )}
        </nav>

        <details className="group relative md:hidden">
          <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
            <Menu aria-hidden="true" size={19} />
            <span className="sr-only">Open navigation</span>
          </summary>
          <nav className="absolute left-0 top-full z-50 mt-2 flex min-w-52 flex-col rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
            <NavLink href="/marketplace">Shop</NavLink>
            {session?.role === "ADMIN" && <NavLink href="/admin">Admin Console</NavLink>}
            {(session?.role === "VENDOR_OWNER" || session?.role === "VENDOR_CLERK") && (
              <NavLink href="/vendor">Vendor Console</NavLink>
            )}
            {!session && <NavLink href="/login">Sign in</NavLink>}
            {!session && <NavLink href="/onboarding">Create account</NavLink>}
          </nav>
        </details>

        <div className="flex items-center gap-2">
          <PwaRegister />
          {session ? (
            <>
              <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 md:flex">
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
