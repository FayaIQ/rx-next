import { readFile } from "fs/promises";
import path from "path";
import { NextRequest } from "next/server";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");
const LARAVEL_STORAGE = process.env.LARAVEL_STORAGE_PATH;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const relative = segments.join("/");

  const candidates = [
    path.join(UPLOAD_ROOT, relative),
    LARAVEL_STORAGE ? path.join(LARAVEL_STORAGE, relative) : null,
  ].filter(Boolean) as string[];

  for (const abs of candidates) {
    if (!abs.startsWith(UPLOAD_ROOT) && !LARAVEL_STORAGE) continue;
    if (LARAVEL_STORAGE && !abs.startsWith(LARAVEL_STORAGE) && !abs.startsWith(UPLOAD_ROOT)) {
      continue;
    }
    try {
      const data = await readFile(abs);
      const ext = path.extname(abs).toLowerCase();
      const type =
        ext === ".png"
          ? "image/png"
          : ext === ".webp"
            ? "image/webp"
            : ext === ".gif"
              ? "image/gif"
              : "image/jpeg";
      return new Response(data, {
        headers: {
          "Content-Type": type,
          "Cache-Control": "public, max-age=86400",
        },
      });
    } catch {
      // try next
    }
  }

  return new Response("Not found", { status: 404 });
}
