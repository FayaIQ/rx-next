import { prisma } from "@/lib/prisma";
import { requireClinicApi, isClinicApiError } from "@/lib/api/clinic-auth";
import { apiOk, apiError, apiServerError } from "@/lib/api/response";
import { appointmentSchema } from "@/lib/validations/rx";
import { serializeAppointment } from "@/lib/appointment-serializer";
import { loadTreatmentToothMap } from "@/lib/appointment-treatment-link";
import { toDbId } from "@/lib/bigint";
import {
  buildPaginationMeta,
  parsePaginationParams,
} from "@/lib/pagination";
import { endOfDayUtc } from "@/lib/treatment/plan-utils";
import { z } from "zod";

export async function GET(request: Request) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const bookingFrom = searchParams.get("bookingFrom");
  const bookingTo = searchParams.get("bookingTo");
  const status = searchParams.get("status");
  const paginate = searchParams.get("paginate") === "1";
  const { page, pageSize, skip } = parsePaginationParams(searchParams);

  let dayFilter:
    | { bookingDate: Date | { gte?: Date; lte?: Date } }
    | { appointmentDatetime: { gte?: Date; lte?: Date } }
    | undefined;

  if (date) {
    // Calendar day view uses booking_date (what the user picked), not UTC datetime.
    dayFilter = { bookingDate: new Date(date) };
  } else if (bookingFrom || bookingTo) {
    const bookingFilter: { gte?: Date; lte?: Date } = {};
    if (bookingFrom) bookingFilter.gte = new Date(bookingFrom);
    if (bookingTo) bookingFilter.lte = endOfDayUtc(bookingTo);
    dayFilter = { bookingDate: bookingFilter };
  } else if (from || to) {
    const datetimeFilter: { gte?: Date; lte?: Date } = {};
    if (from) datetimeFilter.gte = new Date(from);
    if (to) datetimeFilter.lte = new Date(to);
    dayFilter = { appointmentDatetime: datetimeFilter };
  }

  const where = {
    doctorId: toDbId(ctx.doctorId),
    ...(dayFilter ?? {}),
    ...(status === "active"
      ? { status: true }
      : status === "cancelled"
        ? { status: false }
        : {}),
  };

  const orderBy = date
    ? { appointmentDatetime: "asc" as const }
    : [{ bookingDate: "asc" as const }, { appointmentDatetime: "asc" as const }];

  const findArgs = {
    where,
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
    orderBy,
    ...(paginate ? { skip, take: pageSize } : {}),
    ...(!paginate && !bookingFrom && !bookingTo && !date ? { take: 500 } : {}),
  };

  const appointments = await prisma.appointment.findMany(findArgs);
  const total = paginate
    ? await prisma.appointment.count({ where })
    : appointments.length;

  const toothMap = await loadTreatmentToothMap(appointments.map((a) => a.id));

  return apiOk({
    appointments: appointments.map((a) =>
      serializeAppointment(a, {
        treatmentToothFdi: toothMap.get(a.id.toString()) ?? null,
      })
    ),
    ...(paginate
      ? { pagination: buildPaginationMeta(page, pageSize, total) }
      : {}),
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
