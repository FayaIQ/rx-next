import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toDbId } from "@/lib/bigint";
import type { ClinicContext } from "@/lib/api/clinic-auth";
import { taskDetailInclude } from "@/lib/tasks/serializer";

export function taskVisibilityWhere(ctx: ClinicContext): Prisma.ClinicTaskWhereInput {
  if (ctx.userType === "doctor") return {};
  const userId = toDbId(ctx.userId);
  return {
    OR: [{ assignedToId: userId }, { createdById: userId }],
  };
}

export async function findAccessibleTask(taskId: number, ctx: ClinicContext) {
  return prisma.clinicTask.findFirst({
    where: {
      id: toDbId(taskId),
      doctorId: toDbId(ctx.doctorId),
      archivedAt: null,
      ...taskVisibilityWhere(ctx),
    },
    include: taskDetailInclude,
  });
}

export async function isClinicMember(userId: number, doctorId: number) {
  const user = await prisma.user.findFirst({
    where: {
      id: toDbId(userId),
      OR: [
        { id: toDbId(doctorId), type: "doctor" },
        {
          doctorId: toDbId(doctorId),
          type: "secretary",
          isConfirmed: true,
        },
      ],
    },
    select: { id: true },
  });
  return Boolean(user);
}

export async function isClinicPatient(patientId: number, doctorId: number) {
  const patient = await prisma.patient.findFirst({
    where: { id: toDbId(patientId), doctorId: toDbId(doctorId) },
    select: { id: true },
  });
  return Boolean(patient);
}
