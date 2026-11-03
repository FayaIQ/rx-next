"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { sessionDateTimeInput } from "@/lib/treatment/session-datetime";
import { todayDateKey } from "@/lib/treatment/constants";
import { useLocale } from "@/i18n/locale-provider";
import { useSyncStore } from "@/stores/sync-store";
import { billingRequest } from "@/components/finances/session-billing";
import { formatMoney } from "@/lib/finance/constants";
import type { SessionBilling } from "@/lib/finance/session-balance";
import type { SessionBillingInput } from "@/lib/validations/session-billing";

type Props = {
  open: boolean;
  sessionId?: number;
  title: string;
  subtitle?: string;
  isPending?: boolean;
  onClose: () => void;
  onConfirm: (notes: string, performedAt: string, billing?: SessionBillingInput) => void;
};

export function CompleteSessionNoteDialog(props: Props) {
  const { t } = useLocale();
  const online = useSyncStore(state => state.online);
  const query = useQuery({
    queryKey: ["session-billing", props.sessionId],
    queryFn: () => billingRequest<{ billing: SessionBilling }>(`/api/treatment-sessions/${props.sessionId}/billing`),
    enabled: props.open && !!props.sessionId && online,
    networkMode: "always", retry: false,
  });
  if (!props.open) return null;
  return <div role="dialog" aria-modal="true" aria-label={props.title} className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
    <Card className="max-h-[90dvh] w-full max-w-lg overflow-y-auto shadow-xl">
      <CardHeader className="pb-2"><CardTitle className="text-base">{props.title}</CardTitle>{props.subtitle && <p className="text-sm text-rx-muted">{props.subtitle}</p>}</CardHeader>
      <CardContent>
        {online && props.sessionId && (!query.data || query.isFetching) ? <div className="space-y-3"><p role={query.isError ? "alert" : undefined}>{query.isError ? t("billing.loadError") : t("billing.loading")}</p>{query.isError && <Button onClick={() => query.refetch()}>{t("billing.retry")}</Button>}<Button variant="outline" onClick={props.onClose}>{t("common.cancel")}</Button></div> : <CompleteSessionForm key={`${props.sessionId}-${online}`} {...props} financial={online && !!props.sessionId} initialBilling={query.data?.billing} />}
      </CardContent>
    </Card>
  </div>;
}

function CompleteSessionForm({ onConfirm, onClose, isPending, financial, initialBilling }: Props & { financial: boolean; initialBilling?: SessionBilling }) {
  const { t, locale } = useLocale();
  const [notes, setNotes] = useState("");
  const [performedAt, setPerformedAt] = useState(sessionDateTimeInput);
  const [fee, setFee] = useState(initialBilling?.fee == null ? "" : String(initialBilling.fee));
  const [currency, setCurrency] = useState(initialBilling?.currency ?? "IQD");
  const [mode, setMode] = useState("full");
  const [partial, setPartial] = useState("");
  const [method, setMethod] = useState<"cash" | "card" | "transfer">("cash");
  const [paymentDate, setPaymentDate] = useState(todayDateKey);
  const [requestId] = useState(() => crypto.randomUUID());
  const paid = initialBilling?.paid ?? 0;
  const remaining = Math.round((Number(fee || 0) - paid) * 100) / 100;
  const amount = mode === "full" ? remaining : mode === "debt" ? 0 : Number(partial || 0);
  const date = new Date(performedAt);
  const invalid = Number.isNaN(date.getTime()) || (financial && (fee === "" || remaining < 0 || amount < 0 || amount > remaining || (mode === "partial" && !partial)));
  return <form className="space-y-4" onSubmit={event => {
    event.preventDefault();
    if (invalid) return;
    onConfirm(notes.trim(), date.toISOString(), financial ? { fee: Number(fee), currency: currency as "IQD" | "USD", amount, requestId, paymentMethod: method, transactionDate: paymentDate } : undefined);
  }}>
    <div className="space-y-1.5"><Label htmlFor="session-performed-at">{t("treatment.performedAt")}</Label><Input id="session-performed-at" type="datetime-local" value={performedAt} onChange={e => setPerformedAt(e.target.value)} disabled={isPending} required /></div>
    {financial ? <fieldset disabled={isPending} className="space-y-3 rounded-xl border border-rx-border bg-slate-50 p-3">
      <legend className="px-1 text-sm font-semibold">{t("billing.sessionAccount")}</legend>
      <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label htmlFor="complete-fee">{t("billing.fee")}</Label><Input id="complete-fee" type="number" min={paid} max="9999999999.99" step={currency === "USD" ? "0.01" : "1"} value={fee} onChange={e => setFee(e.target.value)} required /></div><div className="space-y-1"><Label htmlFor="complete-currency">{t("finances.currency")}</Label><select id="complete-currency" className="h-10 w-full rounded-lg border border-rx-border bg-white px-2" disabled={paid > 0} value={currency} onChange={e => setCurrency(e.target.value)}><option value="IQD">IQD</option><option value="USD">USD</option></select></div></div>
      {paid > 0 && <p className="text-xs">{t("billing.alreadyPaid")}: {formatMoney(paid, currency, locale)}</p>}
      <div className="space-y-1"><Label htmlFor="complete-payment-mode">{t("billing.paymentState")}</Label><select id="complete-payment-mode" className="h-10 w-full rounded-lg border border-rx-border bg-white px-2 text-sm" value={mode} onChange={e => setMode(e.target.value)}><option value="full">{t("billing.receiveFull")}</option><option value="partial">{t("billing.receivePartial")}</option><option value="debt">{t("billing.receiveNone")}</option></select></div>
      {mode === "partial" && <div className="space-y-1"><Label htmlFor="complete-partial">{t("billing.newPayment")}</Label><Input id="complete-partial" type="number" min="0" max={Math.max(0, remaining)} step={currency === "USD" ? "0.01" : "1"} value={partial} onChange={e => setPartial(e.target.value)} required /></div>}
      {amount > 0 && <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label htmlFor="complete-method">{t("finances.paymentMethod")}</Label><select id="complete-method" className="h-10 w-full rounded-lg border border-rx-border bg-white px-2 text-sm" value={method} onChange={e => setMethod(e.target.value as typeof method)}>{["cash", "card", "transfer"].map(m => <option key={m} value={m}>{t(`finances.methods.${m}`)}</option>)}</select></div><div className="space-y-1"><Label htmlFor="complete-payment-date">{t("billing.receivedDate")}</Label><Input id="complete-payment-date" type="date" required value={paymentDate} onChange={e => setPaymentDate(e.target.value)} /></div></div>}
      <p className="text-sm text-emerald-800">{t("billing.incomeNow")}: {formatMoney(Math.max(0, amount), currency, locale)}</p><p className="text-sm font-semibold text-amber-900">{t("billing.remainingAfter")}: {formatMoney(Math.max(0, remaining - amount), currency, locale)}</p>
    </fieldset> : <p className="text-xs text-amber-900">{t("billing.offlineCompletion")}</p>}
    <div className="space-y-1.5"><Label htmlFor="complete-notes">{t("treatment.noteOptional")}</Label><Textarea id="complete-notes" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder={t("treatment.notePlaceholder")} disabled={isPending} /></div>
    <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>{t("common.cancel")}</Button><Button type="submit" className="bg-teal-700 hover:bg-teal-800" disabled={isPending || invalid}>{isPending ? t("common.saving") : t("treatment.confirmComplete")}</Button></div>
  </form>;
}
