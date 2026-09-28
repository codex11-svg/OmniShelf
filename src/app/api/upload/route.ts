import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { merchants, scheduleHLogs } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const maxFileSize = 10 * 1024 * 1024; // 10 MB
const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

async function hasValidSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === "application/pdf") return new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
  if (file.type === "image/png") return [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
  if (file.type === "image/jpeg") return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (file.type === "image/webp") return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  return false;
}

function createStorageClient() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) return null;
  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    const formData = await req.formData();
    const file = formData.get("file");
    const type = formData.get("type");

    if (!(file instanceof File) || (type !== "license" && type !== "prescription")) {
      return Response.json({ error: "Provide a valid license or prescription document." }, { status: 400 });
    }

    if (file.size <= 0 || file.size > maxFileSize) {
      return Response.json({ error: "File must be smaller than 10 MB." }, { status: 400 });
    }
    if (!allowedTypes.has(file.type)) {
      return Response.json({ error: "Only PDF, JPEG, PNG, and WebP files are accepted." }, { status: 400 });
    }
    if (!(await hasValidSignature(file))) {
      return Response.json({ error: "The selected file content does not match its file type." }, { status: 400 });
    }

    const uploaderId = session?.id ?? "guest";
    const storage = createStorageClient();
    const bucket = process.env.R2_BUCKET_NAME;

    // Cloudflare R2 storage if configured
    if (storage && bucket) {
      const key = `${uploaderId}/${type}/${randomUUID()}`;
      await storage.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: Buffer.from(await file.arrayBuffer()),
        ContentType: file.type,
      }));
      return Response.json({ key, url: `/api/upload?key=${encodeURIComponent(key)}` });
    }

    // Local filesystem storage fallback (offline / local dev mode)
    const extMap: Record<string, string> = {
      "application/pdf": "pdf",
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    const extension = extMap[file.type] || "bin";
    const filename = `${type}_${randomUUID().slice(0, 12)}.${extension}`;
    const uploadsDir = path.join(process.cwd(), "public", "uploads");

    await fs.promises.mkdir(uploadsDir, { recursive: true });
    const filePath = path.join(uploadsDir, filename);
    await fs.promises.writeFile(filePath, Buffer.from(await file.arrayBuffer()));

    const localUrl = `/uploads/${filename}`;
    return Response.json({ key: localUrl, url: localUrl });
  } catch (error) {
    console.error("Upload error:", error);
    return Response.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!key || key.includes("..")) return new Response("Not found", { status: 404 });

  // If already a local static url
  if (key.startsWith("/uploads/") || key.startsWith("/docs/")) {
    return Response.redirect(new URL(key, req.url).toString(), 302);
  }

  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const isPrescription = key.includes("/prescription/");
  const permitted = isPrescription
    ? session.role === "ADMIN"
      ? await db.select({ id: scheduleHLogs.id }).from(scheduleHLogs).where(eq(scheduleHLogs.prescriptionUrl, key)).limit(1)
      : session.role === "VENDOR_OWNER" && session.merchantId
        ? await db.select({ id: scheduleHLogs.id }).from(scheduleHLogs).where(and(eq(scheduleHLogs.merchantId, session.merchantId), eq(scheduleHLogs.prescriptionUrl, key))).limit(1)
        : []
    : session.role === "ADMIN"
      ? await db.select({ id: merchants.id }).from(merchants).where(eq(merchants.licenseDocUrl, key)).limit(1)
      : session.role === "VENDOR_OWNER" && session.merchantId
        ? await db.select({ id: merchants.id }).from(merchants).where(and(eq(merchants.id, session.merchantId), eq(merchants.licenseDocUrl, key))).limit(1)
        : [];
  if (!permitted.length) return new Response("Forbidden", { status: 403 });

  const storage = createStorageClient();
  const bucket = process.env.R2_BUCKET_NAME;
  if (!storage || !bucket) return new Response("Document storage is not configured", { status: 503 });

  const signedUrl = await getSignedUrl(storage, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 300 });
  return Response.redirect(signedUrl, 302);
}
