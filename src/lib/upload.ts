import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { randomUUID } from "crypto";
import { getUploadRoot } from "@/lib/upload-path";
import {
  deleteFromS3,
  isS3Configured,
  toS3Key,
  uploadToS3,
} from "@/lib/s3";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export type UploadKind =
  | "logo"
  | "design"
  | "xray"
  | "analysis"
  | "profile"
  | "tooth";

function uploadDir(doctorId: number, kind: UploadKind): string {
  return path.join(getUploadRoot(), String(doctorId), kind);
}

export async function saveUploadedImage(
  file: File,
  doctorId: number,
  kind: UploadKind,
  maxWidth = 1200
): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("نوع الملف غير مدعوم. استخدم JPG أو PNG أو WebP");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("حجم الملف يجب أن لا يتجاوز 2 ميغابايت");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const processed = await sharp(buffer)
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  const filename = `${randomUUID()}.jpg`;
  const storedPath = `/uploads/${doctorId}/${kind}/${filename}`;

  if (isS3Configured()) {
    const key = toS3Key(storedPath);
    if (!key) throw new Error("مسار رفع غير صالح");
    await uploadToS3({
      key,
      body: processed,
      contentType: "image/jpeg",
    });
    return storedPath;
  }

  const dir = uploadDir(doctorId, kind);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), processed);
  return storedPath;
}

export async function deleteUploadedFile(storedPath: string | null | undefined) {
  if (!storedPath) return;

  if (isS3Configured()) {
    await deleteFromS3(storedPath);
  }

  const relative = storedPath
    .replace(/^\/+/, "")
    .replace(/^uploads\//, "");
  if (!relative || relative.includes("..")) return;

  const absPath = path.join(getUploadRoot(), relative);
  try {
    await unlink(absPath);
  } catch {
    // ignore missing files
  }
}
