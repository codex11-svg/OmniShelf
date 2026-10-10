"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Info,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Store,
  User,
  UserRound,
} from "lucide-react";
import {
  ensureSeeded,
  impersonateDemo,
  listDemoAccounts,
  loginWithFirebase,
} from "@/lib/actions";
import {
  getFirebaseErrorMessage,
  isFirebaseConfigured,
  loginWithEmail,
  registerWithEmail,
  signInWithGoogle,
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

  const [emailAuthMode, setEmailAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const firebaseReady = isFirebaseConfigured();

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
    <main className="page-enter min-h-[calc(100svh-80px)] bg-slate-900 px-4 py-8 sm:px-6 sm:py-12 flex items-center justify-center text-slate-100">
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl grid lg:grid-cols-[1.05fr_0.95fr]">
        <aside className="hidden flex-col justify-between border-r border-slate-800 bg-slate-900/50 p-8 lg:flex">
            <div>
              <div className="mb-8 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-[0_12px_30px_-18px_rgba(52,211,153,0.95)]">
                  <Store aria-hidden="true" size={22} className="text-emerald-200" />
                </span>
                <div>
                  <div className="text-lg font-semibold tracking-tight text-white">OmniShelf</div>
                  <div className="text-[10px] uppercase tracking-[0.24em] text-emerald-100/80">Store ops</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-100 shadow-[0_0_20px_rgba(52,211,153,0.2)]">
                  <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                  Live operations
                </div>

                <h1 className="max-w-sm text-3xl font-semibold leading-tight tracking-tight text-white">
                  Control every store,
                  <span className="block text-emerald-200">invoice, and fulfillment flow.</span>
                </h1>
                <p className="max-w-md text-sm leading-6 text-slate-200/85">
                  Unified inventory, vendor workflows, and compliance tracking built for modern retail and pharmacy teams.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {[
                { label: "Stores live", value: "84" },
                { label: "Orders/day", value: "1.2k" },
                { label: "Fulfillment", value: "99.4%" },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-2xl border border-white/10 bg-white/5 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-sm"
                >
                  <div className="text-lg font-semibold text-white">{metric.value}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-300">{metric.label}</div>
                </div>
              ))}
            </div>
          </aside>

          <section className="flex flex-col justify-center bg-slate-950/70 p-5 sm:p-7 xl:p-8" aria-busy={loading || accountsLoading}>
            <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_20px_35px_-25px_rgba(52,211,153,0.7)] sm:px-3.5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-500/10 text-white shadow-[0_12px_30px_-18px_rgba(52,211,153,0.9)]">
                  <Store aria-hidden="true" size={18} />
                </span>
                <div>
                  <div className="text-sm font-semibold text-white">OmniShelf</div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-300">Console access</div>
                </div>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200 shadow-[0_0_18px_rgba(52,211,153,0.2)]">
                <span className="live-dot" /> Secure
              </span>
            </div>

            <div className="mb-5">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200 shadow-[0_0_18px_rgba(52,211,153,0.12)]">
                <span className="live-dot" /> OmniShelf Identity
              </div>
              <h1 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-[2.2rem]">Sign in to console</h1>
              <p className="mt-2 text-sm leading-6 text-slate-300">Sign in with your Firebase account or launch a demo workspace.</p>
            </div>

            <div
              role="tablist"
              aria-label="Sign-in method"
              className="glass-toggle flex gap-1 rounded-2xl border border-white/10 bg-white/5 p-1 text-xs font-medium shadow-[inset_0_2px_18px_rgba(255,255,255,0.04)] sm:text-sm"
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
                className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 transition-all duration-200 ${
                  mode === "firebase"
                    ? "bg-white/12 text-white shadow-[0_12px_30px_-18px_rgba(52,211,153,0.9)] ring-1 ring-emerald-300/30"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <Sparkles aria-hidden="true" size={15} className="text-amber-400" />
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
                className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 transition-all duration-200 ${
                  mode === "demo"
                    ? "bg-white/12 text-white shadow-[0_12px_30px_-18px_rgba(52,211,153,0.9)] ring-1 ring-emerald-300/30"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <KeyRound aria-hidden="true" size={15} className="text-indigo-300" />
                Demo accounts
              </button>
            </div>

            {mode === "firebase" && (
              <div id="login-panel-firebase" role="tabpanel" aria-labelledby="login-tab-firebase" className="mt-5 space-y-4">
                {!firebaseReady ? (
                  <div className="space-y-2.5 rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4 text-xs text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-sm font-semibold text-amber-100">
                      <Info size={16} /> Firebase configuration notice
                    </div>
                    <p className="leading-relaxed text-slate-200">
                      Firebase authentication is ready in code. To connect your live project, set your environment variables in{" "}
                      <code className="rounded bg-slate-900/80 px-1.5 py-0.5 font-mono text-slate-100">.env.local</code>:
                    </p>
                    <div className="space-y-0.5 overflow-x-auto rounded-xl border border-amber-200/10 bg-slate-900/70 p-2.5 font-mono text-[11px] text-slate-100">
                      <div>NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...</div>
                      <div>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com</div>
                      <div>NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id</div>
                      <div>NEXT_PUBLIC_FIREBASE_APP_ID=1:123456:web:...</div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setMode("demo")}
                        className="rounded-xl bg-white/10 px-3 py-1.5 font-medium text-white transition hover:bg-white/15"
                      >
                        Use demo accounts
                      </button>
                    </div>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading || !firebaseReady}
                  className="flex min-h-11 w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/8 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_18px_30px_-20px_rgba(52,211,153,0.8)] transition duration-200 hover:-translate-y-0.5 hover:border-emerald-300/30 hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <GoogleIcon className="h-5 w-5 shrink-0" />
                  <span>Continue with Google</span>
                </button>

                <div className="relative flex items-center justify-center">
                  <div className="w-full border-t border-white/10" />
                  <span className="absolute bg-slate-950/80 px-3 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
                    or with email
                  </span>
                </div>

                <div className="flex overflow-hidden rounded-2xl border border-white/10 bg-white/5 text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                  <button
                    type="button"
                    onClick={() => {
                      setEmailAuthMode("signin");
                      setError(null);
                    }}
                    className={`flex-1 py-2.5 text-center font-semibold transition-colors ${
                      emailAuthMode === "signin"
                        ? "border-b-2 border-emerald-300 bg-white/8 text-emerald-200"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmailAuthMode("signup");
                      setError(null);
                    }}
                    className={`flex-1 py-2.5 text-center font-semibold transition-colors ${
                      emailAuthMode === "signup"
                        ? "border-b-2 border-emerald-300 bg-white/8 text-emerald-200"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    Create account
                  </button>
                </div>

                <form onSubmit={handleEmailAuth} className="space-y-3">
                  {emailAuthMode === "signup" && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-200">Full Name</label>
                      <div className="relative mt-1">
                        <User size={16} className="absolute left-3 top-3 text-slate-400" />
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Rahul Verma"
                          required={emailAuthMode === "signup"}
                          disabled={loading || !firebaseReady}
                          className="glass-input min-h-11 w-full rounded-2xl border border-white/10 bg-slate-900/70 pl-9 pr-3 py-2 text-sm text-white outline-none transition duration-200 placeholder:text-slate-500 focus:border-emerald-300/50 focus:ring-2 focus:ring-emerald-400/20"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-200">Email address</label>
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
                        className="glass-input min-h-11 w-full rounded-2xl border border-white/10 bg-slate-900/70 pl-9 pr-3 py-2 text-sm text-white outline-none transition duration-200 placeholder:text-slate-500 focus:border-emerald-300/50 focus:ring-2 focus:ring-emerald-400/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-200">Password</label>
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
                        className="glass-input min-h-11 w-full rounded-2xl border border-white/10 bg-slate-900/70 pl-9 pr-3 py-2 text-sm text-white outline-none transition duration-200 placeholder:text-slate-500 focus:border-emerald-300/50 focus:ring-2 focus:ring-emerald-400/20"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !firebaseReady}
                    className="primary-button w-full rounded-2xl px-4 py-2.5 text-sm font-semibold text-white shadow-[0_20px_30px_-18px_rgba(16,185,129,0.9)] transition duration-200 disabled:cursor-wait disabled:opacity-60"
                  >
                    {loading
                      ? "Authenticating…"
                      : emailAuthMode === "signup"
                        ? "Create account & sign in"
                        : "Sign in"}
                  </button>
                </form>
              </div>
            )}

            {mode === "demo" && (
              <div id="login-panel-demo" role="tabpanel" aria-labelledby="login-tab-demo" className="mt-5">
                <p className="text-xs leading-5 text-slate-300">
                  One-click personas pre-populated with stores, inventory, POS transactions, and compliance data.
                </p>
                <label className="mt-3 block">
                  <span className="text-xs font-semibold text-slate-200">Prototype access key</span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={demoAccessKey}
                    onChange={(event) => setDemoAccessKey(event.target.value)}
                    placeholder="Leave blank for local development"
                    className="glass-input mt-1 min-h-11 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none transition duration-200 placeholder:text-slate-500 focus:border-emerald-300/50 focus:ring-2 focus:ring-emerald-400/20"
                  />
                </label>
                <div className="mt-3 space-y-2">
                  {accountsLoading ? (
                    <div className="space-y-2" aria-label="Loading demo accounts">
                      <div className="h-14 animate-pulse rounded-2xl bg-white/5" />
                      <div className="h-14 animate-pulse rounded-2xl bg-white/5" />
                      <div className="h-14 animate-pulse rounded-2xl bg-white/5" />
                    </div>
                  ) : accounts.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                      No demo accounts available. Sign in with Firebase or check the access key.
                    </div>
                  ) : (
                    accounts.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => handleDemoClick(a.phone)}
                        disabled={loading || !a.phone}
                        className="group flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-left shadow-[0_18px_30px_-24px_rgba(16,185,129,0.75)] transition duration-200 hover:-translate-y-0.5 hover:border-emerald-300/30 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                              a.role === "ADMIN" ? "bg-amber-500/10 text-amber-200" : "bg-emerald-500/10 text-emerald-200"
                            }`}
                          >
                            {a.role === "ADMIN" ? (
                              <ShieldCheck aria-hidden="true" size={17} />
                            ) : (
                              <UserRound aria-hidden="true" size={17} />
                            )}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-white">{a.name}</div>
                            <div className="truncate text-[11px] text-slate-300">
                              {a.email || a.phone || "No contact"}
                              {a.merchantName ? ` · ${a.merchantName}` : ""}
                              {a.merchantKycStatus && a.merchantKycStatus !== "APPROVED" && (
                                <span className="ml-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-100">
                                  KYC: {a.merchantKycStatus}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`chip shrink-0 ${
                            a.role === "ADMIN"
                              ? "bg-amber-500/10 text-amber-100"
                              : a.role === "VENDOR_OWNER"
                                ? "bg-emerald-500/10 text-emerald-100"
                                : "bg-slate-700 text-slate-100"
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

            {error && (
              <div role="alert" className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-100">
                <AlertCircle size={15} className="mt-0.5 shrink-0 text-rose-300" />
                <span>{error}</span>
              </div>
            )}
          </section>
        </div>
    </main>
  );
}
