import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isSubscriptionActive } from "@/lib/subscription";
import { validateSession } from "@/lib/auth-credentials";
import { prisma } from "@/lib/prisma";
import { toDbId, fromDbId } from "@/lib/bigint";
import { toOptionalUserId, toUserId } from "@/lib/user-id";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  try {
    const valid = await validateSession(
      toUserId(session.user.id),
      session.user.sessionId
    );
    if (!valid) redirect("/auth/signin?error=session_expired");
  } catch {
    // DB unreachable (e.g. offline refresh) — trust JWT until back online.
  }

  return session;
}

export async function requireSubscription() {
  const session = await requireAuth();

  const { id, type, doctorId } = session.user;
  if (type === "admin") return session;

  try {
    const active = await isSubscriptionActive(
      toUserId(id),
      type,
      toOptionalUserId(doctorId)
    );
    if (!active) redirect("/subscription/expired");
  } catch {
    // Offline — subscription check deferred until connection returns.
  }

  return session;
}

export async function requireSecretaryArea() {
  const session = await requireAuth();

  if (session.user.type !== "secretary") {
    redirect("/auth/login/secretary");
  }

  const user = await prisma.user.findUnique({
    where: { id: toDbId(session.user.id) },
    select: { isConfirmed: true, doctorId: true },
  });

  if (!user?.isConfirmed) {
    redirect("/secretary");
  }

  const doctorId = user.doctorId ? fromDbId(user.doctorId) : null;

  try {
    const active = await isSubscriptionActive(
      toUserId(session.user.id),
      "secretary",
      doctorId
    );
    if (!active) redirect("/subscription/expired");
  } catch {
    // Offline — defer subscription check.
  }

  return session;
}
