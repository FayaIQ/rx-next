import { prisma } from "@/lib/prisma";
import { requireClinicApi, isClinicApiError } from "@/lib/api/clinic-auth";
import { apiOk, apiNotFound } from "@/lib/api/response";
import { serializeAppointment } from "@/lib/appointment-serializer";
import { toDbId } from "@/lib/bigint";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(_req: Request, { params }: Params) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;

  const { id } = await params;
  const existing = await prisma.appointment.findFirst({
    where: { id: toDbId(id), doctorId: toDbId(ctx.doctorId) },
  });
  if (!existing) return apiNotFound("الموعد غير موجود");

  const appointment = await prisma.appointment.update({
    where: { id: existing.id },
    data: { status: !existing.status },
    include: {
      patient: {
        select: {
          id: true,
          name: true,
          phone: true,
          gender: true,
          birthdate: true,
        },
      },
    },
  });

  return apiOk({ appointment: serializeAppointment(appointment) });
}
