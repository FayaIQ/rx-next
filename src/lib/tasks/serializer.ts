import { Prisma } from "@prisma/client";
import { fromDbId } from "@/lib/bigint";

export const taskListInclude = Prisma.validator<Prisma.ClinicTaskInclude>()({
  assignee: { select: { id: true, name: true, type: true } },
  createdBy: { select: { id: true, name: true, type: true } },
  patient: { select: { id: true, name: true, phone: true } },
  _count: { select: { comments: true } },
});

export const taskDetailInclude = Prisma.validator<Prisma.ClinicTaskInclude>()({
  ...taskListInclude,
  comments: {
    include: { author: { select: { id: true, name: true, type: true } } },
    orderBy: { createdAt: "asc" },
  },
  activities: {
    include: { actor: { select: { id: true, name: true, type: true } } },
    orderBy: { createdAt: "asc" },
  },
});

type TaskListRow = Prisma.ClinicTaskGetPayload<{
  include: typeof taskListInclude;
}>;

type TaskDetailRow = Prisma.ClinicTaskGetPayload<{
  include: typeof taskDetailInclude;
}>;

function serializeMember(member: { id: bigint; name: string; type: string } | null) {
  if (!member) return null;
  return { id: fromDbId(member.id), name: member.name, type: member.type };
}

export function serializeClinicTask(task: TaskListRow) {
  return {
    id: fromDbId(task.id),
    doctorId: fromDbId(task.doctorId),
    patientId: task.patientId ? fromDbId(task.patientId) : null,
    assignedToId: task.assignedToId ? fromDbId(task.assignedToId) : null,
    createdById: fromDbId(task.createdById),
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueAt: task.dueAt?.toISOString() ?? null,
    completedAt: task.completedAt?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    assignee: serializeMember(task.assignee),
    createdBy: serializeMember(task.createdBy),
    patient: task.patient
      ? {
          id: fromDbId(task.patient.id),
          name: task.patient.name,
          phone: task.patient.phone,
        }
      : null,
    commentCount: task._count.comments,
  };
}

export function serializeClinicTaskDetail(task: TaskDetailRow) {
  return {
    ...serializeClinicTask(task),
    comments: task.comments.map((comment) => ({
      id: fromDbId(comment.id),
      body: comment.body,
      createdAt: comment.createdAt.toISOString(),
      author: serializeMember(comment.author),
    })),
    activities: task.activities.map((activity) => ({
      id: fromDbId(activity.id),
      action: activity.action,
      fromValue: activity.fromValue,
      toValue: activity.toValue,
      createdAt: activity.createdAt.toISOString(),
      actor: serializeMember(activity.actor),
    })),
  };
}
