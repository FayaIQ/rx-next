import { auth } from "@/auth";
import { validateSession } from "@/lib/auth-credentials";
import { toUserId } from "@/lib/user-id";
import { apiForbidden, apiUnauthorized } from "./response";

export type AdminContext = {
  adminId: number;
  userName: string;
};

export async function requireAdminApi(): Promise<
  AdminContext | ReturnType<typeof apiUnauthorized>
> {
  const session = await auth();
  if (!session?.user) return apiUnauthorized();
  if (session.user.type !== "admin") return apiForbidden();

  const valid = await validateSession(
    toUserId(session.user.id),
    session.user.sessionId
  );
  if (!valid) return apiUnauthorized();

  return {
    adminId: toUserId(session.user.id),
    userName: session.user.name ?? "",
  };
}

export function isAdminApiError(
  result: AdminContext | ReturnType<typeof apiUnauthorized>
): result is ReturnType<typeof apiUnauthorized> {
  return result instanceof Response;
}
