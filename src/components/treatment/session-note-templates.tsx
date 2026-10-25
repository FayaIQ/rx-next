"use client";

import { useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLocale } from "@/i18n/locale-provider";
import { useClinicFeatureEnabled } from "@/components/clinic/clinic-features-provider";
import { rxApi, type SessionNoteTemplateDto, type SessionNoteTemplateInput } from "@/lib/api/rx-client";
import { appendSessionTemplate } from "@/lib/treatment/session-note-template";
import { TREATMENT_TYPES } from "@/lib/treatment/constants";
import { tTreatmentType } from "@/lib/i18n-labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const queryKey = ["session-note-templates"];
const blank = { name: "", treatmentType: null, notes: "" } satisfies SessionNoteTemplateInput;

export function SessionNoteTemplates({ notes, onChange, treatmentType, disabled }: { notes: string; onChange: (notes: string) => void; treatmentType?: string; disabled?: boolean }) {
  const { t } = useLocale();
  const enabled = useClinicFeatureEnabled("treatment");
  const id = useId();
  const client = useQueryClient();
  const [selected, setSelected] = useState("");
  const [manage, setManage] = useState(false);
  const [editing, setEditing] = useState<number>();
  const [draft, setDraft] = useState<SessionNoteTemplateInput>(blank);
  const query = useQuery({ queryKey, queryFn: rxApi.treatmentTemplates.list, enabled });
  const templates = query.data?.templates ?? [];
  const visible = templates.filter((row) => !treatmentType || !row.treatmentType || row.treatmentType === treatmentType);
  const save = useMutation({
    mutationFn: () => rxApi.treatmentTemplates.save(draft, editing),
    onSuccess: () => { void client.invalidateQueries({ queryKey }); setDraft(blank); setEditing(undefined); toast.success(t("sessionTemplates.saved")); },
    onError: (error: Error) => toast.error(error.message),
  });
  const remove = useMutation({
    mutationFn: rxApi.treatmentTemplates.delete,
    onSuccess: (_, deletedId) => { void client.invalidateQueries({ queryKey }); if (selected === String(deletedId)) setSelected(""); if (editing === deletedId) { setEditing(undefined); setDraft(blank); } toast.success(t("sessionTemplates.deleted")); },
    onError: (error: Error) => toast.error(error.message),
  });
  const busy = disabled || save.isPending || remove.isPending;
  function edit(row?: SessionNoteTemplateDto) {
    setEditing(row?.id);
    setDraft(row ? { name: row.name, treatmentType: row.treatmentType, notes: row.notes } : blank);
  }
  if (!enabled) return null;
  return <div className="space-y-2 rounded-lg border border-rx-border p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Label htmlFor={`${id}-choose`}>{t("sessionTemplates.title")}</Label>
      <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => setManage(!manage)}>{t(manage ? "sessionTemplates.close" : "sessionTemplates.manage")}</Button>
    </div>
    {query.isError ? <p role="alert" className="text-sm text-red-700">{t("sessionTemplates.loadFailed")} <Button type="button" size="sm" variant="ghost" onClick={() => void query.refetch()}>{t("medicalSummary.retry")}</Button></p> : query.isPending ? <p className="text-xs text-rx-muted">{t("common.loading")}</p> : <>
      <div className="flex gap-2">
        <select id={`${id}-choose`} className="min-w-0 flex-1 rounded-md border bg-white p-2 text-sm" value={selected} disabled={busy} onChange={(e) => setSelected(e.target.value)}>
          <option value="">{t("sessionTemplates.choose")}</option>
          {visible.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
        </select>
        <Button type="button" variant="outline" size="sm" disabled={busy || !visible.some((row) => String(row.id) === selected)} onClick={() => {
          const row = visible.find((row) => String(row.id) === selected);
          if (!row) return;
          try { onChange(appendSessionTemplate(notes, row.notes)); } catch { toast.error(t("sessionTemplates.noteTooLong")); }
        }}>{t("sessionTemplates.apply")}</Button>
      </div>
      <p className="text-xs text-rx-muted">{templates.length ? t("sessionTemplates.reviewHint") : t("sessionTemplates.empty")}</p>
    </>}
    {manage && <div className="space-y-3 border-t pt-3">
      <div className="max-h-40 space-y-1 overflow-y-auto">
        {templates.map((row) => <div key={row.id} className="flex items-center justify-between gap-2 rounded-md bg-rx-bg-subtle/50 px-2 py-1">
          <span className="min-w-0 break-words text-sm">{row.name}</span>
          <div className="flex shrink-0 gap-1">
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => edit(row)} aria-label={`${t("sessionTemplates.edit")} ${row.name}`}>{t("sessionTemplates.edit")}</Button>
            <Button type="button" variant="ghost" size="sm" className="text-red-700" disabled={busy} onClick={() => { if (window.confirm(t("sessionTemplates.deleteConfirm"))) remove.mutate(row.id); }} aria-label={`${t("sessionTemplates.delete")} ${row.name}`}>{t("sessionTemplates.delete")}</Button>
          </div>
        </div>)}
      </div>
      <div className="flex items-center justify-between"><p className="text-sm font-semibold">{t(editing ? "sessionTemplates.edit" : "sessionTemplates.new")}</p>{editing && <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => edit()}>{t("sessionTemplates.cancel")}</Button>}</div>
      <div className="space-y-1"><Label htmlFor={`${id}-name`}>{t("sessionTemplates.name")}</Label><Input id={`${id}-name`} value={draft.name} maxLength={120} disabled={busy} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
      <div className="space-y-1"><Label htmlFor={`${id}-type`}>{t("sessionTemplates.type")}</Label><select id={`${id}-type`} className="w-full rounded-md border bg-white p-2 text-sm" value={draft.treatmentType ?? ""} disabled={busy} onChange={(e) => setDraft({ ...draft, treatmentType: e.target.value || null })}><option value="">{t("sessionTemplates.allTypes")}</option>{TREATMENT_TYPES.map((type) => <option key={type.id} value={type.id}>{tTreatmentType(t, type.id)}</option>)}</select></div>
      <div className="space-y-1"><Label htmlFor={`${id}-notes`}>{t("sessionTemplates.notes")}</Label><Textarea id={`${id}-notes`} rows={4} maxLength={2000} disabled={busy} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></div>
      <Button type="button" size="sm" disabled={busy || !draft.name.trim() || !draft.notes.trim()} onClick={() => save.mutate()}>{t(save.isPending ? "common.saving" : "sessionTemplates.save")}</Button>
    </div>}
  </div>;
}
