import { prisma } from "@/lib/prisma";
import { requireClinicApi, isClinicApiError } from "@/lib/api/clinic-auth";
import { apiOk, apiError, apiServerError } from "@/lib/api/response";
import { appointmentSchema } from "@/lib/validations/rx";
import { serializeAppointment } from "@/lib/appointment-serializer";
import { toDbId } from "@/lib/bigint";
import { z } from "zod";

export async function GET(request: Request) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const status = searchParams.get("status");

  let datetimeFilter: { gte?: Date; lte?: Date } | undefined;

  if (date) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    datetimeFilter = { gte: dayStart, lte: dayEnd };
  } else if (from || to) {
    datetimeFilter = {};
    if (from) datetimeFilter.gte = new Date(from);
    if (to) datetimeFilter.lte = new Date(to);
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      doctorId: toDbId(ctx.doctorId),
      ...(datetimeFilter
        ? { appointmentDatetime: datetimeFilter }
        : {}),
      ...(status === "active"
        ? { status: true }
        : status === "cancelled"
          ? { status: false }
          : {}),
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
    orderBy: { appointmentDatetime: "asc" },
    take: 500,
  });

  return apiOk({
    appointments: appointments.map(serializeAppointment),
  });
}

export async function POST(request: Request) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;

  try {
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

    const appointment = await prisma.appointment.create({
      data: {
        doctorId: toDbId(ctx.doctorId),
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

    return apiOk({ appointment: serializeAppointment(appointment) }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "بيانات غير صالحة");
    }
    return apiServerError();
  }
}
