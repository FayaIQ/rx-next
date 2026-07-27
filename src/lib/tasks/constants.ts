export const TASK_STATUSES = [
  "todo",
  "in_progress",
  "done",
  "cancelled",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const OPEN_TASK_STATUSES: TaskStatus[] = ["todo", "in_progress"];
