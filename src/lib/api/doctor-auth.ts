import { auth } from "@/auth";
import { toUserId } from "@/lib/user-id";
import {
  assertActiveSubscription,
  assertValidSession,
} from "@/lib/api/api-guard";
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

  return {
    doctorId: toUserId(session.user.id),
    userId: toUserId(session.user.id),
    userName: session.user.name ?? "",
  };
}

export function isApiError(
  result: DoctorContext | Response
): result is Response {
  return result instanceof Response;
}
