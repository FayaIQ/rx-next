"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarRange,
  Download,
  Pencil,
  Plus,
  Save,
  Search,
  Settings2,
  Trash2,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { PageContent } from "@/components/ui/page-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { usePaginationState } from "@/hooks/use-pagination-state";
import {
  rxApi,
  type FinanceTransactionDto,
  type FinanceSettingsDto,
  type FinanceSummaryDto,
} from "@/lib/api/rx-client";
import {
  FINANCE_EXPENSE_CATEGORIES,
  FINANCE_INCOME_CATEGORIES,
  PAYMENT_METHODS,
  defaultAmountForCategory,
  formatMoney,
} from "@/lib/finance/constants";
import { cn } from "@/lib/utils";
import {
  useLocale,
  type Locale,
  type TranslateFn,
} from "@/i18n/locale-provider";

type FilterType = "all" | "income" | "expense";
type PeriodPreset = "today" | "week" | "month" | "last_month" | "year" | "custom";

type TransactionFormState = {
  type: "income" | "expense";
  category: string;
  amount: string;
  paymentMethod: string;
  description: string;
  transactionDate: string;
  patientId: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function todayKey() {
  return dateKey(new Date());
}

function rangeForPreset(preset: PeriodPreset): { from: string; to: string } {
  const now = new Date();
  const to = dateKey(now);

  if (preset === "today") return { from: to, to };

  if (preset === "week") {
    const from = new Date(now);
    from.setDate(now.getDate() - 6);
    return { from: dateKey(from), to };
  }

  if (preset === "month") {
    return {
      from: dateKey(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: dateKey(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    };
  }

  if (preset === "last_month") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: dateKey(from), to: dateKey(end) };
  }

  if (preset === "year") {
    return {
      from: `${now.getFullYear()}-01-01`,
      to: `${now.getFullYear()}-12-31`,
    };
  }

  const month = rangeForPreset("month");
  return month;
}

function emptyForm(type: "income" | "expense"): TransactionFormState {
  return {
    type,
    category: type === "income" ? "consultation" : "rent",
    amount: "",
    paymentMethod: "cash",
    description: "",
    transactionDate: todayKey(),
    patientId: "",
  };
}

function dateLocaleTag(locale: Locale) {
  return locale === "en" ? "en-GB" : "ar-IQ";
}

function formatShortDate(iso: string, locale: Locale) {
  try {
    return new Date(iso + "T12:00:00").toLocaleDateString(dateLocaleTag(locale), {
      day: "numeric",
      month: "short",
      numberingSystem: "latn",
    });
  } catch {
    return iso;
  }
}

function categoryLabel(t: TranslateFn, category: string) {
  const key = `finances.categories.${category}`;
  const translated = t(key);
  return translated === key ? category : translated;
}

function methodLabel(t: TranslateFn, method: string | null | undefined) {
  if (!method) return "—";
  const key = `finances.methods.${method}`;
  const translated = t(key);
  return translated === key ? method : translated;
}

type Props = {
  title?: string;
  subtitle?: string;
};

export function FinancesPage({ title, subtitle }: Props) {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const pageTitle = title ?? t("finances.title");
  const pageSubtitle = subtitle ?? t("finances.subtitle");
  const initial = rangeForPreset("month");
  const [preset, setPreset] = useState<PeriodPreset>("month");
  const [periodFrom, setPeriodFrom] = useState(initial.from);
  const [periodTo, setPeriodTo] = useState(initial.to);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const { page, pageSize, onPageChange, onPageSizeChange } = usePaginationState(
    `${filterType}-${periodFrom}-${periodTo}`
  );
  const [showSettings, setShowSettings] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceTransactionDto | null>(null);
  const [form, setForm] = useState<TransactionFormState>(emptyForm("income"));
  const [feeForm, setFeeForm] = useState({
    consultationFee: "",
    followUpFee: "",
    procedureFee: "",
  });
  const [breakdownTab, setBreakdownTab] = useState<"income" | "expense">(
    "income"
  );

  const presets = useMemo(
    () =>
      [
        { id: "today" as const, label: t("finances.presetToday") },
        { id: "week" as const, label: t("finances.presetWeek") },
        { id: "month" as const, label: t("finances.presetMonth") },
        { id: "last_month" as const, label: t("finances.presetLastMonth") },
        { id: "year" as const, label: t("finances.presetYear") },
        { id: "custom" as const, label: t("finances.presetCustom") },
      ] satisfies Array<{ id: PeriodPreset; label: string }>,
    [t]
  );

  const { data: settingsData } = useQuery({
    queryKey: ["finance-settings"],
    queryFn: () => rxApi.finances.getSettings(),
  });
  const settings = settingsData?.settings;

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ["finance-summary", periodFrom, periodTo],
    queryFn: () =>
      rxApi.finances.getSummary({ from: periodFrom, to: periodTo }),
  });

  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: [
      "finance-transactions",
      filterType,
      periodFrom,
      periodTo,
      page,
      pageSize,
    ],
    queryFn: () =>
      rxApi.finances.listTransactions({
        type: filterType === "all" ? undefined : filterType,
        from: periodFrom,
        to: periodTo,
        page,
        pageSize,
      }),
  });

  const { data: patientsData } = useQuery({
    queryKey: ["patients", "finance-picker"],
    queryFn: () => rxApi.patients.list({ pageSize: 200 }),
    enabled: dialogOpen,
  });

  const patients = patientsData?.patients ?? [];
  const transactions = txData?.transactions ?? [];
  const pagination = txData?.pagination;
  const summary = summaryData?.summary;

  const filteredTransactions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter((tx) => {
      const hay = [
        categoryLabel(t, tx.category),
        tx.description ?? "",
        tx.patient?.name ?? "",
        methodLabel(t, tx.paymentMethod),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [transactions, search, t]);

  const saveSettingsMutation = useMutation({
    mutationFn: (body: Partial<FinanceSettingsDto>) =>
      rxApi.finances.saveSettings(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-settings"] });
      toast.success(t("finances.settingsSaved"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveTxMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        type: form.type,
        category: form.category,
        amount: Number(form.amount),
        paymentMethod: form.paymentMethod || null,
        description: form.description || null,
        transactionDate: form.transactionDate,
        patientId: form.patientId ? Number(form.patientId) : null,
      };
      if (editing) {
        return rxApi.finances.updateTransaction(editing.id, payload);
      }
      return rxApi.finances.createTransaction(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
      setDialogOpen(false);
      setEditing(null);
      toast.success(editing ? t("finances.txUpdated") : t("finances.txCreated"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => rxApi.finances.deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
      toast.success(t("finances.txDeleted"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const categoryOptions = useMemo(
    () =>
      (form.type === "income"
        ? FINANCE_INCOME_CATEGORIES
        : FINANCE_EXPENSE_CATEGORIES
      ).map((c) => ({ id: c.id, label: categoryLabel(t, c.id) })),
    [form.type, t]
  );

  const categoryBreakdown = useMemo(() => {
    if (!summary?.byCategory) return [];
    return summary.byCategory.filter((c) => c.type === breakdownTab);
  }, [summary, breakdownTab]);

  const categoryMax = Math.max(1, ...categoryBreakdown.map((c) => c.amount));

  function applyPreset(next: PeriodPreset) {
    setPreset(next);
    if (next === "custom") return;
    const range = rangeForPreset(next);
    setPeriodFrom(range.from);
    setPeriodTo(range.to);
  }

  function openCreate(type: "income" | "expense") {
    const next = emptyForm(type);
    if (settings && type === "income") {
      const suggested = defaultAmountForCategory(next.category, settings);
      if (suggested != null && suggested > 0) {
        next.amount = String(suggested);
      }
    }
    setEditing(null);
    setForm(next);
    setDialogOpen(true);
  }

  function openEdit(tx: FinanceTransactionDto) {
    setEditing(tx);
    setForm({
      type: tx.type,
      category: tx.category,
      amount: String(tx.amount),
      paymentMethod: tx.paymentMethod ?? "cash",
      description: tx.description ?? "",
      transactionDate: tx.transactionDate,
      patientId: tx.patientId ? String(tx.patientId) : "",
    });
    setDialogOpen(true);
  }

  function loadSettingsToForm() {
    if (!settings) return;
    setFeeForm({
      consultationFee: String(settings.consultationFee),
      followUpFee: String(settings.followUpFee),
      procedureFee: String(settings.procedureFee),
    });
  }

  function exportCsv() {
    const rows = filteredTransactions;
    if (rows.length === 0) {
      toast.error(t("finances.exportEmpty"));
      return;
    }
    const header = [
      t("finances.csvDate"),
      t("finances.csvType"),
      t("finances.csvCategory"),
      t("finances.csvAmount"),
      t("finances.csvPayment"),
      t("finances.csvPatient"),
      t("finances.csvNotes"),
    ];
    const lines = rows.map((tx) =>
      [
        tx.transactionDate,
        tx.type === "income" ? t("finances.income") : t("finances.expense"),
        categoryLabel(t, tx.category),
        tx.amount,
        methodLabel(t, tx.paymentMethod),
        tx.patient?.name ?? "",
        (tx.description ?? "").replace(/"/g, '""'),
      ]
        .map((v) => `"${v}"`)
        .join(",")
    );
    const bom = "\uFEFF";
    const blob = new Blob([bom + [header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finances-${periodFrom}-${periodTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("finances.exportDone"));
  }

  const currency = settings?.currency ?? "IQD";
  const balance = summary?.balance ?? 0;

  return (
    <>
      <AppHeader title={pageTitle} subtitle={pageSubtitle} />
      <PageContent className="space-y-5 pb-10">
        <div className="flex flex-col gap-3 rounded-2xl border border-rx-border/80 bg-gradient-to-l from-slate-50 via-white to-teal-50/40 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => openCreate("income")}>
              <Plus size={14} />
              {t("finances.newIncome")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-rose-200 text-rose-700 hover:bg-rose-50"
              onClick={() => openCreate("expense")}
            >
              <Plus size={14} />
              {t("finances.newExpense")}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={exportCsv}>
              <Download size={14} />
              {t("finances.exportCsv")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                loadSettingsToForm();
                setShowSettings((v) => !v);
              }}
            >
              <Settings2 size={14} />
              {t("finances.consultationFees")}
            </Button>
          </div>
        </div>

        <section className="rounded-2xl border border-rx-border/80 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-rx-text">
            <CalendarRange size={16} className="text-rx-primary" />
            {t("finances.reportPeriod")}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition",
                  preset === p.id
                    ? "bg-rx-primary text-white shadow-sm"
                    : "bg-rx-bg-subtle text-rx-muted hover:text-rx-text"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          {preset === "custom" ? (
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t("finances.from")}</Label>
                <Input
                  type="date"
                  value={periodFrom}
                  onChange={(e) => setPeriodFrom(e.target.value)}
                  className="h-9 w-40"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("finances.to")}</Label>
                <Input
                  type="date"
                  value={periodTo}
                  onChange={(e) => setPeriodTo(e.target.value)}
                  className="h-9 w-40"
                />
              </div>
            </div>
          ) : (
            <p className="mt-2 text-xs text-rx-muted">
              {formatShortDate(periodFrom, locale)} —{" "}
              {formatShortDate(periodTo, locale)}
            </p>
          )}
        </section>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label={t("finances.totalIncome")}
            value={summary?.totalIncome ?? 0}
            currency={currency}
            locale={locale}
            loading={summaryLoading}
            hint={t("finances.kpiMovementsHint", {
              count: summary?.incomeCount ?? 0,
              avg: formatMoney(summary?.avgIncome ?? 0, currency, locale),
            })}
            tone="income"
            icon={<ArrowUpRight size={20} />}
          />
          <KpiCard
            label={t("finances.totalExpenses")}
            value={summary?.totalExpenses ?? 0}
            currency={currency}
            locale={locale}
            loading={summaryLoading}
            hint={t("finances.kpiMovementsHint", {
              count: summary?.expenseCount ?? 0,
              avg: formatMoney(summary?.avgExpense ?? 0, currency, locale),
            })}
            tone="expense"
            icon={<ArrowDownRight size={20} />}
          />
          <KpiCard
            label={t("finances.netBalance")}
            value={balance}
            currency={currency}
            locale={locale}
            loading={summaryLoading}
            hint={
              balance >= 0
                ? t("finances.periodProfit")
                : t("finances.periodLoss")
            }
            tone="balance"
            icon={<Wallet size={20} />}
          />
          <KpiCard
            label={t("finances.transactionCount")}
            value={summary?.transactionCount ?? 0}
            currency={currency}
            locale={locale}
            loading={summaryLoading}
            hint={t("finances.incomePlusExpense")}
            tone="count"
            icon={<TrendingUp size={20} />}
            raw
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-5">
          <div className="rounded-2xl border border-rx-border/80 bg-white p-4 shadow-sm lg:col-span-3">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">{t("finances.dailyTrend")}</h3>
              <div className="flex items-center gap-3 text-[11px] text-rx-muted">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />{" "}
                  {t("finances.income")}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-rose-400" />{" "}
                  {t("finances.expense")}
                </span>
              </div>
            </div>
            <DailyChart
              daily={summary?.daily ?? []}
              loading={summaryLoading}
              t={t}
            />
          </div>

          <div className="rounded-2xl border border-rx-border/80 bg-white p-4 shadow-sm lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{t("finances.byCategory")}</h3>
              <div className="flex gap-1 rounded-lg bg-rx-bg-subtle p-0.5">
                {(
                  [
                    { id: "income" as const, label: t("finances.income") },
                    { id: "expense" as const, label: t("finances.expense") },
                  ]
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setBreakdownTab(tab.id)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[11px] font-medium transition",
                      breakdownTab === tab.id
                        ? "bg-white text-rx-text shadow-sm"
                        : "text-rx-muted"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            {summaryLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-8 animate-pulse rounded-lg bg-rx-bg-subtle"
                  />
                ))}
              </div>
            ) : categoryBreakdown.length === 0 ? (
              <p className="py-8 text-center text-xs text-rx-muted">
                {t("finances.noCategoryData")}
              </p>
            ) : (
              <ul className="space-y-3">
                {categoryBreakdown.slice(0, 6).map((c) => (
                  <li key={`${c.type}-${c.category}`}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-rx-text">
                        {categoryLabel(t, c.category)}
                      </span>
                      <span className="text-rx-muted">
                        {formatMoney(c.amount, currency, locale)} · {c.count}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-rx-bg-subtle">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          breakdownTab === "income"
                            ? "bg-emerald-500"
                            : "bg-rose-400"
                        )}
                        style={{
                          width: `${Math.max(4, (c.amount / categoryMax) * 100)}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {summary?.byPaymentMethod && summary.byPaymentMethod.length > 0 ? (
              <div className="mt-5 border-t border-rx-border/70 pt-4">
                <p className="mb-2 text-xs font-semibold text-rx-muted">
                  {t("finances.paymentMethodsTitle")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {summary.byPaymentMethod.map((m) => (
                    <span
                      key={m.method}
                      className="inline-flex items-center gap-1.5 rounded-full border border-rx-border bg-rx-bg-subtle/60 px-2.5 py-1 text-[11px]"
                    >
                      <span className="font-medium">
                        {methodLabel(t, m.method)}
                      </span>
                      <span className="text-rx-muted">
                        {formatMoney(m.amount, currency, locale)}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {showSettings && (
          <section className="rounded-2xl border border-rx-border/80 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Wallet size={16} className="text-rx-primary" />
                  {t("finances.defaultServicePrices")}
                </h3>
                <p className="mt-1 text-xs text-rx-muted">
                  {t("finances.defaultServicePricesHint")}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowSettings(false)}
              >
                <X size={16} />
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {(
                [
                  {
                    key: "consultationFee" as const,
                    label: t("finances.feeConsultation"),
                  },
                  {
                    key: "followUpFee" as const,
                    label: t("finances.feeFollowUp"),
                  },
                  {
                    key: "procedureFee" as const,
                    label: t("finances.feeProcedure"),
                  },
                ]
              ).map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label>
                    {t("finances.feeLabelSyp", { label: field.label })}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={feeForm[field.key]}
                    onChange={(e) =>
                      setFeeForm((f) => ({
                        ...f,
                        [field.key]: e.target.value,
                      }))
                    }
                  />
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button
                size="sm"
                disabled={saveSettingsMutation.isPending}
                onClick={() =>
                  saveSettingsMutation.mutate({
                    consultationFee: Number(feeForm.consultationFee) || 0,
                    followUpFee: Number(feeForm.followUpFee) || 0,
                    procedureFee: Number(feeForm.procedureFee) || 0,
                    currency: settings?.currency ?? "IQD",
                  })
                }
              >
                <Save size={14} />
                {saveSettingsMutation.isPending
                  ? t("common.saving")
                  : t("finances.savePrices")}
              </Button>
            </div>
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-rx-border/80 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-rx-border/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold">{t("finances.ledger")}</h3>
              <p className="text-xs text-rx-muted">
                {t("finances.ledgerCount", {
                  count: pagination?.total ?? filteredTransactions.length,
                })}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[180px] flex-1 sm:flex-none">
                <Search
                  size={14}
                  className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-rx-muted"
                />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("finances.searchPlaceholder")}
                  className="h-9 pe-9"
                />
              </div>
              <div className="flex gap-1 rounded-lg bg-rx-bg-subtle p-0.5">
                {(
                  [
                    { key: "all" as const, label: t("finances.filterAll") },
                    {
                      key: "income" as const,
                      label: t("finances.filterIncome"),
                    },
                    {
                      key: "expense" as const,
                      label: t("finances.filterExpense"),
                    },
                  ]
                ).map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFilterType(f.key)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-medium transition",
                      filterType === f.key
                        ? "bg-white text-rx-text shadow-sm"
                        : "text-rx-muted hover:text-rx-text"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-2 sm:p-3">
            {txLoading ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded-xl bg-rx-bg-subtle"
                  />
                ))}
              </div>
            ) : filteredTransactions.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title={t("finances.emptyTitle")}
                description={t("finances.emptyDescription")}
                action={
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => openCreate("income")}>
                      <Plus size={14} /> {t("finances.income")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openCreate("expense")}
                    >
                      <Plus size={14} /> {t("finances.expense")}
                    </Button>
                  </div>
                }
              />
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b border-rx-border/70 text-xs text-rx-muted">
                        <th className="px-3 py-2 text-start font-medium">
                          {t("finances.colDate")}
                        </th>
                        <th className="px-3 py-2 text-start font-medium">
                          {t("finances.colType")}
                        </th>
                        <th className="px-3 py-2 text-start font-medium">
                          {t("finances.colCategory")}
                        </th>
                        <th className="px-3 py-2 text-start font-medium">
                          {t("finances.colDetails")}
                        </th>
                        <th className="px-3 py-2 text-start font-medium">
                          {t("finances.colPayment")}
                        </th>
                        <th className="px-3 py-2 text-end font-medium">
                          {t("finances.colAmount")}
                        </th>
                        <th className="px-3 py-2 text-end font-medium">
                          {t("finances.colActions")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map((tx) => (
                        <tr
                          key={tx.id}
                          className="border-b border-rx-border/40 last:border-0 hover:bg-rx-bg-subtle/40"
                        >
                          <td className="whitespace-nowrap px-3 py-3 text-rx-muted">
                            {formatShortDate(tx.transactionDate, locale)}
                          </td>
                          <td className="px-3 py-3">
                            <Badge
                              variant={
                                tx.type === "income" ? "default" : "secondary"
                              }
                            >
                              {tx.type === "income"
                                ? t("finances.income")
                                : t("finances.expense")}
                            </Badge>
                          </td>
                          <td className="px-3 py-3 font-medium">
                            {categoryLabel(t, tx.category)}
                          </td>
                          <td className="max-w-[220px] truncate px-3 py-3 text-rx-muted">
                            {tx.patient?.name
                              ? tx.patient.name
                              : tx.description || "—"}
                            {tx.patient?.name && tx.description
                              ? ` · ${tx.description}`
                              : ""}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-rx-muted">
                            {methodLabel(t, tx.paymentMethod)}
                          </td>
                          <td
                            className={cn(
                              "whitespace-nowrap px-3 py-3 text-end font-bold tabular-nums",
                              tx.type === "income"
                                ? "text-emerald-600"
                                : "text-rose-600"
                            )}
                          >
                            {tx.type === "income" ? "+" : "−"}
                            {formatMoney(tx.amount, currency, locale)}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => openEdit(tx)}
                              >
                                <Pencil size={14} />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-rose-600"
                                onClick={() => {
                                  if (confirm(t("finances.deleteConfirm"))) {
                                    deleteMutation.mutate(tx.id);
                                  }
                                }}
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-2 md:hidden">
                  {filteredTransactions.map((tx) => (
                    <TransactionCard
                      key={tx.id}
                      tx={tx}
                      currency={currency}
                      locale={locale}
                      t={t}
                      onEdit={() => openEdit(tx)}
                      onDelete={() => {
                        if (confirm(t("finances.deleteConfirm"))) {
                          deleteMutation.mutate(tx.id);
                        }
                      }}
                    />
                  ))}
                </div>
              </>
            )}

            {pagination && pagination.totalPages > 1 ? (
              <div className="mt-3 border-t border-rx-border/60 pt-3">
                <Pagination
                  pagination={pagination}
                  onPageChange={onPageChange}
                  onPageSizeChange={onPageSizeChange}
                />
              </div>
            ) : null}
          </div>
        </section>
      </PageContent>

      {dialogOpen ? (
        <TransactionDialog
          editing={editing}
          form={form}
          setForm={setForm}
          categoryOptions={categoryOptions}
          patients={patients}
          settings={settings}
          saving={saveTxMutation.isPending}
          t={t}
          onSave={() => saveTxMutation.mutate()}
          onClose={() => {
            setDialogOpen(false);
            setEditing(null);
          }}
        />
      ) : null}
    </>
  );
}

function KpiCard({
  label,
  value,
  currency,
  locale,
  loading,
  hint,
  tone,
  icon,
  raw,
}: {
  label: string;
  value: number;
  currency: string;
  locale: Locale;
  loading?: boolean;
  hint?: string;
  tone: "income" | "expense" | "balance" | "count";
  icon: ReactNode;
  raw?: boolean;
}) {
  const tones = {
    income: {
      value: "text-emerald-700",
      icon: "bg-emerald-50 text-emerald-600",
      ring: "from-emerald-50/80",
    },
    expense: {
      value: "text-rose-700",
      icon: "bg-rose-50 text-rose-600",
      ring: "from-rose-50/80",
    },
    balance: {
      value: value >= 0 ? "text-cyan-800" : "text-rose-700",
      icon:
        value >= 0
          ? "bg-cyan-50 text-cyan-700"
          : "bg-rose-50 text-rose-600",
      ring: value >= 0 ? "from-cyan-50/80" : "from-rose-50/80",
    },
    count: {
      value: "text-slate-800",
      icon: "bg-slate-100 text-slate-600",
      ring: "from-slate-50/80",
    },
  }[tone];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-rx-border/80 bg-gradient-to-br to-white p-4 shadow-sm",
        tones.ring
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-rx-muted">{label}</p>
          <p
            className={cn(
              "mt-2 text-2xl font-bold tracking-tight tabular-nums",
              tones.value
            )}
          >
            {loading
              ? "…"
              : raw
                ? value.toLocaleString(dateLocaleTag(locale), {
                    numberingSystem: "latn",
                  })
                : formatMoney(value, currency, locale)}
          </p>
          {hint ? (
            <p className="mt-1.5 truncate text-[11px] text-rx-muted">{hint}</p>
          ) : null}
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            tones.icon
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function DailyChart({
  daily,
  loading,
  t,
}: {
  daily: FinanceSummaryDto["daily"];
  loading?: boolean;
  t: TranslateFn;
}) {
  if (loading) {
    return (
      <div className="flex h-40 items-end gap-1">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 animate-pulse rounded-t bg-rx-bg-subtle"
            style={{ height: `${30 + ((i * 17) % 60)}%` }}
          />
        ))}
      </div>
    );
  }

  if (!daily.length) {
    return (
      <div className="flex h-40 items-center justify-center text-xs text-rx-muted">
        {t("finances.noDailyActivity")}
      </div>
    );
  }

  const max = Math.max(
    1,
    ...daily.map((d) => Math.max(d.income, d.expense))
  );
  const shown =
    daily.length > 21
      ? daily.slice(daily.length - 21)
      : daily;

  return (
    <div className="flex h-40 items-end gap-1 sm:gap-1.5">
      {shown.map((d) => (
        <div
          key={d.date}
          className="group relative flex min-w-0 flex-1 flex-col items-center justify-end gap-0.5"
          title={t("finances.chartTooltip", {
            date: d.date,
            income: d.income,
            expense: d.expense,
          })}
        >
          <div
            className="flex w-full items-end justify-center gap-0.5"
            style={{ height: "100%" }}
          >
            <div
              className="w-[42%] rounded-t bg-emerald-500/85 transition group-hover:bg-emerald-500"
              style={{ height: `${Math.max(2, (d.income / max) * 100)}%` }}
            />
            <div
              className="w-[42%] rounded-t bg-rose-400/85 transition group-hover:bg-rose-500"
              style={{ height: `${Math.max(2, (d.expense / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function TransactionCard({
  tx,
  currency,
  locale,
  t,
  onEdit,
  onDelete,
}: {
  tx: FinanceTransactionDto;
  currency: string;
  locale: Locale;
  t: TranslateFn;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isIncome = tx.type === "income";
  return (
    <div className="rounded-xl border border-rx-border/70 px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={isIncome ? "default" : "secondary"}>
              {isIncome ? t("finances.income") : t("finances.expense")}
            </Badge>
            <span className="text-xs text-rx-muted">
              {formatShortDate(tx.transactionDate, locale)}
            </span>
          </div>
          <p className="mt-1.5 text-sm font-semibold">
            {categoryLabel(t, tx.category)}
            {tx.patient ? ` — ${tx.patient.name}` : ""}
          </p>
          <p className="mt-0.5 text-xs text-rx-muted">
            {methodLabel(t, tx.paymentMethod)}
            {tx.description ? ` · ${tx.description}` : ""}
          </p>
        </div>
        <p
          className={cn(
            "shrink-0 text-sm font-bold tabular-nums",
            isIncome ? "text-emerald-600" : "text-rose-600"
          )}
        >
          {isIncome ? "+" : "−"}
          {formatMoney(tx.amount, currency, locale)}
        </p>
      </div>
      <div className="mt-2 flex justify-end gap-1">
        <Button size="icon" variant="ghost" onClick={onEdit}>
          <Pencil size={14} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="text-rose-600"
          onClick={onDelete}
        >
          <Trash2 size={14} />
        </Button>
      </div>
    </div>
  );
}

function TransactionDialog({
  editing,
  form,
  setForm,
  categoryOptions,
  patients,
  settings,
  saving,
  t,
  onSave,
  onClose,
}: {
  editing: FinanceTransactionDto | null;
  form: TransactionFormState;
  setForm: Dispatch<SetStateAction<TransactionFormState>>;
  categoryOptions: Array<{ id: string; label: string }>;
  patients: Array<{ id: number; name: string }>;
  settings?: FinanceSettingsDto;
  saving: boolean;
  t: TranslateFn;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-3 backdrop-blur-[2px] sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold">
              {editing
                ? t("finances.dialogEdit")
                : form.type === "income"
                  ? t("finances.dialogIncome")
                  : t("finances.dialogExpense")}
            </h3>
            <p className="mt-1 text-xs text-rx-muted">
              {t("finances.dialogHint")}
            </p>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose}>
            <X size={16} />
          </Button>
        </div>

        {!editing ? (
          <div className="mb-4 flex gap-1 rounded-xl bg-rx-bg-subtle p-1">
            {(
              [
                { id: "income" as const, label: t("finances.income") },
                { id: "expense" as const, label: t("finances.expense") },
              ]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  setForm((f) => {
                    const next = emptyForm(tab.id);
                    next.transactionDate = f.transactionDate;
                    if (settings && tab.id === "income") {
                      const suggested = defaultAmountForCategory(
                        next.category,
                        settings
                      );
                      if (suggested != null && suggested > 0) {
                        next.amount = String(suggested);
                      }
                    }
                    return next;
                  })
                }
                className={cn(
                  "flex-1 rounded-lg py-2 text-sm font-medium transition",
                  form.type === tab.id
                    ? tab.id === "income"
                      ? "bg-emerald-600 text-white shadow"
                      : "bg-rose-600 text-white shadow"
                    : "text-rx-muted hover:text-rx-text"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>{t("finances.category")}</Label>
            <select
              className="h-10 w-full rounded-lg border border-rx-border bg-white px-3 text-sm"
              value={form.category}
              onChange={(e) => {
                const category = e.target.value;
                setForm((f) => {
                  const next = { ...f, category };
                  if (!editing && f.type === "income" && settings) {
                    const suggested = defaultAmountForCategory(
                      category,
                      settings
                    );
                    if (suggested != null && suggested > 0) {
                      next.amount = String(suggested);
                    }
                  }
                  return next;
                });
              }}
            >
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("finances.amountSyp")}</Label>
              <Input
                type="number"
                min={1}
                required
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("finances.date")}</Label>
              <Input
                type="date"
                value={form.transactionDate}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    transactionDate: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("finances.paymentMethod")}</Label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, paymentMethod: m.id }))
                  }
                  className={cn(
                    "rounded-lg border px-2 py-2 text-xs font-medium transition",
                    form.paymentMethod === m.id
                      ? "border-rx-primary bg-rx-primary/5 text-rx-primary"
                      : "border-rx-border text-rx-muted hover:border-rx-primary/40"
                  )}
                >
                  {methodLabel(t, m.id)}
                </button>
              ))}
            </div>
          </div>

          {form.type === "income" ? (
            <div className="space-y-1.5">
              <Label>{t("finances.patientOptional")}</Label>
              <select
                className="h-10 w-full rounded-lg border border-rx-border bg-white px-3 text-sm"
                value={form.patientId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, patientId: e.target.value }))
                }
              >
                <option value="">{t("finances.noPatient")}</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label>{t("finances.notes")}</Label>
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder={t("finances.notesPlaceholder")}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1"
              disabled={saving || !form.amount}
              onClick={onSave}
            >
              {saving ? t("common.saving") : t("finances.saveTx")}
            </Button>
            <Button variant="outline" onClick={onClose}>
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
