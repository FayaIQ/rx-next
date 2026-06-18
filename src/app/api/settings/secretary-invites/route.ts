import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireDoctorApi, isApiError } from "@/lib/api/doctor-auth";
import { apiOk } from "@/lib/api/response";
import { toDbId, fromDbId } from "@/lib/bigint";

function serializeInvite(invite: {
  id: bigint;
  code: string;
  used: boolean;
  expiresAt: Date | null;
  createdAt: Date | null;
}) {
  return {
    id: fromDbId(invite.id),
    code: invite.code,
    used: invite.used,
    expiresAt: invite.expiresAt?.toISOString() ?? null,
    createdAt: invite.createdAt?.toISOString() ?? null,
  };
}

export async function GET() {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const invites = await prisma.secretaryInvite.findMany({
    where: { doctorId: toDbId(ctx.doctorId) },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return apiOk({ invites: invites.map(serializeInvite) });
}

export async function POST() {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const code = randomBytes(4).toString("hex").toUpperCase();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invite = await prisma.secretaryInvite.create({
    data: {
      code,
      doctorId: toDbId(ctx.doctorId),
      expiresAt,
    },
  });

  return apiOk({ invite: serializeInvite(invite) }, 201);
}
