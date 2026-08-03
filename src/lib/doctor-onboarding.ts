import "server-only";

import { prisma } from "@/lib/prisma";
import { toDbId } from "@/lib/bigint";

/** Existing doctors are considered configured; new registrations get an explicit false value. */
export async function isDoctorOnboardingComplete(doctorId: number) {
  const settings = await prisma.recipeSettings.findFirst({
    where: { doctorId: toDbId(doctorId) },
    select: { onboardingCompleted: true },
  });

  return settings?.onboardingCompleted ?? true;
}
