import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { toDbId } from "@/lib/bigint";

const schema = z.object({
  code: z.string().length(16, "رمز الدعوة يجب أن يكون 16 حرفاً"),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.type !== "secretary") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  if (session.user.isConfirmed) {
    return NextResponse.json({ error: "الحساب مفعّل مسبقاً" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { code } = schema.parse(body);

    const invite = await prisma.secretaryInvite.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!invite || invite.used) {
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
