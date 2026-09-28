import { cookies } from "next/headers";
import { db } from "@/db";
import { users, merchants, otpSessions } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

const SESSION_SECRET = process.env.SESSION_SECRET ??
  (process.env.NODE_ENV === "production" ? "" : "dev-secret-change-me-in-prod");
const SESSION_COOKIE = "omnishelf_session";

export type SessionUser = {
  id: string;
  name: string;
  phone: string | null; // Now optional (users can sign up with email)
  email?: string | null; // Email for email signups
  role: "ADMIN" | "VENDOR_OWNER" | "VENDOR_CLERK";
  merchantId: string | null;
  accessLevel: "SCAN_ONLY" | "BILLING" | "FULL" | null;
  merchantName?: string | null;
  merchantType?: "KIRANA" | "MEDICAL" | null;
  merchantKycStatus?: string | null;
};

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
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expectedSignature = Buffer.from(sign(payload), "hex");
  const receivedSignature = Buffer.from(signature, "hex");
  if (expectedSignature.length !== receivedSignature.length || !timingSafeEqual(expectedSignature, receivedSignature)) return null;
  try {
    return JSON.parse(
      Buffer.from(payload, "base64url").toString("utf-8")
    ) as SessionUser;
  } catch {
    return null;
  }
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

export function generateOtp(): string {
  return randomInt(100000, 999999).toString();
}

export async function createOtpSession(phone: string, channel: "WHATSAPP" | "SMS" = "WHATSAPP") {
  const otp = generateOtp();
  const id = randomBytes(12).toString("hex");
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await db.insert(otpSessions).values({
    id,
    phone,
    otp,
    channel,
    verified: false,
    expiresAt,
  });
  // In production this would POST to WhatsApp Business API.
  // For demo, the OTP is returned to the UI so the reviewer can enter it.
  return { sessionId: id, otp };
}

export async function verifyOtp(phone: string, otp: string): Promise<boolean> {
  const now = new Date();
  const rows = await db
    .select()
    .from(otpSessions)
    .where(
      and(
        eq(otpSessions.phone, phone),
        eq(otpSessions.otp, otp),
        eq(otpSessions.verified, false),
        gt(otpSessions.expiresAt, now)
      )
    )
    .limit(1);
  if (rows.length === 0) return false;
  await db
    .update(otpSessions)
    .set({ verified: true })
    .where(eq(otpSessions.id, rows[0].id));
  return true;
}

export async function getUserByPhone(phone: string) {
  const [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  if (!user) return null;
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

export function requireRole(session: SessionUser | null, roles: SessionUser["role"][]) {
  if (!session) throw new Error("Not authenticated");
  if (!roles.includes(session.role)) throw new Error("Forbidden");
  return session;
}
