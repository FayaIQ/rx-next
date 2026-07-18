import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const PREFIX = "rx";

function requiredEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

export function isS3Configured(): boolean {
  return Boolean(
    requiredEnv("S3_ENDPOINT") &&
      requiredEnv("S3_BUCKET_NAME") &&
      requiredEnv("S3_ACCESS_KEY") &&
      requiredEnv("S3_SECRET_KEY")
  );
}

function getBucket(): string {
  const bucket = requiredEnv("S3_BUCKET_NAME");
  if (!bucket) throw new Error("S3_BUCKET_NAME غير مضبوط");
  return bucket;
}

function getCdnBase(): string {
  const cdn = requiredEnv("S3_CDN_URL");
  if (cdn) return cdn.replace(/\/$/, "");
  const endpoint = requiredEnv("S3_ENDPOINT")?.replace(/\/$/, "");
  const bucket = getBucket();
  if (!endpoint) throw new Error("S3_ENDPOINT غير مضبوط");
  return `${endpoint}/${bucket}`;
}

let client: S3Client | null = null;

function getClient(): S3Client {
  if (client) return client;

  const endpoint = requiredEnv("S3_ENDPOINT");
  const accessKey = requiredEnv("S3_ACCESS_KEY");
  const secretKey = requiredEnv("S3_SECRET_KEY");
  if (!endpoint || !accessKey || !secretKey) {
    throw new Error("إعدادات S3 ناقصة");
  }

  client = new S3Client({
    region: requiredEnv("S3_REGION") || "eu-central",
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
  });

  return client;
}

/** Normalize a DB path like `/uploads/50/design/x.jpg` → `50/design/x.jpg`. */
export function normalizeUploadRelative(storedPath: string): string | null {
  const relative = storedPath
    .replace(/^\/+/, "")
    .replace(/^uploads\//, "");
  if (!relative || relative.includes("..")) return null;
  return relative;
}

/** S3 object key: `rx/50/design/x.jpg` */
export function toS3Key(storedPathOrRelative: string): string | null {
  const relative = normalizeUploadRelative(storedPathOrRelative);
  if (!relative) return null;
  return `${PREFIX}/${relative}`;
}

/** Public CDN URL for a stored upload path. */
export function toS3PublicUrl(storedPath: string): string | null {
  if (!isS3Configured()) return null;
  const key = toS3Key(storedPath);
  if (!key) return null;
  return `${getCdnBase()}/${key}`;
}

export async function uploadToS3(params: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<void> {
  // Bucket policy / CDN visibility is configured on Hetzner — no object ACL.
  await getClient().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    })
  );
}

export async function deleteFromS3(storedPath: string): Promise<void> {
  if (!isS3Configured()) return;
  const key = toS3Key(storedPath);
  if (!key) return;

  try {
    await getClient().send(
      new DeleteObjectCommand({
        Bucket: getBucket(),
        Key: key,
      })
    );
  } catch {
    // ignore missing / already deleted
  }
}

export async function s3ObjectExists(storedPath: string): Promise<boolean> {
  if (!isS3Configured()) return false;
  const key = toS3Key(storedPath);
  if (!key) return false;

  try {
    await getClient().send(
      new HeadObjectCommand({
        Bucket: getBucket(),
        Key: key,
      })
    );
    return true;
  } catch {
    return false;
  }
}

export async function getS3ObjectBuffer(
  storedPath: string
): Promise<{ body: Buffer; contentType: string } | null> {
  if (!isS3Configured()) return null;
  const key = toS3Key(storedPath);
  if (!key) return null;

  try {
    const res = await getClient().send(
      new GetObjectCommand({
        Bucket: getBucket(),
        Key: key,
      })
    );
    if (!res.Body) return null;
    const bytes = await res.Body.transformToByteArray();
    return {
      body: Buffer.from(bytes),
      contentType: res.ContentType || "application/octet-stream",
    };
  } catch {
    return null;
  }
}
