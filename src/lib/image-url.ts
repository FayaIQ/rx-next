/**
 * Turn a stored upload path into a browser-loadable URL.
 * Relative paths go through `/api/storage` which serves local disk first,
 * then redirects to S3 CDN when configured — so old + new uploads both work.
 */
export function resolveImageUrl(
  storedPath: string | null | undefined,
  options?: { origin?: string }
): string | null {
  if (!storedPath) return null;
  if (storedPath.startsWith("http://") || storedPath.startsWith("https://")) {
    return storedPath;
  }

  // Prefer public CDN when available (faster; no app proxy hop).
  const cdn =
    process.env.NEXT_PUBLIC_S3_CDN_URL?.replace(/\/$/, "") ||
    (typeof window === "undefined"
      ? process.env.S3_CDN_URL?.replace(/\/$/, "")
      : undefined);

  if (cdn) {
    const relative = storedPath
      .replace(/^\/+/, "")
      .replace(/^uploads\//, "");
    if (relative && !relative.includes("..")) {
      // New S3 objects live under rx/; legacy local-only files still need
      // /api/storage. Use CDN for all when S3 is the source of truth.
      return `${cdn}/rx/${relative}`;
    }
  }

  const relative = storedPath
    .replace(/^\/+/, "")
    .replace(/^uploads\//, "");
  const url = `/api/storage/${relative}`;

  if (options?.origin) {
    return `${options.origin.replace(/\/$/, "")}${url}`;
  }
  return url;
}
