import { prisma } from "@/lib/prisma";
import { requireAdminApi, isAdminApiError } from "@/lib/api/admin-auth";
import { apiOk } from "@/lib/api/response";
import { serializeAdminUserWithSub } from "@/lib/admin-serializers";
import { fromDbId } from "@/lib/bigint";

export async function GET(request: Request) {
  const ctx = await requireAdminApi();
  if (isAdminApiError(ctx)) return ctx;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const q = searchParams.get("q")?.trim();

  const users = await prisma.user.findMany({
    where: {
      type: { not: "admin" },
      ...(type ? { type } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { phoneNumber: { contains: q } },
            ],
          }
        : {}),
    },
    include: {
      doctor: { select: { name: true } },
      _count: { select: { patients: true, secretaries: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const enriched = await Promise.all(
    users.map((u) => serializeAdminUserWithSub(fromDbId(u.id), u))
  );

  return apiOk({ users: enriched });
}
