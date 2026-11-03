"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useLocale } from "@/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/finance/constants";
import type { AccountTotal, SessionBilling } from "@/lib/finance/session-balance";
import { billingRequest, DebtBadge, SessionBillingButton } from "./session-billing";
import { tTreatmentTarget, tTreatmentType } from "@/lib/i18n-labels";

export type PatientAccount = {
  totals: AccountTotal[];
  sessions: Array<{ id: number; sessionNumber: number; status: string; planTitle: string | null; toothFdi: number | null; treatmentType: string; billing: SessionBilling }>;
};

export function AccountTotals({ totals }: { totals: AccountTotal[] }) {
  const { t, locale } = useLocale();
  return <div className="space-y-2">{totals.map(row => <dl key={row.currency} className="grid grid-cols-3 gap-2 rounded-xl border border-rx-border border-rx-border bg-white p-3 text-xs sm:text-sm">
    {[{ key: "total", value: row.total }, { key: "paidAmount", value: row.paid }, { key: "remaining", value: row.remaining }].map(item => <div key={item.key}><dt className="text-rx-muted">{t(`billing.${item.key}`)}</dt><dd className={`mt-1 font-semibold ${item.key === "remaining" && item.value > 0 ? "text-amber-800" : "text-rx-text"}`}>{formatMoney(item.value, row.currency, locale)}</dd></div>)}
  </dl>)}</div>;
}

export function PatientAccountPanel({ patientId, compact = false }: { patientId: number; compact?: boolean }) {
  const { t } = useLocale();
  const [expanded, setExpanded] = useState(!compact);
  const query = useQuery({ queryKey: ["patient-account", patientId], networkMode: "always", retry: false, queryFn: () => billingRequest<PatientAccount>(`/api/patients/${patientId}/account`), enabled: patientId > 0 });
  if (patientId <= 0) return null;
  if (query.isPending) return <p className="text-xs text-rx-muted">{t("billing.loading")}</p>;
  if (query.isError) return <div role="alert" className="rounded-lg border border-red-200 p-3 text-xs text-red-700">{t("billing.loadError")} <Button size="sm" variant="ghost" onClick={() => query.refetch()}>{t("billing.retry")}</Button></div>;
  const { totals, sessions } = query.data;
  return <section aria-label={t("billing.patientAccount")} className="space-y-3 rounded-xl border border-rx-border bg-slate-50/60 p-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">{t("billing.patientAccount")}</h3><DebtBadge totals={totals} /><Button type="button" size="sm" variant="ghost" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{t(expanded ? "billing.hide" : "billing.details")}</Button></div>
    <AccountTotals totals={totals} />
    {totals.length === 0 && <p className="text-xs text-rx-muted">{t("billing.noPrices")}</p>}
    {expanded && <div className="space-y-3">{sessions.length === 0 ? <p className="text-xs text-rx-muted">{t("treatment.noSessions")}</p> : sessions.map(session => <div key={session.id} className="space-y-2 rounded-lg border border-rx-border border-rx-border bg-white p-3">
      <p className="text-sm font-semibold">{tTreatmentType(t, session.treatmentType)} · {tTreatmentTarget(t, session.toothFdi)} · {t("treatment.session")} {session.sessionNumber}</p>
      <SessionBillingButton sessionId={session.id} billing={session.billing} />
    </div>)}</div>}
  </section>;
}

export function ClinicDebtsPanel() {
  const { t } = useLocale();
  const [search, setSearch] = useState("");
  const query = useQuery({ queryKey: ["finance-debts"], queryFn: () => billingRequest<{ totals: AccountTotal[]; patients: Array<{ id: number; name: string; totals: AccountTotal[] }> }>("/api/finances/debts") });
  return <section className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
    <h2 className="font-semibold">{t("billing.clinicDebts")}</h2><p className="text-xs text-rx-muted">{t("billing.debtsHint")}</p>
    {query.isPending ? <p>{t("common.loading")}</p> : query.isError ? <p role="alert">{t("billing.loadError")} <Button size="sm" onClick={() => query.refetch()}>{t("billing.retry")}</Button></p> : <>
      <AccountTotals totals={query.data.totals} />
      <input aria-label={t("common.search")} placeholder={t("common.search")} value={search} onChange={e => setSearch(e.target.value)} className="h-10 w-full rounded-lg border border-rx-border border-rx-border bg-white px-3 text-sm" />
      <div className="max-h-96 space-y-2 overflow-y-auto">{query.data.patients.filter(p => p.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map(p => <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rx-border border-rx-border bg-white p-3 text-sm"><Link className="font-semibold text-rx-primary underline" href={`/patients/${p.id}/record`}>{p.name}</Link><DebtBadge totals={p.totals} /></div>)}</div>
      {query.data.patients.length === 0 && <p className="text-sm text-rx-muted">{t("billing.noDebts")}</p>}
    </>}
  </section>;
}
