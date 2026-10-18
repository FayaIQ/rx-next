"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/i18n/locale-provider";
import type { loadSpendReport } from "@/lib/product-analytics/spend";
export function CampaignSpend({ rows, onSaved }: { rows: Awaited<ReturnType<typeof loadSpendReport>>; onSaved: () => void }) {
  const { locale } = useLocale(); const ar = locale === "ar";
  const [pending, setPending] = useState(false), [error, setError] = useState(false);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return; const form = event.currentTarget; const data = new FormData(form); setPending(true); setError(false);
    try { const response = await fetch("/api/dashboard/acquisition", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source: data.get("source"), campaign: data.get("campaign"), from: data.get("from"), to: data.get("to"), amount: Number(data.get("amount")), currency: data.get("currency"), verified: data.get("verified") === "on" }) }); if (!response.ok) throw new Error(); form.reset(); onSaved(); } catch { setError(true); } finally { setPending(false); }
  }
  const label = (a: string, e: string) => ar ? a : e;
  return <section className="space-y-4 rounded-2xl border bg-white p-4"><h2 className="font-bold">{label("إنفاق الحملة وتكلفة التحويل", "Campaign spend and conversion cost")}</h2>
    <details><summary className="cursor-pointer font-semibold">{label("إدخال إنفاق موثق", "Enter verified spend")}</summary><form onSubmit={save} className="mt-4 grid gap-3 sm:grid-cols-3">
      <label>{label("المصدر", "Source")}<select name="source" className="block h-10 w-full rounded-md border px-3">{["facebook", "instagram", "google", "tiktok", "email", "whatsapp", "other"].map(source => <option key={source}>{source}</option>)}</select></label>
      <label>{label("معرف الحملة", "Campaign ID")}<Input name="campaign" pattern="[a-zA-Z0-9_.-]{0,80}" /></label><label>{label("المبلغ", "Amount")}<Input name="amount" type="number" min="0.01" step="0.01" required /></label>
      <label>{label("من", "From")}<Input name="from" type="date" required /></label><label>{label("إلى", "To")}<Input name="to" type="date" required /></label><label>{label("العملة", "Currency")}<select name="currency" className="block h-10 w-full rounded-md border px-3"><option>IQD</option><option>USD</option></select></label>
      <label className="flex items-center gap-2 text-sm sm:col-span-3"><input name="verified" type="checkbox" required />{label("أكدت الإنفاق من سجل الحملة لنفس الفترة", "I verified this spend against the campaign record for this period")}</label><Button disabled={pending}>{label("حفظ الإنفاق", "Save spend")}</Button>{error && <p role="alert">{label("تعذّر الحفظ. تحقق من البيانات.", "Could not save. Check the values.")}</p>}
    </form></details>
    {!rows.length ? <p className="text-sm text-rx-muted">{label("لا توجد بيانات إنفاق موثقة؛ لذلك لا نعرض تكلفة استحواذ أو عائداً تقديرياً.", "No verified spend. Acquisition costs and returns are not estimated.")}</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr>{[label("الحملة / الفترة", "Campaign / period"), label("الإنفاق", "Spend"), label("الحسابات", "Accounts"), label("كلفة الحساب", "Cost / account"), label("كلفة التفعيل", "Cost / activation"), label("كلفة اشتراك مؤكد", "Cost / paid account")].map(h => <th className="p-3 text-start" key={h}>{h}</th>)}</tr></thead><tbody>{rows.map(r => <tr key={r.id} className="border-t"><td className="p-3">{r.source} / {r.campaign || "—"}<br />{r.from} → {r.to}</td><td className="p-3">{r.amount} {r.currency}</td><td className="p-3">{r.accounts}</td>{[r.costPerAccount, r.costPerActivation, r.costPerPaid].map((v, i) => <td key={i} className="p-3">{v == null ? "—" : `${v.toFixed(2)} ${r.currency}`}</td>)}</tr>)}</tbody></table></div>}
    <p className="text-xs leading-6 text-rx-muted">{label("تُحسب الكلفة من حسابات المصدر والحملة المسجلة خلال الفترة المحددة بتوقيت بغداد. الفترات الحديثة قد لا تكون أكملت تجربة الاشتراك. لا يُجمع إنفاق العملات المختلفة ولا يُحسب عائد إعلان دون إيراد منسوب موثق.", "Costs use accounts acquired by that source and campaign in the entered Baghdad-time period. Recent cohorts may still be in trial. Currencies are kept separate; ad return needs verified attributed revenue.")}</p>
  </section>;
}
