import { auth } from "@/auth";
import { headers } from "next/headers";
import { toUserId } from "@/lib/user-id";
import {
  assertActiveSubscription,
  assertValidSession,
} from "@/lib/api/api-guard";
import { assertClinicFeatureForPath } from "@/lib/clinic-features";
import { apiForbidden, apiUnauthorized } from "./response";

export type DoctorContext = {
  doctorId: number;
  userId: number;
  userName: string;
};

export async function requireDoctorApi(): Promise<DoctorContext | Response> {
  const session = await auth();
  if (!session?.user) return apiUnauthorized();

  if (session.user.type !== "doctor") return apiForbidden();

  const sessionError = await assertValidSession(session);
  if (sessionError) return sessionError;

  const subscriptionError = await assertActiveSubscription(session);
  if (subscriptionError) return subscriptionError;

  const doctorId = toUserId(session.user.id);

  const pathname = (await headers()).get("x-pathname");
  if (pathname?.startsWith("/api/")) {
    const featureError = await assertClinicFeatureForPath(doctorId, pathname);
    if (featureError) return featureError;
  }

  return {
    doctorId,
    userId: doctorId,
    userName: session.user.name ?? "",
  };
}

export function isApiError(
  result: DoctorContext | Response
): result is Response {
  return result instanceof Response;
}
