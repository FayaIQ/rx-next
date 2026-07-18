import { validateSession } from "@/lib/auth-credentials";
import { isSubscriptionActive } from "@/lib/subscription";
import { prisma } from "@/lib/prisma";
import { toDbId, fromDbId } from "@/lib/bigint";
import { toOptionalUserId, toUserId } from "@/lib/user-id";
import type { Session } from "next-auth";
import {
  apiForbidden,
  apiSubscriptionExpired,
  apiUnauthorized,
} from "./response";

export async function assertValidSession(session: Session): Promise<Response | null> {
  try {
    if (!session.user?.sessionId) return apiUnauthorized();

    const valid = await validateSession(
      toUserId(session.user.id),
      session.user.sessionId
    );
    if (!valid) return apiUnauthorized();
  } catch {
    // DB unreachable — trust JWT briefly (same as requireAuth pages).
  }
  return null;
}

export async function assertActiveSubscription(
  session: Session
): Promise<Response | null> {
  const { id, type, doctorId } = session.user;
  if (type === "admin") return null;

  try {
    const active = await isSubscriptionActive(
      toUserId(id),
      type,
      toOptionalUserId(doctorId)
    );
    if (!active) return apiSubscriptionExpired();
  } catch {
    // Offline — defer check (matches page layouts).
  }
  return null;
}

export async function resolveSecretaryDoctorId(
  userId: number
): Promise<{ doctorId: number } | Response> {
  const user = await prisma.user.findUnique({
    where: { id: toDbId(userId) },
    select: { isConfirmed: true, doctorId: true },
  });
  if (!user?.isConfirmed || !user.doctorId) return apiForbidden();
  return { doctorId: fromDbId(user.doctorId) };
}
