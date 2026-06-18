import { auth } from "@/auth";
import { validateSession } from "@/lib/auth-credentials";
import { toUserId, toOptionalUserId } from "@/lib/user-id";
import { apiForbidden, apiUnauthorized } from "./response";

export type ClinicContext = {
  doctorId: number;
  userId: number;
  userName: string;
  userType: "doctor" | "secretary";
};

export async function requireClinicApi(): Promise<
  ClinicContext | ReturnType<typeof apiUnauthorized>
> {
  const session = await auth();
  if (!session?.user) return apiUnauthorized();

  const valid = await validateSession(
    toUserId(session.user.id),
    session.user.sessionId
  );
  if (!valid) return apiUnauthorized();

  if (session.user.type === "doctor") {
    return {
      doctorId: toUserId(session.user.id),
      userId: toUserId(session.user.id),
      userName: session.user.name ?? "",
      userType: "doctor",
    };
  }

  if (session.user.type === "secretary") {
    if (!session.user.isConfirmed) return apiForbidden();
    const doctorId = toOptionalUserId(session.user.doctorId);
    if (!doctorId) return apiForbidden();

    return {
      doctorId,
      userId: toUserId(session.user.id),
      userName: session.user.name ?? "",
      userType: "secretary",
    };
  }

  return apiForbidden();
}

export function isClinicApiError(
  result: ClinicContext | ReturnType<typeof apiUnauthorized>
): result is ReturnType<typeof apiUnauthorized> {
  return result instanceof Response;
}
