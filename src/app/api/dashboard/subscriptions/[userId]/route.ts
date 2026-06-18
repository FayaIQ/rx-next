import { prisma } from "@/lib/prisma";
import { requireAdminApi, isAdminApiError } from "@/lib/api/admin-auth";
import { apiOk, apiError, apiNotFound } from "@/lib/api/response";
import {
  activatePackageForUser,
  activateCustomSubscription,
  serializeSubscription,
} from "@/lib/subscription";
import { activateSubscriptionSchema } from "@/lib/validations/admin";
import { toDbId } from "@/lib/bigint";
import { z } from "zod";

type Params = { params: Promise<{ userId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const ctx = await requireAdminApi();
  if (isAdminApiError(ctx)) return ctx;

  const { userId } = await params;
  const user = await prisma.user.findFirst({
    where: { id: toDbId(userId), type: "doctor" },
  });
  if (!user) return apiNotFound("الطبيب غير موجود");

  const history = await prisma.subscription.findMany({
    where: { userId: user.id },
    include: { package: true },
    orderBy: { createdAt: "desc" },
  });

  return apiOk({
    history: history.map((s) =>
      serializeSubscription({ ...s, package: s.package })
    ),
  });
}

export async function POST(request: Request, { params }: Params) {
  const ctx = await requireAdminApi();
  if (isAdminApiError(ctx)) return ctx;

  try {
    const { userId } = await params;
    const uid = Number(userId);

    const user = await prisma.user.findFirst({
      where: { id: toDbId(uid), type: "doctor" },
    });
    if (!user) return apiNotFound("الطبيب غير موجود");

    const body = await request.json();
    const data = activateSubscriptionSchema.parse(body);

    let subId: bigint;
    if (data.packageId) {
      const created = await activatePackageForUser(
        uid,
        data.packageId,
        ctx.adminId,
        data.notes
      );
      subId = created.id;
    } else if (data.duration && data.durationUnit) {
      const created = await activateCustomSubscription(
        uid,
        ctx.adminId,
        data.duration,
        data.durationUnit,
        data.notes
      );
      subId = created.id;
    } else {
      return apiError("حدد باقة أو مدة مخصصة");
    }

    const sub = await prisma.subscription.findUnique({
      where: { id: subId },
      include: { package: true },
    });

    return apiOk({
      subscription: sub
        ? serializeSubscription({ ...sub, package: sub.package })
        : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "بيانات غير صالحة");
    }
    return apiError(error instanceof Error ? error.message : "فشل التفعيل");
  }
}
