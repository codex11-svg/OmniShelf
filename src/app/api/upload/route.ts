import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { merchants, scheduleHLogs } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  getFirebaseDownloadUrl,
} from "@/lib/firebase";
import {
  createPrivateDocumentUrl,
  getSupabaseObjectPath,
  isSafeSupabaseDocumentKey,
  isSupabaseStorageConfigured,
  uploadPrivateDocument,
} from "@/lib/supabase-storage";

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

    if (type === "prescription" && !session) {
      return Response.json({ error: "Sign in before uploading a prescription." }, { status: 401 });
    }
    if (type === "prescription" && (!session?.merchantId || !["VENDOR_OWNER", "VENDOR_CLERK"].includes(session.role))) {
      return Response.json({ error: "A vendor account is required to upload a prescription." }, { status: 403 });
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

    const uploaderId = session?.id ?? "anonymous";
    const extMap: Record<string, string> = {
      "application/pdf": "pdf",
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    const extension = extMap[file.type] || "bin";

    const storageProvider = process.env.STORAGE_PROVIDER ?? (process.env.NODE_ENV === "production" ? "supabase" : "local");

    // 0. If local storage is explicitly requested, skip external cloud providers
    if (storageProvider === "local") {
      const filename = `${randomUUID()}.${extension}`;
      const key = `local/${type}/${filename}`;
      const uploadsDir = path.join(process.cwd(), ".local-data", "uploads", type);

      await fs.promises.mkdir(uploadsDir, { recursive: true });
      const filePath = path.join(uploadsDir, filename);
      await fs.promises.writeFile(filePath, Buffer.from(await file.arrayBuffer()));

      return Response.json({ key, url: `/api/upload?key=${encodeURIComponent(key)}`, provider: "local" });
    }

    if (storageProvider !== "supabase") {
      return Response.json({ error: "Unsupported document storage provider." }, { status: 503 });
    }
    if (!isSupabaseStorageConfigured()) {
      return Response.json({ error: "Supabase private document storage is not configured." }, { status: 503 });
    }

    const folder = type === "license" ? "licenses" : "prescriptions";
    const ownerKey = createHash("sha256").update(uploaderId).digest("hex");
    const objectPath = `documents/${folder}/${ownerKey}/${randomUUID()}.${extension}`;
    await uploadPrivateDocument(objectPath, await file.arrayBuffer(), file.type);
    const key = `supabase:${objectPath}`;
    return Response.json({ key, url: `/api/upload?key=${encodeURIComponent(key)}`, provider: "supabase" });
  } catch (error) {
    console.error("Upload error:", error);
    return Response.json({ error: "Document upload failed. Please try again." }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!key || key.includes("..")) return new Response("Not found", { status: 404 });

  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const localKey = /^local\/(license|prescription)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(pdf|jpg|png|webp)$/i.exec(key);
  if (key.startsWith("local/") && !localKey) return new Response("Not found", { status: 404 });

  const supabaseObjectPath = getSupabaseObjectPath(key);
  if (key.startsWith("supabase:") && !isSafeSupabaseDocumentKey(key)) {
    return new Response("Not found", { status: 404 });
  }

  const isPrescription = key.includes("/prescription/") || key.includes("prescription");
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

  if (supabaseObjectPath) {
    try {
      const fileName = supabaseObjectPath.split("/").at(-1) ?? "document";
      const signedUrl = await createPrivateDocumentUrl(supabaseObjectPath, fileName);
      if (!signedUrl) return new Response("Document storage is not configured", { status: 503 });
      return Response.redirect(signedUrl, 302);
    } catch {
      return new Response("Document retrieval failed", { status: 500 });
    }
  }

  // Handle Firebase Storage key
  if (key.startsWith("firebase:")) {
    const storagePath = key.replace(/^firebase:/, "");
    try {
      const downloadUrl = await getFirebaseDownloadUrl(storagePath);
      return Response.redirect(downloadUrl, 302);
    } catch (fbErr) {
      console.error("Firebase Storage retrieval failed:", fbErr);
      return new Response("Document retrieval failed", { status: 500 });
    }
  }

  // Handle direct Firebase URL
  if (key.startsWith("https://firebasestorage.googleapis.com")) {
    return Response.redirect(key, 302);
  }

  // Handle local development files
  if (localKey) {
    const [, type, filename] = localKey;
    const filePath = path.join(process.cwd(), ".local-data", "uploads", type, `${filename}.${localKey[3]}`);
    try {
      const file = await fs.promises.readFile(filePath);
      const contentTypes: Record<string, string> = {
        pdf: "application/pdf",
        jpg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
      };
      return new Response(new Uint8Array(file), {
        headers: {
          "Cache-Control": "private, no-store",
          "Content-Disposition": `attachment; filename="document.${localKey[3]}"`,
          "Content-Type": contentTypes[localKey[3].toLowerCase()],
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  }

  // Handle Cloudflare R2
  const storage = createStorageClient();
  const bucket = process.env.R2_BUCKET_NAME;
  if (!storage || !bucket) return new Response("Document storage is not configured", { status: 503 });

  const signedUrl = await getSignedUrl(storage, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 300 });
  return Response.redirect(signedUrl, 302);
}
