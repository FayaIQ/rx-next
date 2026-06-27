import { requireClinicApi, isClinicApiError } from "@/lib/api/clinic-auth";
import { apiOk, apiError, apiServerError } from "@/lib/api/response";
import { serializeAppointment } from "@/lib/appointment-serializer";
import { callNextPatient } from "@/lib/visit-queue/service";

export async function POST(request: Request) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;
  if (ctx.userType !== "doctor") {
    return apiError("الاستدعاء من الطبيب فقط", 403);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const date =
      typeof body.date === "string" && body.date.trim()
        ? body.date.trim()
        : undefined;

    const result = await callNextPatient(ctx.doctorId, date);

    return apiOk({
      appointment: result.appointment
        ? serializeAppointment(result.appointment)
        : null,
      message: result.appointment
        ? null
        : "لا يوجد مرضى في الانتظار",
    });
  } catch {
    return apiServerError();
  }
}
