import { prisma } from "@/lib/prisma";
import { requireAdminApi, isAdminApiError } from "@/lib/api/admin-auth";
import { apiOk, apiNotFound } from "@/lib/api/response";
import { serializeAdminUserWithSub } from "@/lib/admin-serializers";
import { serializeSubscription } from "@/lib/subscription";
import { fromDbId } from "@/lib/bigint";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const ctx = await requireAdminApi();
  if (isAdminApiError(ctx)) return ctx;

  const { id } = await params;
  const user = await prisma.user.findFirst({
    where: { id: BigInt(id), type: { not: "admin" } },
    include: {
      doctor: { select: { name: true } },
      _count: { select: { patients: true, secretaries: true } },
    },
  });

  if (!user) return apiNotFound("المستخدم غير موجود");

  const subscriptions = await prisma.subscription.findMany({
    where: { userId: user.id },
    include: { package: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const profile = await serializeAdminUserWithSub(fromDbId(user.id), user);

  return apiOk({
    user: profile,
    subscriptionHistory: subscriptions.map((s) =>
      serializeSubscription({ ...s, package: s.package })
    ),
  });
}
