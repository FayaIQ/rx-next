import { access, readFile } from "fs/promises";
import path from "path";
import { NextRequest } from "next/server";
import {
  getLegacyStorageRoot,
  getUploadRoot,
} from "@/lib/upload-path";
import { getS3ObjectBuffer, isS3Configured, toS3PublicUrl } from "@/lib/s3";

export const dynamic = "force-dynamic";

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

function safeJoin(root: string, relative: string): string | null {
  const abs = path.resolve(root, relative);
  if (abs.startsWith(root + path.sep) || abs === root) return abs;
  return null;
}

async function findUploadFile(relative: string): Promise<string | null> {
  const cleaned = relative
    .replace(/^\/+/, "")
    .replace(/^uploads\//, "");
  if (!cleaned || cleaned.includes("..")) return null;

  const roots = [getUploadRoot(), getLegacyStorageRoot()].filter(
    Boolean
  ) as string[];

  for (const root of roots) {
    const abs = safeJoin(root, cleaned);
    if (!abs) continue;
    try {
      await access(abs);
      return abs;
    } catch {
      // try next root
    }
  }

  return null;
}

function notFound() {
  return new Response("Not found", {
    status: 404,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "CDN-Cache-Control": "no-store",
    },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const relative = segments.join("/");
  const absPath = await findUploadFile(relative);

  if (absPath) {
    try {
      const data = await readFile(absPath);
      const ext = path.extname(absPath).toLowerCase();
      return new Response(new Uint8Array(data), {
        headers: {
          "Content-Type": contentTypeFor(ext),
          "Cache-Control":
            "public, max-age=86400, stale-while-revalidate=604800",
        },
      });
    } catch {
      return notFound();
    }
  }

  // Prefer CDN redirect when S3 holds the object (legacy /api/storage links).
  if (isS3Configured()) {
    const cdn = toS3PublicUrl(`/uploads/${relative}`);
    if (cdn) {
      return Response.redirect(cdn, 302);
    }
  }

  const fromS3 = await getS3ObjectBuffer(`/uploads/${relative}`);
  if (fromS3) {
    return new Response(new Uint8Array(fromS3.body), {
      headers: {
        "Content-Type": fromS3.contentType,
        "Cache-Control":
          "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  }

  return notFound();
}
