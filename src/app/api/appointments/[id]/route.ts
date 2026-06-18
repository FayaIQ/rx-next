import { prisma } from "@/lib/prisma";
import { requireClinicApi, isClinicApiError } from "@/lib/api/clinic-auth";
import { apiOk, apiError, apiNotFound, apiServerError } from "@/lib/api/response";
import { appointmentSchema } from "@/lib/validations/rx";
import { serializeAppointment } from "@/lib/appointment-serializer";
import { toDbId } from "@/lib/bigint";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;

  const { id } = await params;
  const appointment = await prisma.appointment.findFirst({
    where: { id: toDbId(id), doctorId: toDbId(ctx.doctorId) },
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

  if (!appointment) return apiNotFound("الموعد غير موجود");
  return apiOk({ appointment: serializeAppointment(appointment) });
}

export async function PUT(request: Request, { params }: Params) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;

  try {
    const { id } = await params;
    const existing = await prisma.appointment.findFirst({
      where: { id: toDbId(id), doctorId: toDbId(ctx.doctorId) },
    });
    if (!existing) return apiNotFound("الموعد غير موجود");

    const body = await request.json();
    const data = appointmentSchema.parse(body);

    const patient = await prisma.patient.findFirst({
      where: {
        id: toDbId(data.patientId),
        doctorId: toDbId(ctx.doctorId),
      },
    });
    if (!patient) return apiError("المريض غير موجود");

    const appointmentDatetime = new Date(data.appointmentDatetime);
    const bookingDate = data.bookingDate
      ? new Date(data.bookingDate)
      : new Date(appointmentDatetime.toDateString());

    const appointment = await prisma.appointment.update({
      where: { id: existing.id },
      data: {
        patientId: toDbId(data.patientId),
        appointmentDatetime,
        bookingDate,
        notes: data.notes ?? null,
        status: data.status ?? true,
      },
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "بيانات غير صالحة");
    }
    return apiServerError();
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;

  const { id } = await params;
  const existing = await prisma.appointment.findFirst({
    where: { id: toDbId(id), doctorId: toDbId(ctx.doctorId) },
  });
  if (!existing) return apiNotFound("الموعد غير موجود");

  await prisma.appointment.delete({ where: { id: existing.id } });
  return apiOk({ success: true });
}
