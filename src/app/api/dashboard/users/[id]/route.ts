import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminApi, isAdminApiError } from "@/lib/api/admin-auth";
import { apiError, apiOk, apiNotFound } from "@/lib/api/response";
import { serializeAdminUserWithSub } from "@/lib/admin-serializers";
import { serializeSubscription } from "@/lib/subscription";
import { fromDbId } from "@/lib/bigint";
import { adminChangePasswordSchema } from "@/lib/validations/admin";

type Params = { params: Promise<{ id: string }> };

function parseUserId(value: string): bigint | null {
  if (!/^\d+$/.test(value)) return null;
  const id = BigInt(value);
  return id > BigInt(0) ? id : null;
}

export async function GET(_req: Request, { params }: Params) {
  const ctx = await requireAdminApi();
  if (isAdminApiError(ctx)) return ctx;

  const { id } = await params;
  const userId = parseUserId(id);
  if (!userId) return apiNotFound("المستخدم غير موجود");

  const user = await prisma.user.findFirst({
    where: { id: userId, type: { not: "admin" } },
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

export async function PATCH(request: Request, { params }: Params) {
  const ctx = await requireAdminApi();
  if (isAdminApiError(ctx)) return ctx;

  try {
    const { id } = await params;
    const userId = parseUserId(id);
    if (!userId) return apiNotFound("المستخدم غير موجود");

    const user = await prisma.user.findFirst({
      where: { id: userId, type: { not: "admin" } },
      select: { id: true },
    });
    if (!user) return apiNotFound("المستخدم غير موجود");

    const data = adminChangePasswordSchema.parse(await request.json());
    const passwordHash = await bcrypt.hash(data.password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: passwordHash,
        // Invalidate every JWT issued before the password was changed.
        activeSessionId: crypto.randomUUID(),
      },
    });

    return apiOk({ success: true as const });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "بيانات غير صالحة");
    }
    console.error("[admin] change user password failed:", error);
    return apiError("تعذّر تغيير كلمة المرور", 500);
  }
}
