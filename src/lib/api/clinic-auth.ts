import { auth } from "@/auth";
import { headers } from "next/headers";
import { toUserId } from "@/lib/user-id";
import {
  assertActiveSubscription,
  assertValidSession,
  resolveSecretaryDoctorId,
} from "@/lib/api/api-guard";
import { assertClinicFeatureForPath } from "@/lib/clinic-features";
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

  let doctorId: number;
  let userType: "doctor" | "secretary";

  if (session.user.type === "doctor") {
    doctorId = toUserId(session.user.id);
    userType = "doctor";
  } else if (session.user.type === "secretary") {
    const resolved = await resolveSecretaryDoctorId(toUserId(session.user.id));
    if (resolved instanceof Response) return resolved;
    doctorId = resolved.doctorId;
    userType = "secretary";
  } else {
    return apiForbidden();
  }

  const pathname = (await headers()).get("x-pathname");
  if (pathname?.startsWith("/api/")) {
    const featureError = await assertClinicFeatureForPath(doctorId, pathname);
    if (featureError) return featureError;
  }

  return {
    doctorId,
    userId: toUserId(session.user.id),
    userName: session.user.name ?? "",
    userType,
  };
}

export function isClinicApiError(
  result: ClinicContext | Response
): result is Response {
  return result instanceof Response;
}
