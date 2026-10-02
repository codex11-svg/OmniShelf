import { cookies } from "next/headers";
import { db } from "@/db";
import { users, merchants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createHmac } from "node:crypto";
import { decodeSessionToken, type SessionUser } from "@/lib/session-token";

const SESSION_SECRET = process.env.SESSION_SECRET ?? (process.env.NODE_ENV === "production" ? "" : "dev-secret-change-me-in-prod");
const SESSION_COOKIE = "omnishelf_session";
export type { SessionUser } from "@/lib/session-token";

function sign(payload: string): string {
  if (!SESSION_SECRET || (process.env.NODE_ENV === "production" && SESSION_SECRET.length < 32)) {
    throw new Error("SESSION_SECRET must be configured with at least 32 characters before production sessions can be issued.");
  }
  const hmac = createHmac("sha256", SESSION_SECRET);
  hmac.update(payload);
  return hmac.digest("hex");
}

export function encodeSession(user: SessionUser): string {
  const payload = Buffer.from(JSON.stringify(user)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(token: string): SessionUser | null {
  return decodeSessionToken(token, SESSION_SECRET, process.env.NODE_ENV === "production");
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const user = decodeSession(token);
    if (!user) return null;
    return user;
  } catch {
    return null;
  }
}

export async function setSession(user: SessionUser) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, encodeSession(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getUserWithSession(user: typeof users.$inferSelect) {
  let merchant: typeof merchants.$inferSelect | null = null;
  if (user.merchantId) {
    const [m] = await db
      .select()
      .from(merchants)
      .where(eq(merchants.id, user.merchantId))
      .limit(1);
    merchant = m ?? null;
  }
  return {
    user,
    merchant,
    session: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      merchantId: user.merchantId,
      accessLevel: user.accessLevel,
      merchantName: merchant?.name ?? null,
      merchantType: merchant?.type ?? null,
      merchantKycStatus: merchant?.kycStatus ?? null,
    } satisfies SessionUser,
  };
}

export async function getUserByPhone(phone: string) {
  const [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  if (!user) return null;
  return getUserWithSession(user);
}

export async function getUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
  if (!user) return null;
  return getUserWithSession(user);
}

export async function getUserById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user) return null;
  return getUserWithSession(user);
}

export function requireRole(session: SessionUser | null, roles: SessionUser["role"][]) {
  if (!session) throw new Error("Not authenticated");
  if (!roles.includes(session.role)) throw new Error("Forbidden");
  return session;
}
