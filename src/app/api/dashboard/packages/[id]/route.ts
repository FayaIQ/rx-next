import { prisma } from "@/lib/prisma";
import { requireAdminApi, isAdminApiError } from "@/lib/api/admin-auth";
import { apiOk, apiError, apiNotFound } from "@/lib/api/response";
import { serializePackage } from "@/lib/admin-serializers";
import { packageSchema } from "@/lib/validations/admin";
import { toDbId } from "@/lib/bigint";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const ctx = await requireAdminApi();
  if (isAdminApiError(ctx)) return ctx;

  try {
    const { id } = await params;
    const existing = await prisma.package.findUnique({
      where: { id: toDbId(id) },
    });
    if (!existing) return apiNotFound("الباقة غير موجودة");

    const body = await request.json();
    const data = packageSchema.parse(body);

    const pkg = await prisma.package.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        price: data.price,
        description: data.description,
        duration: data.duration,
        durationUnit: data.durationUnit,
        planType: data.planType,
        isTrial: data.isTrial ?? false,
        isActive: data.isActive ?? true,
      },
    });

    return apiOk({ package: serializePackage(pkg) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "بيانات غير صالحة");
    }
    return apiError("فشل التحديث");
  }
}
