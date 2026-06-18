import { prisma } from "@/lib/prisma";
import { requireAdminApi, isAdminApiError } from "@/lib/api/admin-auth";
import { apiOk, apiError } from "@/lib/api/response";
import { serializePackage } from "@/lib/admin-serializers";
import { packageSchema } from "@/lib/validations/admin";
import { z } from "zod";

export async function GET() {
  const ctx = await requireAdminApi();
  if (isAdminApiError(ctx)) return ctx;

  const packages = await prisma.package.findMany({
    orderBy: [{ isActive: "desc" }, { price: "asc" }],
  });

  return apiOk({ packages: packages.map(serializePackage) });
}

export async function POST(request: Request) {
  const ctx = await requireAdminApi();
  if (isAdminApiError(ctx)) return ctx;

  try {
    const body = await request.json();
    const data = packageSchema.parse(body);

    const pkg = await prisma.package.create({
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

    return apiOk({ package: serializePackage(pkg) }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "بيانات غير صالحة");
    }
    return apiError("فشل إنشاء الباقة");
  }
}
