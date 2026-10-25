"use client";

import { SessionNoteTemplates } from "@/components/treatment/session-note-templates";
import { PatientMedicalSummaryLoader } from "@/components/patients/patient-medical-summary";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { sessionDateTimeInput } from "@/lib/treatment/session-datetime";
import { useLocale } from "@/i18n/locale-provider";

type Props = {
  open: boolean;
  title: string;
  subtitle?: string;
  patientId?: number;
  treatmentType?: string;
  initialNotes?: string | null;
  isPending?: boolean;
  onClose: () => void;
  onConfirm: (notes: string, performedAt: string) => void;
};

export function CompleteSessionNoteDialog({
  open,
  title,
  subtitle,
  patientId,
  treatmentType,
  initialNotes,
  isPending,
  onClose,
  onConfirm,
}: Props) {
  const { t } = useLocale();
  const [notes, setNotes] = useState("");
  const [performedAt, setPerformedAt] = useState("");

  useEffect(() => {
    if (open) {
      setNotes(initialNotes ?? "");
      setPerformedAt(sessionDateTimeInput());
    }
  }, [open, initialNotes]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-xl max-h-[90dvh] overflow-y-auto shadow-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
          {subtitle ? (
            <p className="text-sm text-rx-muted">{subtitle}</p>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {patientId ? <PatientMedicalSummaryLoader patientId={patientId} /> : null}
          <div className="space-y-1.5">
            <Label htmlFor="session-performed-at">{t("treatment.performedAt")}</Label>
            <Input
              id="session-performed-at"
              type="datetime-local"
              value={performedAt}
              onChange={(e) => setPerformedAt(e.target.value)}
              disabled={isPending}
              required
            />
          </div>
          <SessionNoteTemplates notes={notes} onChange={setNotes} treatmentType={treatmentType} disabled={isPending} />
          <div className="space-y-1.5">
            <Label htmlFor="session-completion-notes">{t("treatment.noteOptional")}</Label>
            <Textarea
              id="session-completion-notes"
              maxLength={2000}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("treatment.notePlaceholder")}
              autoFocus
              disabled={isPending}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              className="bg-teal-700 hover:bg-teal-800"
              onClick={() => {
                const date = new Date(performedAt);
                if (!Number.isNaN(date.getTime())) onConfirm(notes.trim(), date.toISOString());
              }}
              disabled={isPending || !performedAt || Number.isNaN(new Date(performedAt).getTime())}
            >
              {isPending ? t("common.saving") : t("treatment.confirmComplete")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
