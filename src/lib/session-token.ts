import { createHmac, timingSafeEqual } from "node:crypto";

export type SessionUser = {
  id: string;
  name: string;
  phone: string | null;
  email?: string | null;
  role: "ADMIN" | "VENDOR_OWNER" | "VENDOR_CLERK";
  merchantId: string | null;
  accessLevel: "SCAN_ONLY" | "BILLING" | "FULL" | null;
  merchantName?: string | null;
  merchantType?: "KIRANA" | "MEDICAL" | null;
  merchantKycStatus?: string | null;
};

export function decodeSessionToken(
  token: string,
  secret: string | undefined,
  production: boolean
): SessionUser | null {
  if (!secret || (production && secret.length < 32)) return null;

  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra || !/^[a-f\d]{64}$/i.test(signature)) return null;

  const expected = createHmac("sha256", secret).update(payload).digest();
  const received = Buffer.from(signature, "hex");
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

  try {
    const user = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8")) as SessionUser;
    if (
      !user ||
      typeof user.id !== "string" ||
      typeof user.name !== "string" ||
      !["ADMIN", "VENDOR_OWNER", "VENDOR_CLERK"].includes(user.role)
    ) {
      return null;
    }
    return user;
  } catch {
    return null;
  }
}