import { auth } from "@/auth";
import { toUserId } from "@/lib/user-id";
import { apiForbidden, apiUnauthorized } from "./response";

export type DoctorContext = {
  doctorId: number;
  userId: number;
  userName: string;
};

export async function requireDoctorApi(): Promise<
  DoctorContext | ReturnType<typeof apiUnauthorized>
> {
  const session = await auth();
  if (!session?.user) return apiUnauthorized();

  if (session.user.type !== "doctor") return apiForbidden();

  return {
    doctorId: toUserId(session.user.id),
    userId: toUserId(session.user.id),
    userName: session.user.name ?? "",
  };
}

export function isApiError(
  result: DoctorContext | ReturnType<typeof apiUnauthorized>
): result is ReturnType<typeof apiUnauthorized> {
  return result instanceof Response;
}
