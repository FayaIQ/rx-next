import path from "path";

export function getUploadRoot(): string {
  if (process.env.UPLOAD_ROOT) {
    return path.resolve(process.env.UPLOAD_ROOT);
  }
  return path.join(process.cwd(), "public", "uploads");
}

export function getLegacyStorageRoot(): string | null {
  const legacy = process.env.LARAVEL_STORAGE_PATH;
  return legacy ? path.resolve(legacy) : null;
}

/** Map a stored DB path to an absolute file on disk, or null if invalid/missing root. */
export function resolveUploadFilePath(storedPath: string): string | null {
  const relative = storedPath
    .replace(/^\/+/, "")
    .replace(/^uploads\//, "");
  if (!relative || relative.includes("..")) return null;

  const roots = [getUploadRoot(), getLegacyStorageRoot()].filter(
    Boolean
  ) as string[];

  for (const root of roots) {
    const abs = path.resolve(root, relative);
    if (abs.startsWith(root + path.sep) || abs === root) {
      return abs;
    }
  }

  return null;
}
