"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  KeyRound,
  Mail,
  Lock,
  User,
  ShieldCheck,
  Store,
  UserRound,
  AlertCircle,
  Sparkles,
  Info,
} from "lucide-react";
import {
  impersonateDemo,
  listDemoAccounts,
  ensureSeeded,
  loginWithFirebase,
} from "@/lib/actions";
import {
  isFirebaseConfigured,
  signInWithGoogle,
  loginWithEmail,
  registerWithEmail,
  getFirebaseErrorMessage,
} from "@/lib/firebase";
import { useRouter } from "next/navigation";

type DemoAccount = Awaited<ReturnType<typeof listDemoAccounts>>[number];

function GoogleIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.94 0 12s.45 3.84 1.25 5.42l4.03-3.15Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"firebase" | "demo">("firebase");

  // Firebase auth state
  const [emailAuthMode, setEmailAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const firebaseReady = isFirebaseConfigured();

  // Shared state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<DemoAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [demoAccessKey, setDemoAccessKey] = useState("");

  useEffect(() => {
    let active = true;
    const timeoutId = window.setTimeout(async () => {
      setAccountsLoading(true);
      try {
        await ensureSeeded(demoAccessKey);
        const list = await listDemoAccounts(demoAccessKey);
        if (active) setAccounts(list);
      } catch {
        if (active) setError("Could not load sign-in options. Check your connection and retry.");
      } finally {
        if (active) setAccountsLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [demoAccessKey]);

  // Handle Firebase Google Sign-In
  async function handleGoogleSignIn() {
    setError(null);
    setLoading(true);
    try {
      const userCredential = await signInWithGoogle();
      const user = userCredential.user;
      const idToken = await user.getIdToken();

      const res = await loginWithFirebase(idToken);

      if (!res.ok || !res.redirect) {
        setError(res.error || "Failed to complete sign in.");
        return;
      }

      router.push(res.redirect);
    } catch (err) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  // Handle Firebase Email/Password Sign-In or Sign-Up
  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError("Please provide both email and password.");
      return;
    }
    if (emailAuthMode === "signup" && !fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const userCredential =
        emailAuthMode === "signup"
          ? await registerWithEmail(email, password, fullName)
          : await loginWithEmail(email, password);

      const user = userCredential.user;
      const idToken = await user.getIdToken();

      const res = await loginWithFirebase(idToken);

      if (!res.ok || !res.redirect) {
        setError(res.error || "Failed to establish user session.");
        return;
      }

      router.push(res.redirect);
    } catch (err) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  // Handle One-tap Demo impersonation
  async function handleDemoClick(p: string | null) {
    if (!p) return;
    setError(null);
    setLoading(true);
    try {
      const res = await impersonateDemo(p, demoAccessKey);
      if (!res.ok || !res.redirect) {
        setError(res.error ?? "Demo login failed");
        return;
      }
      router.push(res.redirect);
    } catch {
      setError("Could not sign in to this account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-enter mx-auto flex min-h-[calc(100svh-180px)] w-full max-w-lg flex-col justify-center px-4 py-6 sm:py-10">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-800 text-white shadow-sm">
          <Store aria-hidden="true" size={20} />
        </span>
        <div>
          <div className="text-sm font-semibold text-slate-900">OmniShelf</div>
          <div className="text-xs text-slate-500">Retail & pharmacy workspace</div>
        </div>
      </div>

      <section className="card p-4 sm:p-6" aria-busy={loading || accountsLoading}>
        <div className="mb-5">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            <span className="live-dot" /> OmniShelf Identity
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Sign in to console</h1>
          <p className="mt-1 text-sm leading-5 text-slate-600">
            Sign in with your Firebase account or use a demo workspace.
          </p>
        </div>

        {/* Tab selection */}
        <div
          role="tablist"
          aria-label="Sign-in method"
          className="flex gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 text-xs font-medium sm:text-sm"
        >
          <button
            type="button"
            role="tab"
            id="login-tab-firebase"
            aria-selected={mode === "firebase"}
            aria-controls="login-panel-firebase"
            onClick={() => {
              setMode("firebase");
              setError(null);
            }}
            className={`flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 transition-all ${
              mode === "firebase"
                ? "bg-white text-slate-900 font-semibold shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles aria-hidden="true" size={15} className="text-amber-500" />
            Firebase
          </button>
          <button
            type="button"
            role="tab"
            id="login-tab-demo"
            aria-selected={mode === "demo"}
            aria-controls="login-panel-demo"
            onClick={() => {
              setMode("demo");
              setError(null);
            }}
            className={`flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 transition-all ${
              mode === "demo"
                ? "bg-white text-slate-900 font-semibold shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <KeyRound aria-hidden="true" size={15} className="text-indigo-600" />
            Demo accounts
          </button>
        </div>

        {/* Tab 1: Firebase Authentication */}
        {mode === "firebase" && (
          <div id="login-panel-firebase" role="tabpanel" aria-labelledby="login-tab-firebase" className="mt-5 space-y-4">
            {!firebaseReady ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 space-y-2.5">
                <div className="flex items-center gap-2 font-semibold text-amber-800 text-sm">
                  <Info size={16} /> Firebase Configuration Notice
                </div>
                <p className="leading-relaxed text-slate-700">
                  Firebase Authentication is ready in code. To connect your live Firebase project, set your environment variables in{" "}
                  <code className="rounded bg-white px-1.5 py-0.5 font-mono text-slate-900">.env.local</code>:
                </p>
                <div className="rounded bg-white p-2.5 font-mono text-[11px] text-slate-800 space-y-0.5 border border-amber-100 overflow-x-auto">
                  <div>NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...</div>
                  <div>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com</div>
                  <div>NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id</div>
                  <div>NEXT_PUBLIC_FIREBASE_APP_ID=1:123456:web:...</div>
                </div>
                <div className="pt-1 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setMode("demo")}
                    className="rounded bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-800"
                  >
                    Use One-tap demo accounts
                  </button>
                </div>
              </div>
            ) : null}

            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading || !firebaseReady}
              className="flex min-h-11 w-full items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <GoogleIcon className="h-5 w-5 shrink-0" />
              <span>Continue with Google</span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-slate-200" />
              <span className="absolute bg-white px-3 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                or with email
              </span>
            </div>

            {/* Email Mode Toggle (Sign in vs Register) */}
            <div className="flex border-b border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => {
                  setEmailAuthMode("signin");
                  setError(null);
                }}
                className={`flex-1 py-2 font-semibold text-center border-b-2 -mb-px transition-colors ${
                  emailAuthMode === "signin"
                    ? "border-emerald-700 text-emerald-800"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                Sign in with password
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmailAuthMode("signup");
                  setError(null);
                }}
                className={`flex-1 py-2 font-semibold text-center border-b-2 -mb-px transition-colors ${
                  emailAuthMode === "signup"
                    ? "border-emerald-700 text-emerald-800"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                Create new account
              </button>
            </div>

            {/* Email Form */}
            <form onSubmit={handleEmailAuth} className="space-y-3">
              {emailAuthMode === "signup" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Full Name</label>
                  <div className="relative mt-1">
                    <User size={16} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rahul Verma"
                      required={emailAuthMode === "signup"}
                      disabled={loading || !firebaseReady}
                      className="min-h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700">Email address</label>
                <div className="relative mt-1">
                  <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="merchant@example.com"
                    required
                    disabled={loading || !firebaseReady}
                    className="min-h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Password</label>
                <div className="relative mt-1">
                  <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    autoComplete={emailAuthMode === "signup" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    disabled={loading || !firebaseReady}
                    className="min-h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !firebaseReady}
                className="w-full rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60"
              >
                {loading
                  ? "Authenticating…"
                  : emailAuthMode === "signup"
                  ? "Create Account & Sign In"
                  : "Sign In"}
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Demo accounts */}
        {mode === "demo" && (
          <div id="login-panel-demo" role="tabpanel" aria-labelledby="login-tab-demo" className="mt-5">
            <p className="text-xs leading-5 text-slate-600">
              One-click personas pre-populated with stores, inventory, POS transactions, and compliance data.
            </p>
            <label className="mt-3 block">
              <span className="text-xs font-semibold text-slate-700">Prototype access key</span>
              <input
                type="password"
                autoComplete="current-password"
                value={demoAccessKey}
                onChange={(event) => setDemoAccessKey(event.target.value)}
                placeholder="Leave blank for local development"
                className="mt-1 min-h-11 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <div className="mt-3 space-y-2">
              {accountsLoading ? (
                <div className="space-y-2" aria-label="Loading demo accounts">
                  <div className="h-14 animate-pulse rounded-md bg-slate-100" />
                  <div className="h-14 animate-pulse rounded-md bg-slate-100" />
                  <div className="h-14 animate-pulse rounded-md bg-slate-100" />
                </div>
              ) : accounts.length === 0 ? (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  No demo accounts available. Sign in with Firebase or check the access key.
                </div>
              ) : (
                accounts.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => handleDemoClick(a.phone)}
                    disabled={loading || !a.phone}
                    className="group flex min-h-14 w-full items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-emerald-700 hover:bg-emerald-50/40 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
                          a.role === "ADMIN" ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-900"
                        }`}
                      >
                        {a.role === "ADMIN" ? (
                          <ShieldCheck aria-hidden="true" size={17} />
                        ) : (
                          <UserRound aria-hidden="true" size={17} />
                        )}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">{a.name}</div>
                        <div className="truncate text-[11px] text-slate-500">
                          {a.email || a.phone || "No contact"}
                          {a.merchantName ? ` · ${a.merchantName}` : ""}
                          {a.merchantKycStatus && a.merchantKycStatus !== "APPROVED" && (
                            <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                              KYC: {a.merchantKycStatus}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`chip shrink-0 ${
                        a.role === "ADMIN"
                          ? "bg-amber-50 text-amber-900"
                          : a.role === "VENDOR_OWNER"
                          ? "bg-emerald-50 text-emerald-900"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {a.role === "ADMIN" ? "Admin" : a.role === "VENDOR_OWNER" ? "Owner" : "Clerk"}
                    </span>
                    <ArrowRight
                      aria-hidden="true"
                      size={15}
                      className="shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5"
                    />
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div role="alert" className="mt-4 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
            <span>{error}</span>
          </div>
        )}
      </section>

      <p className="mt-4 text-center text-xs text-slate-500">
        Protected workspace access · Firebase Authentication & Multi-tenant RBAC
      </p>
    </main>
  );
}
