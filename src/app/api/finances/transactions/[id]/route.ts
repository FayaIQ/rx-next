import { prisma } from "@/lib/prisma";
import { requireClinicApi, isClinicApiError } from "@/lib/api/clinic-auth";
import {
  apiOk,
  apiError,
  apiNotFound,
  apiServerError,
} from "@/lib/api/response";
import { toDbId } from "@/lib/bigint";
import { serializeFinanceTransaction } from "@/lib/finance/serializer";
import { financeTransactionUpdateSchema } from "@/lib/validations/finance";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;

  try {
    const { id } = await params;
    const existing = await prisma.financeTransaction.findFirst({
      where: {
        id: toDbId(id),
        doctorId: toDbId(ctx.doctorId),
      },
    });
    if (!existing) return apiNotFound("الحركة غير موجودة");

    const body = await request.json();
    const data = financeTransactionUpdateSchema.parse(body);

    if (data.patientId) {
      const patient = await prisma.patient.findFirst({
        where: {
          id: toDbId(data.patientId),
          doctorId: toDbId(ctx.doctorId),
        },
      });
      if (!patient) return apiNotFound("المريض غير موجود");
    }

    const row = await prisma.financeTransaction.update({
      where: { id: existing.id },
      data: {
        ...(data.type != null ? { type: data.type } : {}),
        ...(data.category != null ? { category: data.category } : {}),
        ...(data.amount != null ? { amount: data.amount } : {}),
        ...(data.paymentMethod !== undefined
          ? { paymentMethod: data.paymentMethod }
          : {}),
        ...(data.description !== undefined
          ? { description: data.description?.trim() || null }
          : {}),
        ...(data.transactionDate != null
          ? { transactionDate: new Date(data.transactionDate) }
          : {}),
        ...(data.patientId !== undefined
          ? {
              patientId: data.patientId ? toDbId(data.patientId) : null,
            }
          : {}),
        ...(data.appointmentId !== undefined
          ? {
              appointmentId: data.appointmentId
                ? toDbId(data.appointmentId)
                : null,
            }
          : {}),
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

export async function DELETE(_request: Request, { params }: Params) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;

  const { id } = await params;
  const existing = await prisma.financeTransaction.findFirst({
    where: {
      id: toDbId(id),
      doctorId: toDbId(ctx.doctorId),
    },
  });
  if (!existing) return apiNotFound("الحركة غير موجودة");

  await prisma.financeTransaction.delete({ where: { id: existing.id } });
  return apiOk({ success: true });
}
