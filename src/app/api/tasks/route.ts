import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireClinicApi, isClinicApiError } from "@/lib/api/clinic-auth";
import { apiError, apiOk, apiServerError } from "@/lib/api/response";
import { toDbId, fromDbId } from "@/lib/bigint";
import { createClinicTaskSchema } from "@/lib/validations/tasks";
import { OPEN_TASK_STATUSES, TASK_PRIORITIES, TASK_STATUSES } from "@/lib/tasks/constants";
import { taskListInclude, serializeClinicTask } from "@/lib/tasks/serializer";
import {
  isClinicMember,
  isClinicPatient,
  taskVisibilityWhere,
} from "@/lib/tasks/access";

export async function GET(request: Request) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") ?? "assigned";
  const status = searchParams.get("status") ?? "open";
  const priority = searchParams.get("priority");
  const q = searchParams.get("q")?.trim();
  const userId = toDbId(ctx.userId);

  const scopeWhere: Prisma.ClinicTaskWhereInput =
    scope === "created"
      ? { createdById: userId }
      : scope === "all" && ctx.userType === "doctor"
        ? {}
        : scope === "unassigned" && ctx.userType === "doctor"
          ? { assignedToId: null }
          : { assignedToId: userId };

  const statusWhere: Prisma.ClinicTaskWhereInput =
    status === "all"
      ? {}
      : status === "open"
        ? { status: { in: OPEN_TASK_STATUSES } }
        : TASK_STATUSES.includes(status as (typeof TASK_STATUSES)[number])
          ? { status }
          : { status: { in: OPEN_TASK_STATUSES } };

  const baseWhere: Prisma.ClinicTaskWhereInput = {
    doctorId: toDbId(ctx.doctorId),
    archivedAt: null,
    AND: [taskVisibilityWhere(ctx)],
  };

  const filterParts: Prisma.ClinicTaskWhereInput[] = [
    taskVisibilityWhere(ctx),
    scopeWhere,
    statusWhere,
  ];
  if (
    priority &&
    TASK_PRIORITIES.includes(priority as (typeof TASK_PRIORITIES)[number])
  ) {
    filterParts.push({ priority });
  }
  if (q) {
    filterParts.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { patient: { name: { contains: q, mode: "insensitive" } } },
      ],
    });
  }

  const where: Prisma.ClinicTaskWhereInput = {
    doctorId: toDbId(ctx.doctorId),
    archivedAt: null,
    AND: filterParts,
  };

  try {
    const [tasks, members, todoCount, inProgressCount, overdueCount, doneCount] =
      await Promise.all([
        prisma.clinicTask.findMany({
          where,
          include: taskListInclude,
          orderBy: [
            { dueAt: { sort: "asc", nulls: "last" } },
            { priority: "desc" },
            { updatedAt: "desc" },
          ],
          take: 250,
        }),
        prisma.user.findMany({
          where: {
            OR: [
              { id: toDbId(ctx.doctorId), type: "doctor" },
              {
                doctorId: toDbId(ctx.doctorId),
                type: "secretary",
                isConfirmed: true,
              },
            ],
          },
          select: { id: true, name: true, type: true },
          orderBy: [{ type: "asc" }, { name: "asc" }],
        }),
        prisma.clinicTask.count({ where: { ...baseWhere, ...scopeWhere, status: "todo" } }),
        prisma.clinicTask.count({
          where: { ...baseWhere, ...scopeWhere, status: "in_progress" },
        }),
        prisma.clinicTask.count({
          where: {
            ...baseWhere,
            ...scopeWhere,
            status: { in: OPEN_TASK_STATUSES },
            dueAt: { lt: new Date() },
          },
        }),
        prisma.clinicTask.count({ where: { ...baseWhere, ...scopeWhere, status: "done" } }),
      ]);

    const priorityWeight = { low: 0, normal: 1, high: 2, urgent: 3 } as const;
    tasks.sort((a, b) => {
      const dueA = a.dueAt?.getTime() ?? Number.POSITIVE_INFINITY;
      const dueB = b.dueAt?.getTime() ?? Number.POSITIVE_INFINITY;
      if (dueA !== dueB) return dueA - dueB;
      const weightA = priorityWeight[a.priority as keyof typeof priorityWeight] ?? 0;
      const weightB = priorityWeight[b.priority as keyof typeof priorityWeight] ?? 0;
      if (weightA !== weightB) return weightB - weightA;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });

    return apiOk({
      tasks: tasks.map(serializeClinicTask),
      members: members.map((member) => ({
        id: fromDbId(member.id),
        name: member.name,
        type: member.type,
      })),
      summary: { todo: todoCount, inProgress: inProgressCount, overdue: overdueCount, done: doneCount },
      viewer: { id: ctx.userId, type: ctx.userType },
    });
  } catch (error) {
    return apiServerError("تعذر تحميل المهام", error);
  }
}

export async function POST(request: Request) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;

  try {
    const data = createClinicTaskSchema.parse(await request.json());

    if (
      data.assignedToId &&
      !(await isClinicMember(data.assignedToId, ctx.doctorId))
    ) {
      return apiError("المستخدم المحدد ليس ضمن فريق العيادة");
    }
    if (data.patientId && !(await isClinicPatient(data.patientId, ctx.doctorId))) {
      return apiError("المريض غير موجود ضمن العيادة");
    }

    const task = await prisma.$transaction(async (tx) => {
      const created = await tx.clinicTask.create({
        data: {
          doctorId: toDbId(ctx.doctorId),
          createdById: toDbId(ctx.userId),
          assignedToId: data.assignedToId ? toDbId(data.assignedToId) : null,
          patientId: data.patientId ? toDbId(data.patientId) : null,
          title: data.title,
          description: data.description || null,
          priority: data.priority,
          dueAt: data.dueAt ? new Date(data.dueAt) : null,
        },
        include: taskListInclude,
      });
      await tx.clinicTaskActivity.create({
        data: {
          taskId: created.id,
          actorId: toDbId(ctx.userId),
          action: "created",
        },
      });
      return created;
    });

    return apiOk({ task: serializeClinicTask(task) }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "بيانات المهمة غير صالحة");
    }
    return apiServerError("تعذر إنشاء المهمة", error);
  }
}
