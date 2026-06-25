import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isSubscriptionActive } from "@/lib/subscription";
import { validateSession } from "@/lib/auth-credentials";
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
