import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireClinicApi, isClinicApiError } from "@/lib/api/clinic-auth";
import { apiError, apiNotFound, apiOk, apiServerError } from "@/lib/api/response";
import { toDbId } from "@/lib/bigint";
import { updateClinicTaskSchema } from "@/lib/validations/tasks";
import {
  findAccessibleTask,
  isClinicMember,
  isClinicPatient,
} from "@/lib/tasks/access";
import {
  serializeClinicTask,
  serializeClinicTaskDetail,
  taskListInclude,
} from "@/lib/tasks/serializer";

type Params = { params: Promise<{ id: string }> };

function parseTaskId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(_request: Request, { params }: Params) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;
  const taskId = parseTaskId((await params).id);
  if (!taskId) return apiNotFound("المهمة غير موجودة");

  const task = await findAccessibleTask(taskId, ctx);
  if (!task) return apiNotFound("المهمة غير موجودة");
  return apiOk({ task: serializeClinicTaskDetail(task) });
}

export async function PATCH(request: Request, { params }: Params) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;
  const taskId = parseTaskId((await params).id);
  if (!taskId) return apiNotFound("المهمة غير موجودة");

  try {
    const existing = await findAccessibleTask(taskId, ctx);
    if (!existing) return apiNotFound("المهمة غير موجودة");
    const data = updateClinicTaskSchema.parse(await request.json());

    if (
      data.assignedToId &&
      !(await isClinicMember(data.assignedToId, ctx.doctorId))
    ) {
      return apiError("المستخدم المحدد ليس ضمن فريق العيادة");
    }
    if (data.patientId && !(await isClinicPatient(data.patientId, ctx.doctorId))) {
      return apiError("المريض غير موجود ضمن العيادة");
    }

    const changes: Array<{ action: string; fromValue: string | null; toValue: string | null }> = [];
    const track = (action: string, fromValue: unknown, toValue: unknown) => {
      const from = fromValue == null ? null : String(fromValue);
      const to = toValue == null ? null : String(toValue);
      if (from !== to) changes.push({ action, fromValue: from, toValue: to });
    };
    if (data.status !== undefined) track("status_changed", existing.status, data.status);
    if (data.priority !== undefined) track("priority_changed", existing.priority, data.priority);
    if (data.assignedToId !== undefined) {
      track("assignee_changed", existing.assignedToId?.toString() ?? null, data.assignedToId);
    }
    if (data.dueAt !== undefined) {
      track("due_changed", existing.dueAt?.toISOString() ?? null, data.dueAt);
    }
    if (data.patientId !== undefined) {
      track("patient_changed", existing.patientId?.toString() ?? null, data.patientId);
    }
    if (data.title !== undefined && data.title !== existing.title) {
      changes.push({ action: "details_updated", fromValue: null, toValue: null });
    } else if (
      data.description !== undefined &&
      (data.description || null) !== existing.description
    ) {
      changes.push({ action: "details_updated", fromValue: null, toValue: null });
    }

    const task = await prisma.$transaction(async (tx) => {
      const updated = await tx.clinicTask.update({
        where: { id: toDbId(taskId) },
        data: {
          ...(data.title !== undefined ? { title: data.title } : {}),
          ...(data.description !== undefined
            ? { description: data.description || null }
            : {}),
          ...(data.assignedToId !== undefined
            ? { assignedToId: data.assignedToId ? toDbId(data.assignedToId) : null }
            : {}),
          ...(data.patientId !== undefined
            ? { patientId: data.patientId ? toDbId(data.patientId) : null }
            : {}),
          ...(data.priority !== undefined ? { priority: data.priority } : {}),
          ...(data.status !== undefined
            ? {
                status: data.status,
                completedAt: data.status === "done" ? new Date() : null,
              }
            : {}),
          ...(data.dueAt !== undefined
            ? { dueAt: data.dueAt ? new Date(data.dueAt) : null }
            : {}),
        },
        include: taskListInclude,
      });
      if (changes.length > 0) {
        await tx.clinicTaskActivity.createMany({
          data: changes.map((change) => ({
            taskId: updated.id,
            actorId: toDbId(ctx.userId),
            ...change,
          })),
        });
      }
      return updated;
    });

    return apiOk({ task: serializeClinicTask(task) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "بيانات المهمة غير صالحة");
    }
    return apiServerError("تعذر تحديث المهمة", error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;
  const taskId = parseTaskId((await params).id);
  if (!taskId) return apiNotFound("المهمة غير موجودة");

  const existing = await findAccessibleTask(taskId, ctx);
  if (!existing) return apiNotFound("المهمة غير موجودة");
  if (ctx.userType !== "doctor" && Number(existing.createdById) !== ctx.userId) {
    return apiError("يمكن أرشفة المهمة بواسطة منشئها أو الطبيب فقط", 403);
  }

  try {
    await prisma.$transaction([
      prisma.clinicTaskActivity.create({
        data: {
          taskId: toDbId(taskId),
          actorId: toDbId(ctx.userId),
          action: "archived",
        },
      }),
      prisma.clinicTask.update({
        where: { id: toDbId(taskId) },
        data: { archivedAt: new Date() },
      }),
    ]);
    return apiOk({ success: true });
  } catch (error) {
    return apiServerError("تعذر أرشفة المهمة", error);
  }
}
