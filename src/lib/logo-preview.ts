import { resolveImageUrl } from "@/lib/image-url";

export function isRasterLogo(file: Pick<File, "type" | "size">): boolean {
  return ["image/png", "image/jpeg", "image/webp"].includes(file.type)
    && file.size > 0 && file.size <= 10 * 1024 * 1024;
}

/** Saved logos can use our upload routes or the configured HTTPS storage host. */
export function storedLogoPreview(storedPath: string | null | undefined): string | null {
  if (!storedPath || storedPath.length > 2048 || /[<>"'\r\n]/.test(storedPath)) return null;
  if (storedPath.startsWith("//") || storedPath.includes("..")) return null;
  if (storedPath.includes(":") && !storedPath.startsWith("https://")) return null;
  const source = resolveImageUrl(storedPath);
  if (!source) return null;
  if (source.startsWith("/api/storage/") || source.startsWith("/landing/")) return source;
  try {
    const url = new URL(source);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    const cdn = process.env.NEXT_PUBLIC_S3_CDN_URL;
    const hosts = new Set(["nbg1.your-objectstorage.com", "rx.faya.dev"]);
    if (cdn) hosts.add(new URL(cdn).hostname);
    return hosts.has(url.hostname) ? url.href : null;
  } catch {
    return null;
  }
}
