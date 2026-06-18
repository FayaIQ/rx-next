export function resolveImageUrl(storedPath: string | null | undefined): string | null {
  if (!storedPath) return null;
  if (storedPath.startsWith("http://") || storedPath.startsWith("https://")) {
    return storedPath;
  }
  if (storedPath.startsWith("/uploads/")) return storedPath;
  if (storedPath.startsWith("uploads/")) return `/${storedPath}`;
  return `/api/storage/${storedPath.replace(/^\/+/, "")}`;
}
