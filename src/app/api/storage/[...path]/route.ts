import { readFile } from "fs/promises";
import path from "path";
import { NextRequest } from "next/server";
import { resolveUploadFilePath } from "@/lib/upload-path";

function contentTypeFor(ext: string): string {
  switch (ext) {
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    default:
      return "image/jpeg";
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const relative = segments.join("/");
  const absPath = resolveUploadFilePath(relative);

  if (!absPath) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const data = await readFile(absPath);
    const ext = path.extname(absPath).toLowerCase();
    return new Response(data, {
      headers: {
        "Content-Type": contentTypeFor(ext),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
