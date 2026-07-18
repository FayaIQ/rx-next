import { auth } from "@/auth";
import { toUserId } from "@/lib/user-id";
import { apiOk, apiUnauthorized, apiForbidden } from "@/lib/api/response";
import { listClinicFeatures } from "@/lib/clinic-features";
import { resolveSecretaryDoctorId } from "@/lib/api/api-guard";

export async function GET() {
  const session = await auth();
  if (!session?.user) return apiUnauthorized();

  const type = session.user.type;
  let doctorId: number | null = null;

  if (type === "doctor") {
    doctorId = toUserId(session.user.id);
  } else if (type === "secretary") {
    const resolved = await resolveSecretaryDoctorId(toUserId(session.user.id));
    if (resolved instanceof Response) return resolved;
    doctorId = resolved.doctorId;
  } else if (type === "admin") {
    return apiOk({ features: [] });
  } else {
    return apiForbidden();
  }

  if (!doctorId) return apiForbidden();

  const features = await listClinicFeatures(doctorId);
  return apiOk({ features });
}
