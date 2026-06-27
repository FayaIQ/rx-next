import { requireClinicApi, isClinicApiError } from "@/lib/api/clinic-auth";
import { apiOk, apiError, apiNotFound, apiServerError } from "@/lib/api/response";
import { serializeAppointment } from "@/lib/appointment-serializer";
import { visitStatusSchema } from "@/lib/validations/visit-queue";
import { updateAppointmentVisitStatus } from "@/lib/visit-queue/service";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;

  try {
    const { id } = await params;
    const body = await request.json();
    const { visitStatus } = visitStatusSchema.parse(body);

    if (
      ctx.userType === "secretary" &&
      (visitStatus === "with_doctor" || visitStatus === "done")
    ) {
      return apiError("الاستدعاء وإنهاء الزيارة من الطبيب فقط", 403);
    }

    const appointment = await updateAppointmentVisitStatus(
      ctx.doctorId,
      Number(id),
      visitStatus
    );

    if (!appointment) return apiNotFound("الموعد غير موجود");
    return apiOk({ appointment: serializeAppointment(appointment) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "بيانات غير صالحة");
    }
    return apiServerError();
  }
}
