"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Download, Pill } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContent, PageHeader } from "@/components/ui/page-shell";
import { fetchMedicinesOfflineFirst } from "@/lib/data/offline-api";
import { rxApi, type MedicineDto } from "@/lib/api/rx-client";

export function PharmaceuticalPageClient() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<MedicineDto | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "",
    dosage: "",
    quantity: "",
    period: "",
    timeOfUse: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["medicines", q],
    queryFn: () => fetchMedicinesOfflineFirst(q || undefined),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["default-categories"],
    queryFn: () => rxApi.medicines.defaultCategories(),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        name: form.name,
        type: form.type || null,
        dosage: form.dosage || null,
        quantity: form.quantity || null,
        period: form.period || null,
        timeOfUse: form.timeOfUse || null,
      };
      if (editing) return rxApi.medicines.update(editing.id, body);
      return rxApi.medicines.create(body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      toast.success(editing ? "تم التحديث" : "تمت الإضافة");
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => rxApi.medicines.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      toast.success("تم الحذف");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const importMutation = useMutation({
    mutationFn: (categoryId: number) =>
      rxApi.medicines.includeCategory(categoryId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      toast.success(`تم استيراد ${data.added} دواء`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function resetForm() {
    setForm({
      name: "",
      type: "",
      dosage: "",
      quantity: "",
      period: "",
      timeOfUse: "",
    });
    setEditing(null);
    setShowForm(false);
  }

  function startEdit(medicine: MedicineDto) {
    setEditing(medicine);
    setForm({
      name: medicine.name,
      type: medicine.type ?? "",
      dosage: medicine.dosage ?? "",
      quantity: medicine.quantity ?? "",
      period: medicine.period ?? "",
      timeOfUse: medicine.timeOfUse ?? "",
    });
    setShowForm(true);
  }

  const medicines = data ?? [];

  return (
    <>
      <AppHeader title="مكتبة الأدوية" subtitle={`${medicines.length} دواء`} />
      <PageContent className="space-y-6">
        <PageHeader
          title="إدارة الأدوية"
          description="أضف أدوية مخصصة أو استورد من الكتالوج"
          actions={
            <Button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
            >
              <Plus size={16} />
              دواء جديد
            </Button>
          }
        />

        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="بحث عن دواء..."
          className="max-w-md"
        />

        {categoriesData?.categories && categoriesData.categories.length > 0 && (
          <Card hover>
            <CardHeader>
              <CardTitle>استيراد من الكتالوج</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {categoriesData.categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant="outline"
                  size="sm"
                  disabled={importMutation.isPending}
                  onClick={() => importMutation.mutate(cat.id)}
                >
                  <Download size={14} />
                  {cat.name} ({cat.medicinesCount})
                </Button>
              ))}
            </CardContent>
          </Card>
        )}

        {showForm && (
          <Card hover>
            <CardHeader>
              <CardTitle>{editing ? "تعديل دواء" : "إضافة دواء"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveMutation.mutate();
                }}
              >
                {(
                  [
                    ["name", "الاسم"],
                    ["type", "النوع"],
                    ["dosage", "الجرعة"],
                    ["quantity", "الكمية"],
                    ["period", "المدة"],
                    ["timeOfUse", "وقت الاستخدام"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="space-y-2">
                    <Label>{label}</Label>
                    <Input
                      value={form[key]}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, [key]: e.target.value }))
                      }
                      required={key === "name"}
                    />
                  </div>
                ))}
                <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
                  <Button type="submit" disabled={saveMutation.isPending}>
                    حفظ
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    إلغاء
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 p-6">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : medicines.length === 0 ? (
              <EmptyState
                icon={Pill}
                title="لا توجد أدوية"
                description="أضف دواءً جديداً أو استورد من الكتالوج"
                action={
                  <Button onClick={() => setShowForm(true)}>
                    <Plus size={16} />
                    إضافة دواء
                  </Button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="rx-table w-full text-sm">
                  <thead>
                    <tr className="border-b border-rx-border text-rx-muted">
                      <th className="px-5 py-3.5 text-right font-medium">الاسم</th>
                      <th className="px-5 py-3.5 text-right font-medium">النوع</th>
                      <th className="px-5 py-3.5 text-right font-medium">الجرعة</th>
                      <th className="px-5 py-3.5 text-right font-medium">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rx-border/60">
                    {medicines.map((med) => (
                      <tr key={med.id}>
                        <td className="px-5 py-4 font-semibold">{med.name}</td>
                        <td className="px-5 py-4 text-rx-text-secondary">
                          {med.type ?? "—"}
                        </td>
                        <td className="px-5 py-4 text-rx-text-secondary">
                          {med.dosage ?? "—"}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => startEdit(med)}
                            >
                              <Pencil size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm("حذف هذا الدواء؟")) {
                                  deleteMutation.mutate(med.id);
                                }
                              }}
                            >
                              <Trash2 size={16} className="text-rx-danger" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </PageContent>
    </>
  );
}
