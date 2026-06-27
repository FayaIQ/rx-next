import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { toDbId } from "@/lib/bigint";
import {
  normalizeSecretaryInviteCode,
  SECRETARY_INVITE_CODE_LENGTH,
} from "@/lib/secretary-invite";

const schema = z.object({
  code: z
    .string()
    .min(1, "رمز الدعوة مطلوب")
    .transform(normalizeSecretaryInviteCode)
    .pipe(
      z
        .string()
        .length(
          SECRETARY_INVITE_CODE_LENGTH,
          `رمز الدعوة يجب أن يكون ${SECRETARY_INVITE_CODE_LENGTH} أحرف`
        )
        .regex(/^[A-F0-9]+$/, "رمز الدعوة غير صالح")
    ),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.type !== "secretary") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  if (session.user.isConfirmed) {
    return NextResponse.json({ success: true, alreadyActivated: true });
  }

  try {
    const body = await request.json();
    const { code } = schema.parse(body);

    const dbUser = await prisma.user.findUnique({
      where: { id: toDbId(session.user.id) },
      select: { isConfirmed: true },
    });
    if (dbUser?.isConfirmed) {
      return NextResponse.json({ success: true, alreadyActivated: true });
    }

    const invite = await prisma.secretaryInvite.findUnique({
      where: { code },
    });

    if (!invite) {
      return NextResponse.json({ error: "رمز الدعوة غير صالح" }, { status: 400 });
    }

    if (
      invite.used &&
      invite.secretaryId?.toString() === String(session.user.id)
    ) {
      return NextResponse.json({ success: true, alreadyActivated: true });
    }

    if (invite.used) {
      return NextResponse.json({ error: "رمز الدعوة غير صالح" }, { status: 400 });
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return NextResponse.json({ error: "انتهت صلاحية الرمز" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: toDbId(session.user.id) },
        data: {
          isConfirmed: true,
          doctorId: invite.doctorId,
        },
      }),
      prisma.secretaryInvite.update({
        where: { id: invite.id },
        data: {
          used: true,
          secretaryId: toDbId(session.user.id),
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "خطأ غير متوقع" }, { status: 500 });
  }
}
