"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  Download,
  Pill,
  X,
  ChevronDown,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContent } from "@/components/ui/page-shell";
import { TablePageLoading } from "@/components/ui/page-loading";
import { Pagination } from "@/components/ui/pagination";
import { usePaginationState } from "@/hooks/use-pagination-state";
import {
  MedicineForm,
  emptyMedicineForm,
  medicineToFormValues,
  type MedicineFormValues,
} from "@/components/medicines/medicine-form";
import { fetchMedicinesPaginated } from "@/lib/data/offline-api";
import { rxApi, type MedicineDto } from "@/lib/api/rx-client";
import { cn } from "@/lib/utils";
import { useLocale, type TranslateFn } from "@/i18n/locale-provider";

function MedicineMeta({
  medicine,
  t,
}: {
  medicine: MedicineDto;
  t: TranslateFn;
}) {
  const items = [
    medicine.type && { label: t("medicines.metaType"), value: medicine.type },
    medicine.dosage && {
      label: t("medicines.metaDosage"),
      value: medicine.dosage,
    },
    medicine.quantity && {
      label: t("medicines.metaQuantity"),
      value: medicine.quantity,
    },
    medicine.period && {
      label: t("medicines.metaPeriod"),
      value: medicine.period,
    },
    medicine.timeOfUse && {
      label: t("medicines.metaTimeOfUse"),
      value: medicine.timeOfUse,
    },
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  if (items.length === 0) {
    return (
      <p className="text-xs text-rx-muted">{t("medicines.noExtraDetails")}</p>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Badge key={item.label} variant="secondary" className="font-normal">
          <span className="text-rx-muted">{item.label}:</span>{" "}
          <span className="text-rx-text">{item.value}</span>
        </Badge>
      ))}
    </div>
  );
}

function MedicineRow({
  medicine,
  onEdit,
  onDelete,
  deletePending,
  t,
}: {
  medicine: MedicineDto;
  onEdit: (m: MedicineDto) => void;
  onDelete: (id: number) => void;
  deletePending: boolean;
  t: TranslateFn;
}) {
  return (
    <div className="flex flex-col gap-3 p-4 transition-colors hover:bg-rx-bg-subtle/50 sm:flex-row sm:items-start sm:justify-between sm:p-5">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-rx-primary-light text-rx-primary">
            <Pill size={16} />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-rx-text">{medicine.name}</p>
            <div className="mt-2">
              <MedicineMeta medicine={medicine} t={t} />
            </div>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 gap-2 sm:flex-col sm:items-stretch">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 sm:flex-none"
          onClick={() => onEdit(medicine)}
        >
          <Pencil size={14} />
          {t("medicines.edit")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-rx-danger hover:bg-red-50 hover:text-rx-danger sm:flex-none"
          disabled={deletePending}
          onClick={() => {
            if (
              confirm(t("medicines.deleteConfirm", { name: medicine.name }))
            ) {
              onDelete(medicine.id);
            }
          }}
        >
          <Trash2 size={14} />
          {t("medicines.delete")}
        </Button>
      </div>
    </div>
  );
}

export function PharmaceuticalPageClient() {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<MedicineDto | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [importingId, setImportingId] = useState<number | null>(null);
  const [form, setForm] = useState<MedicineFormValues>(emptyMedicineForm);
  const { page, pageSize, onPageChange, onPageSizeChange } =
    usePaginationState(q);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["medicines", q, page, pageSize],
    queryFn: () => fetchMedicinesPaginated(q || undefined, page, pageSize),
    placeholderData: keepPreviousData,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["default-categories"],
    queryFn: () => rxApi.medicines.defaultCategories(),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        name: form.name.trim(),
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
      toast.success(
        editing ? t("medicines.updated") : t("medicines.added")
      );
      closeForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => rxApi.medicines.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      toast.success(t("medicines.deleted"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const importMutation = useMutation({
    mutationFn: (categoryId: number) => {
      setImportingId(categoryId);
      return rxApi.medicines.includeCategory(categoryId);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      toast.success(t("medicines.imported", { count: data.added }));
      setCatalogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setImportingId(null),
  });

  const categories = categoriesData?.categories ?? [];
  const hasCatalog = categories.length > 0;

  function openCreateForm() {
    setEditing(null);
    setForm(emptyMedicineForm);
    setFormOpen(true);
  }

  function openEditForm(medicine: MedicineDto) {
    setEditing(medicine);
    setForm(medicineToFormValues(medicine));
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setForm(emptyMedicineForm);
  }

  useEffect(() => {
    if (!formOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeForm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [formOpen]);

  const medicines = data?.medicines ?? [];
  const pagination = data?.pagination;
  const total = pagination?.total ?? medicines.length;

  const subtitle = useMemo(() => {
    if (q.trim()) return t("medicines.searchCount", { count: total });
    return t("medicines.libraryCount", { count: total });
  }, [q, total, t]);

  if (isLoading && !data) {
    return <TablePageLoading />;
  }

  return (
    <>
      <AppHeader title={t("medicines.title")} subtitle={subtitle} />

      <PageContent className="space-y-4">
        <Card className="overflow-hidden">
          <CardHeader className="space-y-4 border-b border-rx-border/80 bg-rx-bg-subtle/30 px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <SearchInput
                value={q}
                onChange={setQ}
                placeholder={t("medicines.searchPlaceholder")}
                className="w-full sm:max-w-md sm:flex-1"
              />
              <div className="flex flex-wrap gap-2">
                {hasCatalog && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCatalogOpen((v) => !v)}
                    aria-expanded={catalogOpen}
                  >
                    <Package size={15} />
                    {t("medicines.importCatalog")}
                    <ChevronDown
                      size={14}
                      className={cn(
                        "transition-transform",
                        catalogOpen && "rotate-180"
                      )}
                    />
                  </Button>
                )}
                <Button size="sm" onClick={openCreateForm}>
                  <Plus size={15} />
                  {t("medicines.newMedicine")}
                </Button>
              </div>
            </div>

            {catalogOpen && hasCatalog && (
              <div className="rounded-xl border border-rx-border bg-rx-surface p-3">
                <p className="mb-2 text-xs text-rx-muted">
                  {t("medicines.catalogHint")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <Button
                      key={cat.id}
                      variant="secondary"
                      size="sm"
                      disabled={importMutation.isPending}
                      onClick={() => importMutation.mutate(cat.id)}
                    >
                      <Download size={14} />
                      {cat.name}
                      <Badge variant="outline" className="mr-1">
                        {cat.medicinesCount}
                      </Badge>
                      {importingId === cat.id && (
                        <span className="text-xs text-rx-muted">...</span>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent className="p-0">
            {isFetching && !isLoading && (
              <div className="h-0.5 w-full overflow-hidden bg-rx-border/40">
                <div className="h-full w-1/3 animate-pulse bg-rx-primary" />
              </div>
            )}

            {medicines.length === 0 ? (
              <EmptyState
                icon={Pill}
                title={
                  q.trim()
                    ? t("medicines.emptySearchTitle")
                    : t("medicines.emptyLibraryTitle")
                }
                description={
                  q.trim()
                    ? t("medicines.emptySearchDesc")
                    : t("medicines.emptyLibraryDesc")
                }
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button onClick={openCreateForm}>
                      <Plus size={16} />
                      {t("medicines.addMedicine")}
                    </Button>
                    {hasCatalog && (
                      <Button
                        variant="outline"
                        onClick={() => setCatalogOpen(true)}
                      >
                        <Download size={16} />
                        {t("medicines.importCatalog")}
                      </Button>
                    )}
                  </div>
                }
              />
            ) : (
              <>
                <div className="divide-y divide-rx-border/60">
                  {medicines.map((med) => (
                    <MedicineRow
                      key={med.id}
                      medicine={med}
                      onEdit={openEditForm}
                      onDelete={(id) => deleteMutation.mutate(id)}
                      deletePending={deleteMutation.isPending}
                      t={t}
                    />
                  ))}
                </div>
                {pagination && (
                  <Pagination
                    pagination={pagination}
                    onPageChange={onPageChange}
                    onPageSizeChange={onPageSizeChange}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </PageContent>

      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-3 backdrop-blur-[2px] sm:items-center sm:p-4"
          onClick={closeForm}
        >
          <Card
            className="max-h-[min(92vh,44rem)] w-full max-w-lg overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-rx-border/80 pb-3">
              <CardTitle className="text-base">
                {editing
                  ? t("medicines.editMedicine")
                  : t("medicines.addNewMedicine")}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={closeForm}
                aria-label={t("medicines.close")}
              >
                <X size={16} />
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              <MedicineForm
                values={form}
                onChange={setForm}
                editing={editing}
                pending={saveMutation.isPending}
                onSubmit={() => saveMutation.mutate()}
                onCancel={closeForm}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
