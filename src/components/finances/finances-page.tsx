"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Pencil,
  Plus,
  Save,
  Settings2,
  Trash2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { PageContent } from "@/components/ui/page-shell";
import { usePaginationState } from "@/hooks/use-pagination-state";
import {
  rxApi,
  type FinanceTransactionDto,
  type FinanceSettingsDto,
} from "@/lib/api/rx-client";
import {
  FINANCE_EXPENSE_CATEGORIES,
  FINANCE_INCOME_CATEGORIES,
  PAYMENT_METHODS,
  defaultAmountForCategory,
  financeCategoryLabel,
  formatMoney,
  paymentMethodLabel,
} from "@/lib/finance/constants";
import { cn } from "@/lib/utils";

type FilterType = "all" | "income" | "expense";

type TransactionFormState = {
  type: "income" | "expense";
  category: string;
  amount: string;
  paymentMethod: string;
  description: string;
  transactionDate: string;
  patientId: string;
};

function todayKey() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function monthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const key = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: key(from), to: key(to) };
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

type Props = {
  title?: string;
  subtitle?: string;
};

export function FinancesPage({
  title = "المالية والمصاريف",
  subtitle = "إدارة إيرادات الكشفية والمصاريف اليومية للعيادة",
}: Props) {
  const queryClient = useQueryClient();
  const month = monthRange();
  const [periodFrom, setPeriodFrom] = useState(month.from);
  const [periodTo, setPeriodTo] = useState(month.to);
  const [filterType, setFilterType] = useState<FilterType>("all");
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

  const saveSettingsMutation = useMutation({
    mutationFn: (body: Partial<FinanceSettingsDto>) =>
      rxApi.finances.saveSettings(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-settings"] });
      toast.success("تم حفظ أسعار الكشفية");
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
      toast.success(editing ? "تم تحديث الحركة" : "تم تسجيل الحركة");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => rxApi.finances.deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
      toast.success("تم حذف الحركة");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const categoryOptions = useMemo(
    () =>
      form.type === "income"
        ? FINANCE_INCOME_CATEGORIES
        : FINANCE_EXPENSE_CATEGORIES,
    [form.type]
  );

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

  return (
    <>
      <AppHeader title={title} subtitle={subtitle} />
      <PageContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => openCreate("income")}>
            <Plus size={14} />
            تسجيل إيراد
          </Button>
          <Button size="sm" variant="outline" onClick={() => openCreate("expense")}>
            <Plus size={14} />
            تسجيل مصروف
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="mr-auto"
            onClick={() => {
              loadSettingsToForm();
              setShowSettings((v) => !v);
            }}
          >
            <Settings2 size={14} />
            أسعار الكشفية
          </Button>
        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-rx-border bg-white p-3">
          <div className="space-y-1">
            <Label className="text-xs">من تاريخ</Label>
            <Input
              type="date"
              value={periodFrom}
              onChange={(e) => setPeriodFrom(e.target.value)}
              className="h-9 w-40"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">إلى تاريخ</Label>
            <Input
              type="date"
              value={periodTo}
              onChange={(e) => setPeriodTo(e.target.value)}
              className="h-9 w-40"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryCard
            label="إجمالي الإيرادات"
            value={summary?.totalIncome ?? 0}
            currency={settings?.currency}
            loading={summaryLoading}
            tone="income"
          />
          <SummaryCard
            label="إجمالي المصاريف"
            value={summary?.totalExpenses ?? 0}
            currency={settings?.currency}
            loading={summaryLoading}
            tone="expense"
          />
          <SummaryCard
            label="الرصيد"
            value={summary?.balance ?? 0}
            currency={settings?.currency}
            loading={summaryLoading}
            tone="balance"
          />
        </div>

        {showSettings && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet size={18} className="text-rx-primary" />
                أسعار الخدمات الافتراضية
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>سعر الكشفية / الاستشارة (ل.س)</Label>
                <Input
                  type="number"
                  min={0}
                  value={feeForm.consultationFee}
                  onChange={(e) =>
                    setFeeForm((f) => ({
                      ...f,
                      consultationFee: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>سعر المتابعة (ل.س)</Label>
                <Input
                  type="number"
                  min={0}
                  value={feeForm.followUpFee}
                  onChange={(e) =>
                    setFeeForm((f) => ({ ...f, followUpFee: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>سعر الإجراء الطبي (ل.س)</Label>
                <Input
                  type="number"
                  min={0}
                  value={feeForm.procedureFee}
                  onChange={(e) =>
                    setFeeForm((f) => ({ ...f, procedureFee: e.target.value }))
                  }
                />
              </div>
              <div className="sm:col-span-3">
                <Button
                  size="sm"
                  disabled={saveSettingsMutation.isPending}
                  onClick={() =>
                    saveSettingsMutation.mutate({
                      consultationFee: Number(feeForm.consultationFee) || 0,
                      followUpFee: Number(feeForm.followUpFee) || 0,
                      procedureFee: Number(feeForm.procedureFee) || 0,
                      currency: settings?.currency ?? "SYP",
                    })
                  }
                >
                  <Save size={14} />
                  {saveSettingsMutation.isPending ? "جاري الحفظ..." : "حفظ الأسعار"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
            <CardTitle className="text-base">سجل الحركات المالية</CardTitle>
            <div className="flex gap-1">
              {(
                [
                  { key: "all", label: "الكل" },
                  { key: "income", label: "إيرادات" },
                  { key: "expense", label: "مصاريف" },
                ] as const
              ).map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilterType(f.key)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs transition",
                    filterType === f.key
                      ? "bg-rx-primary text-white"
                      : "bg-rx-bg-subtle text-rx-muted hover:text-rx-text"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {txLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded-lg bg-rx-bg-subtle"
                  />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <p className="py-8 text-center text-sm text-rx-muted">
                لا توجد حركات مالية في هذه الفترة.
              </p>
            ) : (
              transactions.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  tx={tx}
                  currency={settings?.currency}
                  onEdit={() => openEdit(tx)}
                  onDelete={() => deleteMutation.mutate(tx.id)}
                />
              ))
            )}
            {pagination && pagination.totalPages > 1 ? (
              <Pagination
                pagination={pagination}
                onPageChange={onPageChange}
                onPageSizeChange={onPageSizeChange}
              />
            ) : null}
          </CardContent>
        </Card>
      </PageContent>

      {dialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="mb-4 text-lg font-bold">
              {editing
                ? "تعديل حركة مالية"
                : form.type === "income"
                  ? "تسجيل إيراد"
                  : "تسجيل مصروف"}
            </h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>التصنيف</Label>
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
                  <Label>المبلغ (ل.س)</Label>
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
                  <Label>التاريخ</Label>
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
                <Label>طريقة الدفع</Label>
                <select
                  className="h-10 w-full rounded-lg border border-rx-border bg-white px-3 text-sm"
                  value={form.paymentMethod}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, paymentMethod: e.target.value }))
                  }
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              {form.type === "income" ? (
                <div className="space-y-1.5">
                  <Label>المريض (اختياري)</Label>
                  <select
                    className="h-10 w-full rounded-lg border border-rx-border bg-white px-3 text-sm"
                    value={form.patientId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, patientId: e.target.value }))
                    }
                  >
                    <option value="">— بدون مريض —</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label>ملاحظات</Label>
                <Textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="تفاصيل إضافية..."
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1"
                  disabled={saveTxMutation.isPending || !form.amount}
                  onClick={() => saveTxMutation.mutate()}
                >
                  {saveTxMutation.isPending ? "جاري الحفظ..." : "حفظ"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    setEditing(null);
                  }}
                >
                  إلغاء
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SummaryCard({
  label,
  value,
  currency,
  loading,
  tone,
}: {
  label: string;
  value: number;
  currency?: string;
  loading?: boolean;
  tone: "income" | "expense" | "balance";
}) {
  const Icon =
    tone === "income"
      ? ArrowUpCircle
      : tone === "expense"
        ? ArrowDownCircle
        : Wallet;
  const color =
    tone === "income"
      ? "text-emerald-600"
      : tone === "expense"
        ? "text-rose-600"
        : value >= 0
          ? "text-cyan-700"
          : "text-rose-600";

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs text-rx-muted">{label}</p>
          <p className={cn("mt-1 text-xl font-bold", color)}>
            {loading ? "..." : formatMoney(value, currency)}
          </p>
        </div>
        <Icon size={28} className={cn("opacity-80", color)} />
      </CardContent>
    </Card>
  );
}

function TransactionRow({
  tx,
  currency,
  onEdit,
  onDelete,
}: {
  tx: FinanceTransactionDto;
  currency?: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isIncome = tx.type === "income";
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-rx-border/80 px-3 py-2.5">
      <Badge variant={isIncome ? "default" : "secondary"}>
        {isIncome ? "إيراد" : "مصروف"}
      </Badge>
      <div className="min-w-0 flex-1 text-right">
        <p className="text-sm font-semibold">
          {financeCategoryLabel(tx.type, tx.category)}
          {tx.patient ? ` — ${tx.patient.name}` : ""}
        </p>
        <p className="text-xs text-rx-muted">
          {tx.transactionDate} · {paymentMethodLabel(tx.paymentMethod)}
          {tx.description ? ` · ${tx.description}` : ""}
        </p>
      </div>
      <p
        className={cn(
          "text-sm font-bold",
          isIncome ? "text-emerald-600" : "text-rose-600"
        )}
      >
        {isIncome ? "+" : "-"}
        {formatMoney(tx.amount, currency)}
      </p>
      <div className="flex gap-1">
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
