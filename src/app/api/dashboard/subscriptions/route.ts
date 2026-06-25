import { prisma } from "@/lib/prisma";
import { requireAdminApi, isAdminApiError } from "@/lib/api/admin-auth";
import { apiOk } from "@/lib/api/response";
import { serializeAdminUserWithSub } from "@/lib/admin-serializers";
import { fromDbId } from "@/lib/bigint";
import {
  paginateArray,
  parsePaginationParams,
} from "@/lib/pagination";

export async function GET(request: Request) {
  const ctx = await requireAdminApi();
  if (isAdminApiError(ctx)) return ctx;

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") ?? "all";
  const { page, pageSize } = parsePaginationParams(searchParams);

  const doctors = await prisma.user.findMany({
    where: { type: "doctor" },
    include: { _count: { select: { patients: true, secretaries: true } } },
    orderBy: { name: "asc" },
  });

  const enriched = await Promise.all(
    doctors.map((d) => serializeAdminUserWithSub(fromDbId(d.id), d))
  );

  const filtered = enriched.filter((u) => {
    const sub = u.subscription;
    if (filter === "active") return sub?.isActive;
    if (filter === "trial") return sub?.isActive && sub.planType === "trial";
    if (filter === "expired") return !sub?.isActive;
    return true;
  });

  const { pageItems, pagination } = paginateArray(filtered, page, pageSize);

  return apiOk({ subscriptions: pageItems, pagination });
}
