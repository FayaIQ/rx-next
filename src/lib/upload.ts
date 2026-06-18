import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { randomUUID } from "crypto";

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
  | "profile";

function uploadDir(doctorId: number, kind: UploadKind): string {
  return path.join(process.cwd(), "public", "uploads", String(doctorId), kind);
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

  const dir = uploadDir(doctorId, kind);
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.jpg`;
  const absPath = path.join(dir, filename);
  await writeFile(absPath, processed);

  return `/uploads/${doctorId}/${kind}/${filename}`;
}

export async function deleteUploadedFile(storedPath: string | null | undefined) {
  if (!storedPath?.startsWith("/uploads/")) return;
  const absPath = path.join(
    process.cwd(),
    "public",
    storedPath.replace(/^\//, "")
  );
  try {
    await unlink(absPath);
  } catch {
    // ignore missing files
  }
}
