import { prisma } from "@/lib/prisma";
import { requireClinicApi, isClinicApiError } from "@/lib/api/clinic-auth";
import { apiOk, apiError, apiNotFound, apiServerError } from "@/lib/api/response";
import { toDbId } from "@/lib/bigint";
import {
  buildPaginationMeta,
  parsePaginationParams,
} from "@/lib/pagination";
import { serializeFinanceTransaction } from "@/lib/finance/serializer";
import { financeTransactionSchema } from "@/lib/validations/finance";
import { z } from "zod";

export async function GET(request: Request) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;

  const { searchParams } = new URL(request.url);
  const { page, pageSize, skip } = parsePaginationParams(searchParams);
  const type = searchParams.get("type");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where = {
    doctorId: toDbId(ctx.doctorId),
    ...(type === "income" || type === "expense" ? { type } : {}),
    ...(from || to
      ? {
          transactionDate: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.financeTransaction.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true } },
      },
      orderBy: [{ transactionDate: "desc" }, { id: "desc" }],
      skip,
      take: pageSize,
    }),
    prisma.financeTransaction.count({ where }),
  ]);

  return apiOk({
    transactions: rows.map(serializeFinanceTransaction),
    pagination: buildPaginationMeta(total, page, pageSize),
  });
}

export async function POST(request: Request) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;

  try {
    const body = await request.json();
    const data = financeTransactionSchema.parse(body);

    if (data.patientId) {
      const patient = await prisma.patient.findFirst({
        where: {
          id: toDbId(data.patientId),
          doctorId: toDbId(ctx.doctorId),
        },
      });
      if (!patient) return apiNotFound("المريض غير موجود");
    }

    if (data.appointmentId) {
      const appointment = await prisma.appointment.findFirst({
        where: {
          id: toDbId(data.appointmentId),
          doctorId: toDbId(ctx.doctorId),
        },
      });
      if (!appointment) return apiNotFound("الموعد غير موجود");
    }

    const row = await prisma.financeTransaction.create({
      data: {
        doctorId: toDbId(ctx.doctorId),
        patientId: data.patientId ? toDbId(data.patientId) : null,
        appointmentId: data.appointmentId ? toDbId(data.appointmentId) : null,
        type: data.type,
        category: data.category,
        amount: data.amount,
        paymentMethod: data.paymentMethod ?? null,
        description: data.description?.trim() || null,
        transactionDate: new Date(data.transactionDate),
        createdById: toDbId(ctx.userId),
      },
      include: {
        patient: { select: { id: true, name: true } },
      },
    });

    return apiOk({ transaction: serializeFinanceTransaction(row) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "بيانات غير صالحة");
    }
    return apiServerError();
  }
}
