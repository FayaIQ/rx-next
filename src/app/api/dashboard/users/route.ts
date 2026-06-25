import { prisma } from "@/lib/prisma";
import { requireAdminApi, isAdminApiError } from "@/lib/api/admin-auth";
import { apiOk } from "@/lib/api/response";
import { serializeAdminUserWithSub } from "@/lib/admin-serializers";
import { fromDbId } from "@/lib/bigint";
import {
  buildPaginationMeta,
  parsePaginationParams,
} from "@/lib/pagination";

export async function GET(request: Request) {
  const ctx = await requireAdminApi();
  if (isAdminApiError(ctx)) return ctx;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const q = searchParams.get("q")?.trim();
  const { page, pageSize, skip } = parsePaginationParams(searchParams);

  const where = {
    type: { not: "admin" as const },
    ...(type ? { type } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { phoneNumber: { contains: q } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        doctor: { select: { name: true } },
        _count: { select: { patients: true, secretaries: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  const enriched = await Promise.all(
    users.map((u) => serializeAdminUserWithSub(fromDbId(u.id), u))
  );

  return apiOk({
    users: enriched,
    pagination: buildPaginationMeta(page, pageSize, total),
  });
}
