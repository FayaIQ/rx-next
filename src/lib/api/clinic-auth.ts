import { auth } from "@/auth";
import { toUserId } from "@/lib/user-id";
import {
  assertActiveSubscription,
  assertValidSession,
  resolveSecretaryDoctorId,
} from "@/lib/api/api-guard";
import { apiForbidden, apiUnauthorized } from "./response";

export type ClinicContext = {
  doctorId: number;
  userId: number;
  userName: string;
  userType: "doctor" | "secretary";
};

export async function requireClinicApi(): Promise<ClinicContext | Response> {
  const session = await auth();
  if (!session?.user) return apiUnauthorized();

  const sessionError = await assertValidSession(session);
  if (sessionError) return sessionError;

  const subscriptionError = await assertActiveSubscription(session);
  if (subscriptionError) return subscriptionError;

  if (session.user.type === "doctor") {
    return {
      doctorId: toUserId(session.user.id),
      userId: toUserId(session.user.id),
      userName: session.user.name ?? "",
      userType: "doctor",
    };
  }

  if (session.user.type === "secretary") {
    const resolved = await resolveSecretaryDoctorId(toUserId(session.user.id));
    if (resolved instanceof Response) return resolved;

    return {
      doctorId: resolved.doctorId,
      userId: toUserId(session.user.id),
      userName: session.user.name ?? "",
      userType: "secretary",
    };
  }

  return apiForbidden();
}

export function isClinicApiError(
  result: ClinicContext | Response
): result is Response {
  return result instanceof Response;
}
