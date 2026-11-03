import { z } from "zod";
import { requireClinicApi, isClinicApiError } from "@/lib/api/clinic-auth";
import { apiOk, apiError, apiNotFound, apiServerError } from "@/lib/api/response";
import { toDbId } from "@/lib/bigint";
import { BillingError, getSessionBilling, saveSessionBilling } from "@/lib/finance/session-billing-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;
  const result = await getSessionBilling(toDbId(ctx.doctorId), toDbId((await params).id));
  return result ? apiOk(result) : apiNotFound("الجلسة غير موجودة");
}

export async function POST(request: Request, { params }: Params) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;
  try {
    const result = await saveSessionBilling(toDbId(ctx.doctorId), toDbId(ctx.userId), toDbId((await params).id), await request.json());
    return apiOk(result);
  } catch (error) {
    if (error instanceof z.ZodError) return apiError(error.issues[0]?.message ?? "بيانات غير صالحة");
    if (error instanceof BillingError) return apiError(error.message);
    return apiServerError(undefined, error);
  }
}
