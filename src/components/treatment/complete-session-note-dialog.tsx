"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  open: boolean;
  title: string;
  subtitle?: string;
  isPending?: boolean;
  onClose: () => void;
  onConfirm: (notes: string) => void;
};

export function CompleteSessionNoteDialog({
  open,
  title,
  subtitle,
  isPending,
  onClose,
  onConfirm,
}: Props) {
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) setNotes("");
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
          {subtitle ? (
            <p className="text-sm text-rx-muted">{subtitle}</p>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>ملاحظة (اختياري)</Label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ماذا تم في هذه الجلسة؟"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isPending}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              className="bg-teal-700 hover:bg-teal-800"
              onClick={() => onConfirm(notes.trim())}
              disabled={isPending}
            >
              {isPending ? "جاري الحفظ..." : "تأكيد الإتمام"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
