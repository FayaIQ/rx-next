"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, ChevronDown, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { rxApi, type TreatmentPlanDto } from "@/lib/api/rx-client";
import {
  fetchTreatmentPlansOfflineFirst,
  updateTreatmentSessionOffline,
  createTreatmentPlanOffline,
} from "@/lib/data/dental-offline-api";
import {
  TREATMENT_TEMPLATES,
  buildSessionsFromTemplate,
} from "@/lib/treatment/templates";
import {
  TREATMENT_TYPES,
  defaultSessionsForType,
  todayDateKey,
  treatmentTypeLabel,
  type TreatmentTypeId,
} from "@/lib/treatment/constants";
import { cn } from "@/lib/utils";
import { CompleteSessionNoteDialog } from "@/components/treatment/complete-session-note-dialog";

type Props = {
  patientId: number;
  toothFdi: number;
};

export function ToothSessionsPanel({ patientId, toothFdi }: Props) {
  const queryClient = useQueryClient();
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [treatmentType, setTreatmentType] =
    useState<TreatmentTypeId>("root_canal");
  const [totalSessions, setTotalSessions] = useState(3);
  const [selectedTemplate, setSelectedTemplate] = useState(
    TREATMENT_TEMPLATES[0].id
  );
  const [completingSession, setCompletingSession] = useState<{
    id: number;
    title: string;
    subtitle: string;
  } | null>(null);

  const queryKey = ["treatment-plans", patientId, toothFdi];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchTreatmentPlansOfflineFirst(patientId, { toothFdi }),
  });

  const plans = data?.plans ?? [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["treatment-plans", patientId] });
    queryClient.invalidateQueries({ queryKey: ["treatment-sessions-today"] });
    queryClient.invalidateQueries({ queryKey: ["appointments"] });
    queryClient.invalidateQueries({ queryKey: ["doctor-queue"] });
  };

  const createPlanMutation = useMutation({
    mutationFn: () => {
      const template = TREATMENT_TEMPLATES.find((t) => t.id === selectedTemplate);
      const count =
        totalSessions || defaultSessionsForType(treatmentType);
      const sessions = template
        ? buildSessionsFromTemplate(template)
        : Array.from({ length: count }, (_, i) => ({
            sessionNumber: i + 1,
            scheduledDate: i === 0 ? todayDateKey() : null,
            notes: null,
          }));
      return createTreatmentPlanOffline(patientId, {
        toothFdi,
        treatmentType: template?.treatmentType ?? treatmentType,
        totalSessions: template?.totalSessions ?? count,
        sessions,
      });
    },
    onSuccess: () => {
      invalidate();
      setShowNewPlan(false);
      toast.success("تم إنشاء خطة العلاج");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateSessionMutation = useMutation({
    mutationFn: ({
      sessionId,
      body,
    }: {
      sessionId: number;
      body: Record<string, unknown>;
    }) => updateTreatmentSessionOffline(sessionId, body),
    onSuccess: () => {
      invalidate();
      setCompletingSession(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addSessionMutation = useMutation({
    mutationFn: (planId: number) =>
      rxApi.treatment.addSession(planId, { scheduledDate: todayDateKey() }),
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const deletePlanMutation = useMutation({
    mutationFn: (planId: number) => rxApi.treatment.deletePlan(planId),
    onSuccess: () => {
      invalidate();
      toast.success("تم حذف الخطة");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isBusy =
    updateSessionMutation.isPending ||
    addSessionMutation.isPending ||
    createPlanMutation.isPending;

  return (
    <div className="space-y-3 border-t border-rx-border pt-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800">خطة العلاج</h3>
        {!showNewPlan ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-teal-700 hover:text-teal-800"
            onClick={() => {
              setTotalSessions(defaultSessionsForType(treatmentType));
              setShowNewPlan(true);
            }}
          >
            <Plus size={14} />
            خطة جديدة
          </Button>
        ) : null}
      </div>

      {showNewPlan ? (
        <div className="space-y-3 rounded-lg border border-teal-200 bg-teal-50/40 p-3">
          <div className="space-y-1">
            <Label className="text-xs">قالب جاهز</Label>
            <select
              className="h-9 w-full rounded-md border border-rx-border bg-white px-3 text-sm"
              value={selectedTemplate}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedTemplate(id);
                const tpl = TREATMENT_TEMPLATES.find((t) => t.id === id);
                if (tpl) {
                  setTreatmentType(tpl.treatmentType);
                  setTotalSessions(tpl.totalSessions);
                }
              }}
            >
              {TREATMENT_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">نوع العلاج</Label>
              <div className="relative">
                <select
                  className="h-9 w-full appearance-none rounded-md border border-rx-border bg-white px-3 text-sm"
                  value={treatmentType}
                  onChange={(e) => {
                    const t = e.target.value as TreatmentTypeId;
                    setTreatmentType(t);
                    setTotalSessions(defaultSessionsForType(t));
                  }}
                >
                  {TREATMENT_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-rx-muted"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">عدد الجلسات</Label>
              <Input
                type="number"
                min={1}
                max={20}
                className="h-9"
                value={totalSessions}
                onChange={(e) =>
                  setTotalSessions(Math.max(1, Number(e.target.value) || 1))
                }
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => createPlanMutation.mutate()}
              disabled={isBusy}
            >
              إنشاء
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowNewPlan(false)}
            >
              إلغاء
            </Button>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
      ) : plans.length === 0 ? (
        <p className="text-xs text-rx-muted">
          لا توجد خطة لهذا السن. أنشئ خطة مثل علاج جذر (3 جلسات).
        </p>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <PlanBlock
              key={plan.id}
              plan={plan}
              isBusy={isBusy}
              onCompleteSession={(session) =>
                setCompletingSession({
                  id: session.id,
                  title: `جلسة ${session.sessionNumber}`,
                  subtitle: `${treatmentTypeLabel(plan.treatmentType)} — السن ${plan.toothFdi}`,
                })
              }
              onUpdateSession={(sessionId, body) =>
                updateSessionMutation.mutate({ sessionId, body })
              }
              onAddSession={() => addSessionMutation.mutate(plan.id)}
              onDeletePlan={() => deletePlanMutation.mutate(plan.id)}
            />
          ))}
        </div>
      )}

      <CompleteSessionNoteDialog
        open={completingSession !== null}
        title={completingSession?.title ?? ""}
        subtitle={completingSession?.subtitle}
        isPending={updateSessionMutation.isPending}
        onClose={() => setCompletingSession(null)}
        onConfirm={(notes) => {
          if (!completingSession) return;
          updateSessionMutation.mutate({
            sessionId: completingSession.id,
            body: { status: "completed", notes: notes || null },
          });
        }}
      />
    </div>
  );
}

function PlanBlock({
  plan,
  isBusy,
  onCompleteSession,
  onUpdateSession,
  onAddSession,
  onDeletePlan,
}: {
  plan: TreatmentPlanDto;
  isBusy: boolean;
  onCompleteSession: (session: {
    id: number;
    sessionNumber: number;
  }) => void;
  onUpdateSession: (
    sessionId: number,
    body: Record<string, unknown>
  ) => void;
  onAddSession: () => void;
  onDeletePlan: () => void;
}) {
  const sessions = plan.sessions ?? [];
  const completed = sessions.filter((s) => s.status === "completed").length;
  const total = plan.totalSessions ?? sessions.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const label = treatmentTypeLabel(plan.treatmentType);
  const nextSession = sessions.find((s) => s.status !== "completed");

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {completed} من {total} جلسة مكتملة
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-teal-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 w-8 shrink-0 p-0 text-slate-400 hover:text-red-600"
          onClick={onDeletePlan}
          title="حذف الخطة"
        >
          <Trash2 size={15} />
        </Button>
      </div>

      <ol className="space-y-0">
        {sessions.map((session, index) => {
          const done = session.status === "completed";
          const isNext = !done && session.id === nextSession?.id;

          return (
            <li
              key={session.id}
              className={cn(
                "flex gap-3 py-2.5",
                index < sessions.length - 1 && "border-b border-slate-200/80"
              )}
            >
              <div
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  done
                    ? "bg-emerald-600 text-white"
                    : isNext
                      ? "border-2 border-teal-600 text-teal-700"
                      : "border border-slate-300 text-slate-400"
                )}
              >
                {done ? <Check size={14} strokeWidth={3} /> : session.sessionNumber}
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      done ? "text-emerald-700" : "text-slate-700"
                    )}
                  >
                    {done ? "مكتملة" : isNext ? "الجلسة التالية" : "مجدولة"}
                  </span>
                  <input
                    type="date"
                    className="h-7 rounded border border-slate-200 bg-white px-2 text-xs text-slate-600"
                    value={session.scheduledDate ?? ""}
                    onChange={(e) =>
                      onUpdateSession(session.id, {
                        scheduledDate: e.target.value || null,
                      })
                    }
                  />
                </div>
                {done && session.notes?.trim() ? (
                  <p className="text-xs leading-relaxed text-slate-600">
                    {session.notes}
                  </p>
                ) : null}
              </div>

              {!done ? (
                <Button
                  type="button"
                  size="sm"
                  className={cn(
                    "h-8 shrink-0 px-3 text-xs",
                    isNext
                      ? "bg-teal-700 hover:bg-teal-800"
                      : "bg-white text-slate-700"
                  )}
                  variant={isNext ? "default" : "outline"}
                  disabled={isBusy}
                  onClick={() =>
                    onCompleteSession({
                      id: session.id,
                      sessionNumber: session.sessionNumber,
                    })
                  }
                >
                  إتمام
                </Button>
              ) : null}
            </li>
          );
        })}
      </ol>

      {plan.status === "active" ? (
        <button
          type="button"
          className="mt-2 text-xs font-medium text-teal-700 hover:text-teal-900 disabled:opacity-50"
          disabled={isBusy}
          onClick={onAddSession}
        >
          + إضافة جلسة
        </button>
      ) : null}
    </div>
  );
}
