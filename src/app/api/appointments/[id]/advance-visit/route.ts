import { requireClinicApi, isClinicApiError } from "@/lib/api/clinic-auth";
import { apiOk, apiError, apiNotFound, apiServerError } from "@/lib/api/response";
import { serializeAppointment } from "@/lib/appointment-serializer";
import { advanceAppointmentVisitStatus } from "@/lib/visit-queue/service";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;

  try {
    const { id } = await params;
    const appointment = await advanceAppointmentVisitStatus(
      ctx.doctorId,
      Number(id),
      ctx.userType
    );

    if (!appointment) return apiNotFound("الموعد غير موجود أو لا يمكن التقدّم");
    return apiOk({ appointment: serializeAppointment(appointment) });
  } catch {
    return apiServerError();
  }
}
