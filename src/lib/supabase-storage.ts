import "server-only";

import { createClient } from "@supabase/supabase-js";

export type DocumentFolder = "licenses" | "prescriptions";

function getStorageClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

function getBucketName() {
  return process.env.SUPABASE_STORAGE_BUCKET || "documents";
}

async function getPrivateBucketClient() {
  const client = getStorageClient();
  if (!client) throw new Error("Supabase document storage is not configured.");
  const { data: bucket, error } = await client.storage.getBucket(getBucketName());
  if (error || !bucket || bucket.public) {
    throw new Error("Supabase document bucket must exist and be private.");
  }
  return client;
}

export function isSupabaseStorageConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function uploadPrivateDocument(
  objectPath: string,
  body: ArrayBuffer,
  contentType: string
) {
  const client = await getPrivateBucketClient();

  const { error } = await client.storage
    .from(getBucketName())
    .upload(objectPath, body, { contentType, upsert: false });
  if (error) throw new Error("Supabase document upload failed.");
}

export async function createPrivateDocumentUrl(objectPath: string, fileName: string) {
  const client = await getPrivateBucketClient();

  const { data, error } = await client.storage
    .from(getBucketName())
    .createSignedUrl(objectPath, 300, { download: fileName });
  if (error || !data?.signedUrl) throw new Error("Supabase document retrieval failed.");
  return data.signedUrl;
}

export function isSafeSupabaseDocumentKey(key: string) {
  return /^supabase:documents\/(licenses|prescriptions)\/[A-Za-z0-9_-]+\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpg|png|webp)$/i.test(key);
}

export function getSupabaseObjectPath(key: string) {
  if (!isSafeSupabaseDocumentKey(key)) return null;
  return key.slice("supabase:".length);
}
