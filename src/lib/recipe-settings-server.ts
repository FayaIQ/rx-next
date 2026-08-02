import "server-only";
import { prisma } from "@/lib/prisma";
import { toDbId } from "@/lib/bigint";
import { defaultRecipeSettingsForDoctor } from "@/lib/recipe-settings";

export async function ensureRecipeSettings(doctorId: number) {
  const doctorDbId = toDbId(doctorId);
  const existing = await prisma.recipeSettings.findFirst({
    where: { doctorId: doctorDbId },
  });
  if (existing) return existing;

  const user = await prisma.user.findUnique({
    where: { id: doctorDbId },
    select: { name: true, phoneNumber: true },
  });
  const defaults = defaultRecipeSettingsForDoctor(doctorId, user ?? undefined);
  const { id: _id, doctorId: _doctorId, ...data } = defaults;

  return prisma.recipeSettings.create({
    data: { ...data, doctorId: doctorDbId },
  });
}
