import { prisma } from "@/lib/prisma";
import { requireAdminApi, isAdminApiError } from "@/lib/api/admin-auth";
import { apiOk, apiError } from "@/lib/api/response";
import { serializeAdminUserWithSub } from "@/lib/admin-serializers";
import { createDoctorSchema } from "@/lib/validations/admin";
import { registerDoctor } from "@/lib/auth-credentials";
import { fromDbId } from "@/lib/bigint";
import { z } from "zod";

export async function GET(request: Request) {
  const ctx = await requireAdminApi();
  if (isAdminApiError(ctx)) return ctx;

  const { searchParams } = new URL(request.url);
  const tab = searchParams.get("tab") ?? "all";

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  let extraWhere = {};
  if (tab === "new") {
    extraWhere = { createdAt: { gte: weekAgo } };
  }

  const doctors = await prisma.user.findMany({
    where: { type: "doctor", ...extraWhere },
    include: {
      _count: { select: { patients: true, secretaries: true } },
      ...(tab === "today"
        ? {
            appointments: {
              where: {
                appointmentDatetime: { gte: todayStart, lte: todayEnd },
                status: true,
              },
              take: 1,
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const filtered =
    tab === "today"
      ? doctors.filter(
          (d) => "appointments" in d && Array.isArray(d.appointments) && d.appointments.length > 0
        )
      : doctors;

  const enriched = await Promise.all(
    filtered.map((d) => serializeAdminUserWithSub(fromDbId(d.id), d))
  );

  return apiOk({ doctors: enriched });
}

export async function POST(request: Request) {
  const ctx = await requireAdminApi();
  if (isAdminApiError(ctx)) return ctx;

  try {
    const body = await request.json();
    const data = createDoctorSchema.parse(body);

    const user = await registerDoctor({
      name: data.name,
      phone: data.phone,
      password: data.password,
    });

    if (data.specialty) {
      await prisma.recipeSettings.updateMany({
        where: { doctorId: user.id },
        data: { doctorSpecialty: data.specialty },
      });
    }

    const doctor = await prisma.user.findUnique({
      where: { id: user.id },
      include: { _count: { select: { patients: true, secretaries: true } } },
    });

    if (!doctor) return apiError("فشل إنشاء الطبيب");

    return apiOk(
      {
        doctor: await serializeAdminUserWithSub(fromDbId(doctor.id), doctor),
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
