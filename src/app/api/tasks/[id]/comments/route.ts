import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireClinicApi, isClinicApiError } from "@/lib/api/clinic-auth";
import { apiError, apiNotFound, apiOk, apiServerError } from "@/lib/api/response";
import { toDbId, fromDbId } from "@/lib/bigint";
import { findAccessibleTask } from "@/lib/tasks/access";
import { createTaskCommentSchema } from "@/lib/validations/tasks";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;
  const taskId = Number((await params).id);
  if (!Number.isInteger(taskId) || taskId <= 0) {
    return apiNotFound("المهمة غير موجودة");
  }

  try {
    const task = await findAccessibleTask(taskId, ctx);
    if (!task) return apiNotFound("المهمة غير موجودة");
    const data = createTaskCommentSchema.parse(await request.json());
    const comment = await prisma.clinicTaskComment.create({
      data: {
        taskId: toDbId(taskId),
        authorId: toDbId(ctx.userId),
        body: data.body,
      },
      include: {
        author: { select: { id: true, name: true, type: true } },
      },
    });

    return apiOk(
      {
        comment: {
          id: fromDbId(comment.id),
          body: comment.body,
          createdAt: comment.createdAt.toISOString(),
          author: {
            id: fromDbId(comment.author.id),
            name: comment.author.name,
            type: comment.author.type,
          },
        },
      },
      201
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "التعليق غير صالح");
    }
    return apiServerError("تعذر إضافة التعليق", error);
  }
}
