"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronLeft,
  Circle,
  Clock3,
  Edit3,
  Link2,
  ListChecks,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/layout/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageContent } from "@/components/ui/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  rxApi,
  type ClinicMemberDto,
  type ClinicTaskDetailDto,
  type ClinicTaskDto,
} from "@/lib/api/rx-client";
import type { TaskPriority, TaskStatus } from "@/lib/tasks/constants";
import { cn } from "@/lib/utils";
import { useLocale, type Locale } from "@/i18n/locale-provider";

type UserType = "doctor" | "secretary";
type Scope = "assigned" | "created" | "all" | "unassigned";
type StatusFilter = "open" | "all" | TaskStatus;
type PriorityFilter = "all" | TaskPriority;

const STATUS_ORDER: TaskStatus[] = ["todo", "in_progress", "done", "cancelled"];
const PRIORITIES: TaskPriority[] = ["low", "normal", "high", "urgent"];

function localeCode(locale: Locale) {
  return locale === "en" ? "en-GB" : "ar-IQ";
}

function formatDate(value: string, locale: Locale, includeTime = true) {
  const date = new Date(value);
  return date.toLocaleString(localeCode(locale), {
    day: "numeric",
    month: "short",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    numberingSystem: "latn",
  });
}

function toLocalDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function isOverdue(task: ClinicTaskDto) {
  return (
    Boolean(task.dueAt) &&
    new Date(task.dueAt!).getTime() < Date.now() &&
    task.status !== "done" &&
    task.status !== "cancelled"
  );
}

function statusBadgeVariant(status: TaskStatus) {
  if (status === "done") return "success" as const;
  if (status === "cancelled") return "secondary" as const;
  if (status === "in_progress") return "warning" as const;
  return "default" as const;
}

function priorityBadgeVariant(priority: TaskPriority) {
  if (priority === "urgent") return "danger" as const;
  if (priority === "high") return "warning" as const;
  if (priority === "low") return "secondary" as const;
  return "outline" as const;
}

function ModalShell({
  open,
  onClose,
  title,
  subtitle,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose, open]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-dialog-title"
        className={cn(
          "flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-rx-border bg-rx-surface shadow-2xl sm:rounded-3xl",
          wide ? "max-w-4xl" : "max-w-2xl"
        )}
      >
        <header className="flex items-start gap-3 border-b border-rx-border px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id="task-dialog-title" className="text-lg font-bold text-rx-text">
              {title}
            </h2>
            {subtitle ? <p className="mt-0.5 text-xs text-rx-muted">{subtitle}</p> : null}
          </div>
          <Button variant="ghost" size="icon" className="size-8" onClick={onClose}>
            <X size={18} />
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </section>
    </div>
  );
}

function TaskFormModal({
  open,
  onClose,
  members,
  task,
}: {
  open: boolean;
  onClose: () => void;
  members: ClinicMemberDto[];
  task: ClinicTaskDto | null;
}) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [patientQuery, setPatientQuery] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [dueAt, setDueAt] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setAssignedToId(task?.assignedToId ? String(task.assignedToId) : "");
    setPatientId(task?.patientId ? String(task.patientId) : "");
    setPatientQuery(task?.patient?.name ?? "");
    setPriority(task?.priority ?? "normal");
    setDueAt(toLocalDateTime(task?.dueAt ?? null));
  }, [open, task]);

  const patientSearch = useQuery({
    queryKey: ["task-patient-search", patientQuery],
    queryFn: () => rxApi.patients.list({ q: patientQuery || undefined, pageSize: 30 }),
    enabled: open,
    staleTime: 30_000,
  });

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        title,
        description: description || null,
        assignedToId: assignedToId ? Number(assignedToId) : null,
        patientId: patientId ? Number(patientId) : null,
        priority,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
      };
      return task ? rxApi.tasks.update(task.id, body) : rxApi.tasks.create(body);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success(task ? t("tasks.updated") : t("tasks.created"));
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const patients = patientSearch.data?.patients ?? [];
  const selectedPatientMissing =
    task?.patient && !patients.some((patient) => patient.id === task.patient!.id);

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={task ? t("tasks.editTitle") : t("tasks.newTitle")}
      subtitle={t("tasks.formSubtitle")}
    >
      <form
        className="space-y-5 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (title.trim().length < 3) {
            toast.error(t("tasks.titleTooShort"));
            return;
          }
          save.mutate();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="task-title">{t("tasks.taskTitle")}</Label>
          <Input
            id="task-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t("tasks.titlePlaceholder")}
            maxLength={180}
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="task-description">{t("tasks.description")}</Label>
          <Textarea
            id="task-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t("tasks.descriptionPlaceholder")}
            rows={4}
            maxLength={5000}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="task-assignee">{t("tasks.assignee")}</Label>
            <select
              id="task-assignee"
              value={assignedToId}
              onChange={(event) => setAssignedToId(event.target.value)}
              className="h-11 w-full rounded-xl border border-rx-border bg-rx-surface px-3 text-sm text-rx-text shadow-sm focus:border-rx-primary focus:outline-none focus:ring-2 focus:ring-rx-primary/20"
            >
              <option value="">{t("tasks.unassigned")}</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} — {t(`tasks.role_${member.type}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-priority">{t("tasks.priority")}</Label>
            <select
              id="task-priority"
              value={priority}
              onChange={(event) => setPriority(event.target.value as TaskPriority)}
              className="h-11 w-full rounded-xl border border-rx-border bg-rx-surface px-3 text-sm text-rx-text shadow-sm focus:border-rx-primary focus:outline-none focus:ring-2 focus:ring-rx-primary/20"
            >
              {PRIORITIES.map((value) => (
                <option key={value} value={value}>
                  {t(`tasks.priority_${value}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-due">{t("tasks.dueAt")}</Label>
            <Input
              id="task-due"
              type="datetime-local"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-patient-search">{t("tasks.patientOptional")}</Label>
            <Input
              id="task-patient-search"
              value={patientQuery}
              onChange={(event) => setPatientQuery(event.target.value)}
              placeholder={t("tasks.searchPatient")}
            />
            <select
              value={patientId}
              onChange={(event) => setPatientId(event.target.value)}
              className="h-10 w-full rounded-xl border border-rx-border bg-rx-surface px-3 text-sm text-rx-text focus:border-rx-primary focus:outline-none"
            >
              <option value="">{t("tasks.noPatient")}</option>
              {selectedPatientMissing ? (
                <option value={task!.patient!.id}>{task!.patient!.name}</option>
              ) : null}
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-rx-border pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={save.isPending || title.trim().length < 3}>
            {save.isPending ? t("common.saving") : task ? t("common.save") : t("tasks.create")}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

function TaskCard({
  task,
  onOpen,
  onStatus,
}: {
  task: ClinicTaskDto;
  onOpen: () => void;
  onStatus: (status: TaskStatus) => void;
}) {
  const { t, locale } = useLocale();
  const overdue = isOverdue(task);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onOpen();
      }}
      className={cn(
        "group cursor-pointer rounded-2xl border bg-rx-surface p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
        overdue ? "border-red-200 ring-1 ring-red-100" : "border-rx-border"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl",
            task.status === "done"
              ? "bg-emerald-50 text-emerald-600"
              : task.status === "in_progress"
                ? "bg-amber-50 text-amber-600"
                : "bg-cyan-50 text-cyan-700"
          )}
        >
          {task.status === "done" ? (
            <CheckCircle2 size={17} />
          ) : task.status === "in_progress" ? (
            <Clock3 size={17} />
          ) : (
            <Circle size={17} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="line-clamp-2 flex-1 text-sm font-bold leading-6 text-rx-text">
              {task.title}
            </h3>
            <MoreHorizontal
              size={17}
              className="mt-1 shrink-0 text-rx-muted opacity-0 transition-opacity group-hover:opacity-100"
            />
          </div>
          {task.description ? (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-rx-muted">
              {task.description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge variant={priorityBadgeVariant(task.priority)}>
          {t(`tasks.priority_${task.priority}`)}
        </Badge>
        {overdue ? <Badge variant="danger">{t("tasks.overdue")}</Badge> : null}
        {task.patient ? (
          <Badge variant="secondary" className="max-w-full gap-1">
            <Link2 size={11} />
            <span className="truncate">{task.patient.name}</span>
          </Badge>
        ) : null}
      </div>

      <div className="mt-3 flex items-center gap-3 border-t border-rx-border/70 pt-3 text-[11px] text-rx-muted">
        <span className="flex min-w-0 items-center gap-1">
          <UserRound size={12} />
          <span className="truncate">{task.assignee?.name ?? t("tasks.unassigned")}</span>
        </span>
        {task.dueAt ? (
          <span className={cn("flex items-center gap-1", overdue && "font-semibold text-red-600")}>
            <CalendarClock size={12} />
            {formatDate(task.dueAt, locale)}
          </span>
        ) : null}
        {task.commentCount > 0 ? (
          <span className="ms-auto flex items-center gap-1">
            <MessageSquare size={12} />
            {task.commentCount}
          </span>
        ) : null}
      </div>

      {task.status !== "done" && task.status !== "cancelled" ? (
        <div className="mt-3 flex gap-2" onClick={(event) => event.stopPropagation()}>
          {task.status === "todo" ? (
            <Button size="sm" variant="outline" className="flex-1" onClick={() => onStatus("in_progress")}>
              <Clock3 size={13} />
              {t("tasks.start")}
            </Button>
          ) : null}
          <Button size="sm" variant="success" className="flex-1" onClick={() => onStatus("done")}>
            <Check size={13} />
            {t("tasks.complete")}
          </Button>
        </div>
      ) : null}
    </article>
  );
}

function activityText(
  activity: ClinicTaskDetailDto["activities"][number],
  members: ClinicMemberDto[],
  t: ReturnType<typeof useLocale>["t"]
) {
  if (activity.action === "created") return t("tasks.activityCreated");
  if (activity.action === "archived") return t("tasks.activityArchived");
  if (activity.action === "details_updated") return t("tasks.activityDetails");
  if (activity.action === "status_changed") {
    return t("tasks.activityStatus", {
      value: t(`tasks.status_${activity.toValue ?? "todo"}`),
    });
  }
  if (activity.action === "priority_changed") {
    return t("tasks.activityPriority", {
      value: t(`tasks.priority_${activity.toValue ?? "normal"}`),
    });
  }
  if (activity.action === "assignee_changed") {
    const member = members.find((item) => String(item.id) === activity.toValue);
    return t("tasks.activityAssignee", {
      value: member?.name ?? t("tasks.unassigned"),
    });
  }
  if (activity.action === "due_changed") return t("tasks.activityDue");
  if (activity.action === "patient_changed") return t("tasks.activityPatient");
  return t("tasks.activityUpdated");
}

function TaskDetailModal({
  taskId,
  members,
  onClose,
  onEdit,
}: {
  taskId: number | null;
  members: ClinicMemberDto[];
  onClose: () => void;
  onEdit: (task: ClinicTaskDto) => void;
}) {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");

  const detail = useQuery({
    queryKey: ["tasks", "detail", taskId],
    queryFn: () => rxApi.tasks.get(taskId!),
    enabled: taskId != null,
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["tasks"], exact: false }),
      taskId
        ? queryClient.invalidateQueries({ queryKey: ["tasks", "detail", taskId] })
        : Promise.resolve(),
    ]);
  };

  const updateStatus = useMutation({
    mutationFn: (status: TaskStatus) => rxApi.tasks.update(taskId!, { status }),
    onSuccess: async () => {
      await refresh();
      toast.success(t("tasks.statusUpdated"));
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addComment = useMutation({
    mutationFn: () => rxApi.tasks.addComment(taskId!, comment),
    onSuccess: async () => {
      setComment("");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const archive = useMutation({
    mutationFn: () => rxApi.tasks.archive(taskId!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success(t("tasks.archived"));
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const task = detail.data?.task;
  const timeline = useMemo(() => {
    if (!task) return [];
    return [
      ...task.activities.map((item) => ({ ...item, kind: "activity" as const })),
      ...task.comments.map((item) => ({ ...item, kind: "comment" as const })),
    ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [task]);

  return (
    <ModalShell
      open={taskId != null}
      onClose={onClose}
      title={task?.title ?? t("tasks.loadingTask")}
      subtitle={task ? `${t("tasks.createdBy")} ${task.createdBy.name}` : undefined}
      wide
    >
      {detail.isLoading || !task ? (
        <div className="space-y-4 p-6">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      ) : (
        <div className="grid min-h-[30rem] lg:grid-cols-[1fr_22rem]">
          <div className="space-y-5 p-5 lg:border-e lg:border-rx-border">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusBadgeVariant(task.status)}>
                {t(`tasks.status_${task.status}`)}
              </Badge>
              <Badge variant={priorityBadgeVariant(task.priority)}>
                {t(`tasks.priority_${task.priority}`)}
              </Badge>
              {isOverdue(task) ? <Badge variant="danger">{t("tasks.overdue")}</Badge> : null}
            </div>

            {task.description ? (
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-rx-muted">
                  {t("tasks.description")}
                </h3>
                <p className="whitespace-pre-wrap text-sm leading-7 text-rx-text-secondary">
                  {task.description}
                </p>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-rx-border bg-rx-bg-subtle/40 p-3">
                <p className="text-[11px] text-rx-muted">{t("tasks.assignee")}</p>
                <p className="mt-1 text-sm font-semibold text-rx-text">
                  {task.assignee?.name ?? t("tasks.unassigned")}
                </p>
              </div>
              <div className="rounded-2xl border border-rx-border bg-rx-bg-subtle/40 p-3">
                <p className="text-[11px] text-rx-muted">{t("tasks.dueAt")}</p>
                <p className="mt-1 text-sm font-semibold text-rx-text">
                  {task.dueAt ? formatDate(task.dueAt, locale) : t("tasks.noDueDate")}
                </p>
              </div>
            </div>

            {task.patient ? (
              <Link
                href={`/patients/${task.patient.id}/record`}
                className="flex items-center gap-3 rounded-2xl border border-cyan-100 bg-cyan-50/60 p-3 transition-colors hover:bg-cyan-50"
              >
                <div className="flex size-9 items-center justify-center rounded-xl bg-white text-cyan-700 shadow-sm">
                  <UserRound size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-cyan-700">{t("tasks.linkedPatient")}</p>
                  <p className="truncate text-sm font-bold text-cyan-950">{task.patient.name}</p>
                </div>
                <ChevronLeft size={17} className="text-cyan-600" />
              </Link>
            ) : null}

            <div>
              <h3 className="mb-3 text-sm font-bold text-rx-text">{t("tasks.actions")}</h3>
              <div className="flex flex-wrap gap-2">
                {task.status === "todo" ? (
                  <Button
                    variant="outline"
                    onClick={() => updateStatus.mutate("in_progress")}
                    disabled={updateStatus.isPending}
                  >
                    <Clock3 size={15} />
                    {t("tasks.start")}
                  </Button>
                ) : null}
                {task.status !== "done" ? (
                  <Button
                    variant="success"
                    onClick={() => updateStatus.mutate("done")}
                    disabled={updateStatus.isPending}
                  >
                    <Check size={15} />
                    {t("tasks.complete")}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => updateStatus.mutate("todo")}
                    disabled={updateStatus.isPending}
                  >
                    <Circle size={15} />
                    {t("tasks.reopen")}
                  </Button>
                )}
                {task.status !== "cancelled" && task.status !== "done" ? (
                  <Button
                    variant="ghost"
                    onClick={() => updateStatus.mutate("cancelled")}
                    disabled={updateStatus.isPending}
                  >
                    <X size={15} />
                    {t("tasks.cancelTask")}
                  </Button>
                ) : null}
                <Button variant="outline" onClick={() => onEdit(task)}>
                  <Edit3 size={15} />
                  {t("common.edit")}
                </Button>
                <Button
                  variant="ghost"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => {
                    if (confirm(t("tasks.archiveConfirm"))) archive.mutate();
                  }}
                  disabled={archive.isPending}
                >
                  <Trash2 size={15} />
                  {t("tasks.archive")}
                </Button>
              </div>
            </div>
          </div>

          <aside className="flex min-h-[28rem] flex-col bg-rx-bg-subtle/35">
            <div className="border-b border-rx-border px-4 py-3">
              <h3 className="flex items-center gap-2 text-sm font-bold text-rx-text">
                <MessageSquare size={15} />
                {t("tasks.activityAndComments")}
              </h3>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {timeline.length === 0 ? (
                <p className="py-8 text-center text-xs text-rx-muted">{t("tasks.noActivity")}</p>
              ) : (
                timeline.map((item) =>
                  item.kind === "comment" ? (
                    <div key={`comment-${item.id}`} className="rounded-2xl border border-rx-border bg-rx-surface p-3 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-rx-text">{item.author.name}</p>
                        <time className="text-[10px] text-rx-muted">
                          {formatDate(item.createdAt, locale)}
                        </time>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-rx-text-secondary">
                        {item.body}
                      </p>
                    </div>
                  ) : (
                    <div key={`activity-${item.id}`} className="flex gap-2.5 px-1">
                      <div className="mt-1 size-2 shrink-0 rounded-full bg-cyan-500 ring-4 ring-cyan-100" />
                      <div>
                        <p className="text-xs leading-5 text-rx-text-secondary">
                          <strong className="text-rx-text">{item.actor.name}</strong>{" "}
                          {activityText(item, members, t)}
                        </p>
                        <time className="text-[10px] text-rx-muted">
                          {formatDate(item.createdAt, locale)}
                        </time>
                      </div>
                    </div>
                  )
                )
              )}
            </div>
            <form
              className="border-t border-rx-border bg-rx-surface p-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (comment.trim()) addComment.mutate();
              }}
            >
              <div className="flex items-end gap-2">
                <Textarea
                  fieldSize="compact"
                  className="min-h-10 flex-1 resize-none"
                  rows={2}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder={t("tasks.commentPlaceholder")}
                  maxLength={2000}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!comment.trim() || addComment.isPending}
                  aria-label={t("tasks.sendComment")}
                >
                  <Send size={16} />
                </Button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </ModalShell>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof ListChecks;
  tone: "cyan" | "amber" | "red" | "green";
}) {
  const tones = {
    cyan: "bg-cyan-50 text-cyan-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    green: "bg-emerald-50 text-emerald-700",
  };
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn("flex size-10 items-center justify-center rounded-2xl", tones[tone])}>
          <Icon size={19} />
        </div>
        <div>
          <p className="text-xl font-black text-rx-text">{value}</p>
          <p className="text-xs text-rx-muted">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function TasksBoard({ userType }: { userType: UserType }) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<Scope>(userType === "doctor" ? "all" : "assigned");
  const [status, setStatus] = useState<StatusFilter>("open");
  const [priority, setPriority] = useState<PriorityFilter>("all");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ClinicTaskDto | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const tasksQuery = useQuery({
    queryKey: ["tasks", "list", scope, status, priority],
    queryFn: () =>
      rxApi.tasks.list({
        scope,
        status,
        ...(priority !== "all" ? { priority } : {}),
      }),
    refetchInterval: 60_000,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, value }: { id: number; value: TaskStatus }) =>
      rxApi.tasks.update(id, { status: value }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success(t("tasks.statusUpdated"));
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const visibleTasks = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase();
    if (!normalized) return tasksQuery.data?.tasks ?? [];
    return (tasksQuery.data?.tasks ?? []).filter((task) =>
      [task.title, task.description, task.patient?.name, task.assignee?.name]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase().includes(normalized))
    );
  }, [search, tasksQuery.data?.tasks]);

  const grouped = useMemo(
    () =>
      Object.fromEntries(
        STATUS_ORDER.map((value) => [
          value,
          visibleTasks.filter((task) => task.status === value),
        ])
      ) as Record<TaskStatus, ClinicTaskDto[]>,
    [visibleTasks]
  );

  const shownColumns =
    status === "open"
      ? STATUS_ORDER.slice(0, 2)
      : status === "all"
        ? STATUS_ORDER
        : [status];
  const summary = tasksQuery.data?.summary ?? {
    todo: 0,
    inProgress: 0,
    overdue: 0,
    done: 0,
  };
  const members = tasksQuery.data?.members ?? [];

  return (
    <>
      <AppHeader
        title={t("tasks.title")}
        subtitle={t("tasks.subtitle")}
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditingTask(null);
              setFormOpen(true);
            }}
          >
            <Plus size={15} />
            <span className="hidden sm:inline">{t("tasks.newTask")}</span>
          </Button>
        }
      />

      <PageContent wide className="space-y-5 py-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCard label={t("tasks.summaryTodo")} value={summary.todo} icon={ListChecks} tone="cyan" />
          <SummaryCard label={t("tasks.summaryProgress")} value={summary.inProgress} icon={Clock3} tone="amber" />
          <SummaryCard label={t("tasks.summaryOverdue")} value={summary.overdue} icon={AlertCircle} tone="red" />
          <SummaryCard label={t("tasks.summaryDone")} value={summary.done} icon={CheckCircle2} tone="green" />
        </div>

        <div className="rounded-2xl border border-rx-border bg-rx-surface p-3 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="flex min-w-0 gap-1 overflow-x-auto">
              {(userType === "doctor"
                ? (["all", "assigned", "created", "unassigned"] as Scope[])
                : (["assigned", "created"] as Scope[])
              ).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setScope(value)}
                  className={cn(
                    "shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition-colors",
                    scope === value
                      ? "bg-rx-primary text-white shadow-sm"
                      : "text-rx-muted hover:bg-rx-bg-subtle hover:text-rx-text"
                  )}
                >
                  {value === "all" ? <UsersRound size={13} className="me-1 inline" /> : null}
                  {t(`tasks.scope_${value}`)}
                </button>
              ))}
            </div>

            <div className="ms-auto flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-[15rem]">
                <Search
                  size={15}
                  className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-rx-muted"
                />
                <Input
                  fieldSize="compact"
                  className="h-9 ps-9"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("tasks.search")}
                />
              </div>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as StatusFilter)}
                className="h-9 rounded-xl border border-rx-border bg-rx-surface px-3 text-xs text-rx-text focus:outline-none"
              >
                <option value="open">{t("tasks.filterOpen")}</option>
                <option value="all">{t("tasks.filterAll")}</option>
                {STATUS_ORDER.map((value) => (
                  <option key={value} value={value}>
                    {t(`tasks.status_${value}`)}
                  </option>
                ))}
              </select>
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value as PriorityFilter)}
                className="h-9 rounded-xl border border-rx-border bg-rx-surface px-3 text-xs text-rx-text focus:outline-none"
              >
                <option value="all">{t("tasks.allPriorities")}</option>
                {PRIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {t(`tasks.priority_${value}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {tasksQuery.isLoading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {[0, 1].map((column) => (
              <div key={column} className="space-y-3">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-44 w-full rounded-2xl" />
                <Skeleton className="h-36 w-full rounded-2xl" />
              </div>
            ))}
          </div>
        ) : visibleTasks.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title={t("tasks.emptyTitle")}
            description={t("tasks.emptyDescription")}
            action={
              <Button
                onClick={() => {
                  setEditingTask(null);
                  setFormOpen(true);
                }}
              >
                <Plus size={15} />
                {t("tasks.newTask")}
              </Button>
            }
          />
        ) : (
          <div
            className={cn(
              "grid items-start gap-4",
              shownColumns.length >= 3 ? "xl:grid-cols-3" : "lg:grid-cols-2"
            )}
          >
            {shownColumns.map((column) => (
              <section key={column} className="rounded-3xl border border-rx-border bg-rx-bg-subtle/50 p-3">
                <header className="mb-3 flex items-center gap-2 px-1">
                  <span
                    className={cn(
                      "size-2.5 rounded-full",
                      column === "todo"
                        ? "bg-cyan-500"
                        : column === "in_progress"
                          ? "bg-amber-500"
                          : column === "done"
                            ? "bg-emerald-500"
                            : "bg-slate-400"
                    )}
                  />
                  <h2 className="text-sm font-bold text-rx-text">{t(`tasks.status_${column}`)}</h2>
                  <Badge variant="secondary" className="ms-auto">
                    {grouped[column].length}
                  </Badge>
                </header>
                <div className="space-y-3">
                  {grouped[column].length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-rx-border bg-rx-surface/60 py-10 text-center text-xs text-rx-muted">
                      {t("tasks.columnEmpty")}
                    </div>
                  ) : (
                    grouped[column].map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onOpen={() => setSelectedTaskId(task.id)}
                        onStatus={(value) => updateStatus.mutate({ id: task.id, value })}
                      />
                    ))
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </PageContent>

      <TaskFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingTask(null);
        }}
        members={members}
        task={editingTask}
      />
      <TaskDetailModal
        taskId={selectedTaskId}
        members={members}
        onClose={() => setSelectedTaskId(null)}
        onEdit={(task) => {
          setSelectedTaskId(null);
          setEditingTask(task);
          setFormOpen(true);
        }}
      />
    </>
  );
}
