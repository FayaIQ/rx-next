import { prisma } from "@/lib/prisma";
import { requireAdminApi, isAdminApiError } from "@/lib/api/admin-auth";
import { apiOk, apiError, apiNotFound } from "@/lib/api/response";
import { cancelActiveSubscription } from "@/lib/subscription";
import { toDbId } from "@/lib/bigint";

type Params = { params: Promise<{ userId: string }> };

export async function POST(_req: Request, { params }: Params) {
  const ctx = await requireAdminApi();
  if (isAdminApiError(ctx)) return ctx;

  try {
    const { userId } = await params;
    const user = await prisma.user.findFirst({
      where: { id: toDbId(Number(userId)), type: "doctor" },
    });
    if (!user) return apiNotFound("الطبيب غير موجود");

    await cancelActiveSubscription(Number(userId));
    return apiOk({ success: true });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "فشل الإلغاء");
  }
}
