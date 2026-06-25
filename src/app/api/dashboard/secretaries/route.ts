import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdminApi, isAdminApiError } from "@/lib/api/admin-auth";
import { apiOk, apiError } from "@/lib/api/response";
import { serializeAdminUserWithSub } from "@/lib/admin-serializers";
import { createSecretarySchema } from "@/lib/validations/admin";
import { normalizePhone } from "@/lib/utils";
import { toDbId, fromDbId } from "@/lib/bigint";
import {
  buildPaginationMeta,
  parsePaginationParams,
} from "@/lib/pagination";
import { z } from "zod";

export async function GET(request: Request) {
  const ctx = await requireAdminApi();
  if (isAdminApiError(ctx)) return ctx;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const { page, pageSize, skip } = parsePaginationParams(searchParams);

  const where = {
    type: "secretary" as const,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { phoneNumber: { contains: q } },
          ],
        }
      : {}),
  };

  const [secretaries, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        doctor: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  const enriched = await Promise.all(
    secretaries.map((s) => serializeAdminUserWithSub(fromDbId(s.id), s))
  );

  return apiOk({
    secretaries: enriched,
    pagination: buildPaginationMeta(page, pageSize, total),
  });
}

export async function POST(request: Request) {
  const ctx = await requireAdminApi();
  if (isAdminApiError(ctx)) return ctx;

  try {
    const body = await request.json();
    const data = createSecretarySchema.parse(body);
    const phoneNumber = normalizePhone(data.phone);

    const existing = await prisma.user.findUnique({ where: { phoneNumber } });
    if (existing) return apiError("رقم الهاتف مستخدم مسبقاً");

    const doctor = await prisma.user.findFirst({
      where: { id: toDbId(data.doctorId), type: "doctor" },
    });
    if (!doctor) return apiError("الطبيب غير موجود");

    const hashed = await bcrypt.hash(data.password, 12);
    const secretary = await prisma.user.create({
      data: {
        name: data.name,
        phoneNumber,
        password: hashed,
        type: "secretary",
        doctorId: doctor.id,
        isConfirmed: true,
      },
      include: { doctor: { select: { name: true } } },
    });

    return apiOk(
      {
        secretary: await serializeAdminUserWithSub(
          fromDbId(secretary.id),
          secretary
        ),
      },
      201
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "بيانات غير صالحة");
    }
    return apiError(error instanceof Error ? error.message : "فشل الإنشاء");
  }
}
