/**
 * Turn a stored upload path into a browser-loadable URL.
 * Production serves files via /api/storage (not static /uploads) because
 * runtime uploads are not bundled into the Next.js public asset manifest.
 */
export function resolveImageUrl(
  storedPath: string | null | undefined,
  options?: { origin?: string }
): string | null {
  if (!storedPath) return null;
  if (storedPath.startsWith("http://") || storedPath.startsWith("https://")) {
    return storedPath;
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
