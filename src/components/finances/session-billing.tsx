"use client";

import { useSyncStore } from "@/stores/sync-store";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/i18n/locale-provider";
import { formatMoney } from "@/lib/finance/constants";
import type { SessionBilling, AccountTotal } from "@/lib/finance/session-balance";
import type { FinanceTransactionDto } from "@/lib/api/rx-client";
import { todayDateKey } from "@/lib/treatment/constants";

export async function billingRequest<T>(url: string, init?: RequestInit): Promise<T> {
  if (typeof navigator !== "undefined" && !navigator.onLine) throw new Error("يتطلب تسجيل الدفعات ومراجعة الرصيد اتصالاً بالإنترنت");
  const response = await fetch(url, { cache: "no-store", ...init });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "تعذر تحميل الحساب");
  return data;
}

export function useInvalidateBilling() {
  const client = useQueryClient();
  return () => {
    for (const key of ["plan-billing", "session-billing", "patient-account", "finance-debts", "finance-summary", "finance-transactions", "patient-file", "queue-summary", "patients", "treatment-plans", "treatment-sessions-today", "treatment-sessions-week", "appointments", "doctor-queue", "waiting-room", "secretary-desk", "reports", "patient-portal"]) {
      void client.invalidateQueries({ queryKey: [key] });
    }
  };
}

export function DebtBadge({ totals }: { totals?: AccountTotal[] }) {
  const { t, locale } = useLocale();
  const online = useSyncStore(state => state.online);
  const debts = totals?.filter(row => row.remaining > 0) ?? [];
  if (!debts.length) return null;
  return <span className="inline-flex flex-wrap gap-1 rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900">
    {t("billing.patientDebt")}: {debts.map(row => formatMoney(row.remaining, row.currency, locale)).join(" · ")} {!online && `· ${t("billing.cached")}`}
  </span>;
}

export function BillingStatus({ billing }: { billing?: SessionBilling }) {
  const { t, locale } = useLocale();
  if (!billing || billing.status === "unpriced") return <span className="text-xs text-rx-muted">{t("billing.unpriced")}</span>;
  return <span className={`text-xs ${billing.remaining > 0 ? "text-amber-800" : "text-emerald-700"}`}>
    {t(`billing.${billing.status}`)} · {t(billing.scope === "plan" ? "billing.planFee" : "billing.fee")}: {formatMoney(billing.fee ?? 0, billing.currency, locale)} · {t("billing.paidAmount")}: {formatMoney(billing.paid, billing.currency, locale)} · {t("billing.remaining")}: {formatMoney(billing.remaining, billing.currency, locale)}
  </span>;
}

export function SessionBillingButton({ sessionId, planId, billing }: { sessionId?: number; planId?: number; billing?: SessionBilling }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  return <div className="flex flex-wrap items-center gap-2">
    <BillingStatus billing={billing} />
    <Button type="button" variant="outline" size="sm" className="h-7 text-xs" disabled={(planId ?? sessionId ?? 0) <= 0} onClick={() => setOpen(true)}>{t(planId || billing?.scope === "plan" ? "billing.planAccount" : "billing.manage")}</Button>
    {open && <SessionBillingDialog sessionId={sessionId ?? planId ?? 0} planId={planId} onClose={() => setOpen(false)} />}
  </div>;
}

type BillResponse = { billing: SessionBilling; payments: FinanceTransactionDto[] };

function SessionBillingDialog({ sessionId, planId, onClose }: { sessionId: number; planId?: number; onClose: () => void }) {
  const { t } = useLocale();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  const accountUrl = planId ? `/api/treatment-plans/${planId}/billing` : `/api/treatment-sessions/${sessionId}/billing`;
  const query = useQuery({ queryKey: [planId ? "plan-billing" : "session-billing", planId ?? sessionId], networkMode: "always", retry: false, queryFn: () => billingRequest<BillResponse>(accountUrl) });
  return <dialog ref={dialog} aria-labelledby={`billing-title-${sessionId}`} onCancel={event => event.preventDefault()} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl bg-white p-5 text-rx-text shadow-xl backdrop:bg-black/40">
      <h3 id={`billing-title-${sessionId}`} className="mb-4 text-lg font-bold">{t(planId || query.data?.billing.scope === "plan" ? "billing.planAccount" : "billing.sessionAccount")}</h3>
      {query.isPending || query.isFetching ? <p>{t("common.loading")}</p> : query.isError ? <div role="alert"><p>{query.error.message}</p><Button onClick={() => query.refetch()}>{t("billing.retry")}</Button></div> : <BillingForm accountUrl={accountUrl} sessionId={sessionId} data={query.data} onClose={onClose} />}
      {!query.data && <Button variant="outline" className="mt-3" onClick={onClose}>{t("common.close")}</Button>}
  </dialog>;
}

function BillingForm({ sessionId, accountUrl, data, onClose }: { sessionId: number; accountUrl: string; data: BillResponse; onClose: () => void }) {
  const { t, locale } = useLocale();
  const invalidate = useInvalidateBilling();
  const [fee, setFee] = useState(data.billing.fee == null ? "" : String(data.billing.fee));
  const [currency, setCurrency] = useState(data.billing.currency);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayDateKey());
  const [method, setMethod] = useState("cash");
  const [description, setDescription] = useState("");
  const requestId = useRef<string | null>(null);
  const save = useMutation({
    networkMode: "always",
    mutationFn: () => {
      requestId.current ??= crypto.randomUUID();
      return billingRequest(accountUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        fee: fee === "" ? null : Number(fee), currency, amount: amount === "" ? 0 : Number(amount),
        transactionDate: date, paymentMethod: method, description, requestId: requestId.current,
      }) });
    },
    onSuccess: () => { invalidate(); toast.success(t("billing.saved")); onClose(); },
    onError: (error: Error) => toast.error(error.message),
  });
  const remove = useMutation({
    networkMode: "always",
    mutationFn: (id: number) => billingRequest(`/api/finances/transactions/${id}`, { method: "DELETE" }),
    onSuccess: () => { invalidate(); toast.success(t("billing.paymentDeleted")); onClose(); },
    onError: (error: Error) => toast.error(error.message),
  });
  const busy = save.isPending || remove.isPending;
  // Keep the request key on retries; the server rejects changed payloads after a committed payment.
  const locked = busy;
  const remaining = Math.round((Number(fee || 0) - data.billing.paid - Number(amount || 0)) * 100) / 100;
  return <form className="space-y-4" onSubmit={event => { event.preventDefault(); save.mutate(); }}>
    <BillingStatus billing={data.billing} />
    <p className="text-xs leading-relaxed text-rx-muted">{t(data.billing.scope === "plan" ? "billing.planAccountHint" : "billing.hint")}</p>
    <fieldset disabled={locked} className="space-y-3 disabled:opacity-60">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label htmlFor={`fee-${sessionId}`}>{t(data.billing.scope === "plan" ? "billing.planFee" : "billing.fee")}</Label><Input id={`fee-${sessionId}`} type="number" min="0" max="9999999999.99" step={currency === "USD" ? "0.01" : "1"} placeholder={t("billing.unpriced")} value={fee} onChange={e => setFee(e.target.value)} /></div>
        <div className="space-y-1"><Label htmlFor={`currency-${sessionId}`}>{t("finances.currency")}</Label><select id={`currency-${sessionId}`} className="h-10 w-full rounded-lg border border-rx-border px-2" disabled={data.billing.paid > 0} value={currency} onChange={e => setCurrency(e.target.value)}><option value="IQD">IQD</option><option value="USD">USD</option></select></div>
      </div>
      <div className="space-y-1"><Label htmlFor={`payment-${sessionId}`}>{t("billing.newPayment")}</Label><Input id={`payment-${sessionId}`} type="number" min="0" max={Math.max(0, Number(fee || 0) - data.billing.paid)} step={currency === "USD" ? "0.01" : "1"} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label htmlFor={`date-${sessionId}`}>{t("finances.date")}</Label><Input id={`date-${sessionId}`} type="date" required value={date} onChange={e => setDate(e.target.value)} /></div>
        <div className="space-y-1"><Label htmlFor={`method-${sessionId}`}>{t("finances.paymentMethod")}</Label><select id={`method-${sessionId}`} className="h-10 w-full rounded-lg border border-rx-border px-2" value={method} onChange={e => setMethod(e.target.value)}>{["cash", "card", "transfer"].map(m => <option key={m} value={m}>{t(`finances.methods.${m}`)}</option>)}</select></div>
      </div>
      <div className="space-y-1"><Label htmlFor={`note-${sessionId}`}>{t("finances.notes")}</Label><Input id={`note-${sessionId}`} maxLength={2000} value={description} onChange={e => setDescription(e.target.value)} /></div>
    </fieldset>
    {fee !== "" && <p className={`rounded-lg p-3 text-sm font-semibold ${remaining < 0 ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900"}`}>{t("billing.remainingAfter")}: {formatMoney(remaining, currency, locale)}</p>}
    {save.isError && <p role="alert" className="text-sm text-red-700">{save.error.message} · {t("billing.retryHint")}</p>}
    <div className="flex gap-2"><Button type="submit" disabled={busy || remaining < 0 || (fee === "" && Number(amount) > 0)}>{busy ? t("common.saving") : save.isError ? t("billing.retry") : t("common.save")}</Button><Button type="button" variant="outline" disabled={busy} onClick={onClose}>{t("common.close")}</Button></div>
    <div className="border-t pt-3"><h4 className="mb-2 text-sm font-semibold">{t("billing.payments")}</h4>
      {data.payments.length === 0 ? <p className="text-xs text-rx-muted">{t("billing.noPayments")}</p> : data.payments.map(p => <div key={p.id} className="flex items-center justify-between gap-2 border-b border-rx-border py-2 text-xs"><div><strong>{formatMoney(p.amount, p.currency, locale)}</strong> · {p.transactionDate}<p>{t(`finances.methods.${p.paymentMethod}`)} · {p.description}</p></div><Button type="button" variant="ghost" size="sm" disabled={locked} onClick={() => { if (confirm(t("billing.deletePaymentConfirm"))) remove.mutate(p.id); }}>{t("common.delete")}</Button></div>)}
    </div>
  </form>;
}
