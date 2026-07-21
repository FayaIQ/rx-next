"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useLocale } from "@/i18n/locale-provider";
import { CalendarClock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompleteSessionNoteDialog } from "@/components/treatment/complete-session-note-dialog";
import { rxApi, type TodayTreatmentSessionDto } from "@/lib/api/rx-client";
import { todayDateKey } from "@/lib/treatment/constants";

type Props = {
  onSelectPatient?: (patientId: number) => void;
};

export function TodayTreatmentSessionsPanel({ onSelectPatient }: Props) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const day = todayDateKey();
  const [completingSession, setCompletingSession] =
    useState<TodayTreatmentSessionDto | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["treatment-sessions-today", day],
    queryFn: () => rxApi.treatment.todaySessions(day),
    refetchInterval: 60_000,
  });

  const sessions = data?.sessions ?? [];

  const completeMutation = useMutation({
    mutationFn: ({
      sessionId,
      notes,
    }: {
      sessionId: number;
      notes: string | null;
    }) =>
      rxApi.treatment.updateSession(sessionId, {
        status: "completed",
        notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["treatment-sessions-today"],
      });
      queryClient.invalidateQueries({ queryKey: ["treatment-plans"] });
      setCompletingSession(null);
      toast.success(t("treatment.completed"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || sessions.length === 0) return null;

  return (
    <>
      <div className="mb-3 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
          <CalendarClock size={15} className="text-teal-700" />
          <span className="text-sm font-semibold text-slate-800">
            {t("treatment.todaySessions")}
          </span>
          <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-bold text-teal-800">
            {sessions.length}
          </span>
        </div>

        <ul className="divide-y divide-slate-100">
          {sessions.map((session) => (
            <li
              key={session.id}
              className="flex items-center gap-2 px-3 py-2.5"
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-right"
                onClick={() => onSelectPatient?.(session.patientId)}
              >
                <p className="truncate text-sm font-semibold text-slate-900">
                  {session.patientName}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {session.treatmentLabel} · {t("treatment.tooth")} {session.toothFdi} · {t("treatment.session")}{" "}
                  {session.sessionNumber}
                  {session.totalSessions ? `/${session.totalSessions}` : ""}
                </p>
              </button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 w-8 shrink-0 p-0 text-slate-500"
                asChild
                title={t("treatment.openChart")}
              >
                <Link
                  href={`/dental/${session.patientId}?tooth=${session.toothFdi}`}
                >
                  <ExternalLink size={14} />
                </Link>
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 shrink-0 bg-teal-700 px-3 text-xs hover:bg-teal-800"
                disabled={completeMutation.isPending}
                onClick={() => setCompletingSession(session)}
              >
                {t("treatment.complete")}
              </Button>
            </li>
          ))}
        </ul>
      </div>

      <CompleteSessionNoteDialog
        open={completingSession !== null}
        title={
          completingSession
            ? t("treatment.completeSession", { name: completingSession.patientName })
            : ""
        }
        subtitle={
          completingSession
            ? `${completingSession.treatmentLabel} · ${t("treatment.tooth")} ${completingSession.toothFdi} · ${t("treatment.session")} ${completingSession.sessionNumber}${completingSession.totalSessions ? `/${completingSession.totalSessions}` : ""}`
            : undefined
        }
        isPending={completeMutation.isPending}
        onClose={() => setCompletingSession(null)}
        onConfirm={(notes) => {
          if (!completingSession) return;
          completeMutation.mutate({
            sessionId: completingSession.id,
            notes: notes || null,
          });
        }}
      />
    </>
  );
}
