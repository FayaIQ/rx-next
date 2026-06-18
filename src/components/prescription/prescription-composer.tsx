"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileText,
  ImagePlus,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Settings,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/layout/app-header";
import { PageContent } from "@/components/ui/page-shell";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MedicineRowEditor,
  type MedicineRowData,
} from "@/components/prescription/medicine-row-editor";
import { PatientForm } from "@/components/patients/patient-form";
import {
  fetchPatientsOfflineFirst,
  fetchMedicinesOfflineFirst,
  fetchMedicinePresetsOfflineFirst,
  createPrescriptionOffline,
} from "@/lib/data/offline-api";
import {
  rxApi,
  type MedicinePresetDto,
  type PatientDto,
  type PatientFieldDto,
} from "@/lib/api/rx-client";
import { genderLabel, toDateInputValue } from "@/lib/patient-utils";
import {
  firstCoreFieldAfterName,
  patientFieldVisibilityFromSettings,
  type CoreFocusField,
} from "@/lib/patient-core-fields";
import { useMedicineGroups } from "@/lib/medicine-utils";
import { resolveImageUrl } from "@/lib/image-url";
import { mergePresetsFromItems } from "@/lib/medicine-preset-utils";
import { upsertLocalMedicinePresets } from "@/lib/sync/offline-store";

function emptyRow(key = "medicine-row-0"): MedicineRowData {
  return {
    key,
    name: "",
    type: "",
    dosage: "",
    quantity: "",
    period: "",
    timeOfUse: "",
  };
}

function PersonalFieldInputs({
  fields,
  values,
  onChange,
}: {
  fields: PatientFieldDto[];
  values: Record<number, string>;
  onChange: (fieldId: number, value: string) => void;
}) {
  if (fields.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map((field) => (
        <div key={field.id} className="space-y-1">
          <Label>{field.name}</Label>
          <Input
            value={values[field.id] ?? ""}
            onChange={(e) => onChange(field.id, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}

export function PrescriptionComposer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const queryClient = useQueryClient();
  const nextRowKeyRef = useRef(1);
  const diagnosisRef = useRef<HTMLTextAreaElement>(null);
  const pendingPatientSyncRef = useRef<Promise<PatientDto> | null>(null);

  function newEmptyRow() {
    const key = `medicine-row-${nextRowKeyRef.current++}`;
    return emptyRow(key);
  }

  const [prescriptionNumber, setPrescriptionNumber] = useState<number | null>(
    null
  );
  const [prescriptionDate, setPrescriptionDate] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<PatientDto | null>(
    null
  );
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [newPatientInitialName, setNewPatientInitialName] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [items, setItems] = useState<MedicineRowData[]>([emptyRow()]);
  const [activeMedicineRowKey, setActiveMedicineRowKey] = useState<string | null>(
    null
  );
  const [fieldValues, setFieldValues] = useState<Record<number, string>>({});
  const [currentPrescriptionId, setCurrentPrescriptionId] = useState<
    number | null
  >(editId ? Number(editId) : null);
  const [xrayImage, setXrayImage] = useState<string | null>(null);
  const [analysisImage, setAnalysisImage] = useState<string | null>(null);
  const [pendingXray, setPendingXray] = useState<File | null>(null);
  const [pendingAnalysis, setPendingAnalysis] = useState<File | null>(null);

  const { data: patientsData } = useQuery({
    queryKey: ["patients", patientSearch],
    queryFn: () => fetchPatientsOfflineFirst(patientSearch || undefined),
  });

  const { data: medicinesData } = useQuery({
    queryKey: ["medicines"],
    queryFn: () => fetchMedicinesOfflineFirst(),
  });

  const { data: presetsData } = useQuery({
    queryKey: ["medicine-presets"],
    queryFn: () => fetchMedicinePresetsOfflineFirst(),
  });
  const medicinePresets = presetsData ?? [];

  const { data: fieldsData } = useQuery({
    queryKey: ["fields"],
    queryFn: () => rxApi.fields.list(),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: recipeSettingsData } = useQuery({
    queryKey: ["recipe-settings"],
    queryFn: () => rxApi.recipeSettings.get(),
  });

  const patientFieldVisibility = useMemo(
    () =>
      patientFieldVisibilityFromSettings(
        recipeSettingsData?.settings ?? {}
      ),
    [recipeSettingsData]
  );

  const newPatientAutoFocus = useMemo((): CoreFocusField | undefined => {
    if (!newPatientInitialName.trim()) return "name";
    const next = firstCoreFieldAfterName(patientFieldVisibility);
    return next === "submit" ? undefined : next;
  }, [newPatientInitialName, patientFieldVisibility]);

  const { data: editData } = useQuery({
    queryKey: ["prescription", editId],
    queryFn: () => rxApi.prescriptions.get(Number(editId)),
    enabled: !!editId,
  });

  useEffect(() => {
    if (!editId) {
      setPrescriptionDate((current) =>
        current || toDateInputValue(new Date())
      );
    }
  }, [editId]);

  useEffect(() => {
    if (!editId) {
      rxApi.prescriptions.nextNumber().then((d) => {
        setPrescriptionNumber(d.prescriptionNumber);
      });
    }
  }, [editId]);

  useEffect(() => {
    if (!editData?.prescription) return;
    const p = editData.prescription;
    setCurrentPrescriptionId(p.id);
    setPrescriptionNumber(p.prescriptionNumber);
    setPrescriptionDate(toDateInputValue(p.prescriptionDate));
    setDiagnosis(p.diagnosis ?? "");
    setItems(
      p.items.length
        ? p.items.map((item) => ({
            id: item.id,
            key: String(item.id),
            name: item.name,
            type: item.type ?? "",
            dosage: item.dosage ?? "",
            quantity: item.quantity ?? "",
            period: item.period ?? "",
            timeOfUse: item.timeOfUse ?? "",
          }))
        : [emptyRow()]
    );
    const fv: Record<number, string> = {};
    p.fieldValues.forEach((f) => {
      fv[f.patientFieldId] = f.value;
    });
    setFieldValues(fv);
    setXrayImage(p.xrayImage ?? null);
    setAnalysisImage(p.analysisImage ?? null);
    if (p.patient) setSelectedPatient(p.patient);
  }, [editData]);

  const personalFields = useMemo(
    () => fieldsData?.fields.filter((f) => f.isActive && f.isPersonal) ?? [],
    [fieldsData]
  );

  const recipeFields = useMemo(
    () => fieldsData?.fields.filter((f) => f.isActive && !f.isPersonal) ?? [],
    [fieldsData]
  );

  const saveMutation = useMutation({
    mutationFn: async (action: "save" | "save_and_print") => {
      if (!selectedPatient) throw new Error("اختر مريضاً");

      let patientId = selectedPatient.id;
      if (!patientId && pendingPatientSyncRef.current) {
        const synced = await pendingPatientSyncRef.current;
        patientId = synced.id;
        setSelectedPatient(synced);
        setPatientSearch(synced.name);
      }
      if (!patientId) {
        throw new Error("جاري حفظ المريض، انتظر لحظة...");
      }

      const savedItems = items
        .filter((i) => i.name.trim())
        .map((i) => ({
          id: i.id,
          name: i.name,
          type: i.type || null,
          dosage: i.dosage || null,
          quantity: i.quantity || null,
          period: i.period || null,
          timeOfUse: i.timeOfUse || null,
        }));
      const payload = {
        patientId,
        prescriptionDate: new Date(prescriptionDate).toISOString(),
        diagnosis: diagnosis || null,
        items: savedItems,
        fieldValues: Object.entries(fieldValues)
          .filter(([, v]) => v.trim())
          .map(([patientFieldId, value]) => ({
            patientFieldId: Number(patientFieldId),
            value,
          })),
      };

      if (payload.items.length === 0) {
        throw new Error("أضف دواءً واحداً على الأقل");
      }

      const result = currentPrescriptionId
        ? await rxApi.prescriptions.update(currentPrescriptionId, payload)
        : await createPrescriptionOffline(payload);

      return {
        action,
        result,
        savedItems,
        xrayFile: pendingXray,
        analysisFile: pendingAnalysis,
      };
    },
    onSuccess: ({
      action,
      result,
      savedItems,
      xrayFile,
      analysisFile,
    }) => {
      const rx = result.prescription as {
        id: number;
        prescriptionNumber?: number | null;
        localId?: string;
      };

      if (rx.id) {
        setCurrentPrescriptionId(rx.id);
        if (action === "save_and_print") {
          router.push(`/prescriptions/${rx.id}/print`);
        }
      } else {
        toast.info("حُفظت الوصفة أوفلاين وستُزامَن عند عودة الاتصال");
      }
      if (rx.prescriptionNumber) {
        setPrescriptionNumber(rx.prescriptionNumber);
      }
      toast.success("تم حفظ الوصفة");

      queryClient.setQueryData<MedicinePresetDto[]>(
        ["medicine-presets"],
        (current) =>
          mergePresetsFromItems(current ?? [], savedItems, selectedPatient?.doctorId)
      );
      void upsertLocalMedicinePresets(savedItems);
      void queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      void queryClient.invalidateQueries({ queryKey: ["patients"] });
      void fetchMedicinePresetsOfflineFirst().then((fresh) => {
        queryClient.setQueryData(["medicine-presets"], fresh);
      });

      if (rx.id && xrayFile) {
        void rxApi.prescriptions
          .uploadImage(rx.id, "xray", xrayFile)
          .then((uploaded) => {
            setXrayImage(uploaded.path);
            setPendingXray(null);
          })
          .catch((e: Error) => toast.error(e.message));
      }
      if (rx.id && analysisFile) {
        void rxApi.prescriptions
          .uploadImage(rx.id, "analysis", analysisFile)
          .then((uploaded) => {
            setAnalysisImage(uploaded.path);
            setPendingAnalysis(null);
          })
          .catch((e: Error) => toast.error(e.message));
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function selectPatient(
    patient: PatientDto,
    options?: { focusDiagnosis?: boolean }
  ) {
    setSelectedPatient(patient);
    setPatientSearch(patient.name);
    setShowNewPatient(false);
    setNewPatientInitialName("");
    if (patient.diagnosis) {
      toast.info(`آخر تشخيص: ${patient.diagnosis}`, { duration: 4000 });
    }
    if (options?.focusDiagnosis) {
      requestAnimationFrame(() => diagnosisRef.current?.focus());
    }
  }

  function findPatientByExactName(name: string) {
    const q = name.trim().toLowerCase();
    if (!q) return undefined;
    const list = patientsData ?? [];
    return list.find((p) => p.name.trim().toLowerCase() === q);
  }

  function startNewPatientFromSearch(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSelectedPatient(null);
    setNewPatientInitialName(trimmed);
    setShowNewPatient(true);
    toast.info("مريض جديد — أكمل البيانات ثم اضغط إضافة");
  }

  function handlePatientSearchEnter() {
    const q = patientSearch.trim();
    if (!q) return;

    const exact = findPatientByExactName(q);
    if (exact) {
      selectPatient(exact, { focusDiagnosis: true });
      return;
    }

    startNewPatientFromSearch(q);
  }

  function resetComposer() {
    setCurrentPrescriptionId(null);
    setSelectedPatient(null);
    setPatientSearch("");
    setDiagnosis("");
    nextRowKeyRef.current = 1;
    setItems([emptyRow()]);
    setFieldValues({});
    setXrayImage(null);
    setAnalysisImage(null);
    setPendingXray(null);
    setPendingAnalysis(null);
    setPrescriptionDate(toDateInputValue(new Date()));
    setShowNewPatient(false);
    setNewPatientInitialName("");
    pendingPatientSyncRef.current = null;
    setActiveMedicineRowKey(null);
    router.replace("/home");
    rxApi.prescriptions.nextNumber().then((d) => {
      setPrescriptionNumber(d.prescriptionNumber);
    });
  }

  const patients = patientsData ?? [];
  const medicines = medicinesData ?? [];
  const medicineGroups = useMedicineGroups(medicines);

  return (
    <>
      <AppHeader title="كتابة الوصفة" subtitle="وصفة طبية جديدة" />
      <PageContent wide className="space-y-5 pb-8">
        {/* Workbar */}
        <Card hover>
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1">
                <Label>رقم الوصفة</Label>
                <Input
                  value={prescriptionNumber ?? "—"}
                  readOnly
                  className="bg-rx-bg-subtle font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label>التاريخ والوقت</Label>
                <Input
                  type="datetime-local"
                  value={prescriptionDate}
                  onChange={(e) => setPrescriptionDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/prescriptions">
                  <FileText size={16} />
                  سجل الوصفات
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/recipe-settings">
                  <Settings size={16} />
                  إعدادات الوصفة
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Patient */}
        <Card hover>
          <CardHeader>
            <CardTitle>بيانات المريض</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <Label>اختر مريضاً</Label>
                <SearchInput
                  placeholder="ابحث بالاسم... (Enter لإضافة مريض جديد)"
                  value={patientSearch}
                  onChange={(v) => {
                    setPatientSearch(v);
                    setSelectedPatient(null);
                    if (showNewPatient) {
                      setShowNewPatient(false);
                      setNewPatientInitialName("");
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handlePatientSearchEnter();
                    }
                  }}
                />
                {patientSearch.trim() && !selectedPatient && !showNewPatient && (
                  <p className="text-xs text-rx-muted">
                    {findPatientByExactName(patientSearch)
                      ? "اضغط Enter لاختيار المريض"
                      : patients.length > 0
                        ? "لا تطابق تام — Enter لإضافة مريض جديد"
                        : "Enter لإضافة هذا الاسم كمريض جديد"}
                  </p>
                )}
                {patientSearch && !selectedPatient && !showNewPatient && patients.length > 0 && (
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-rx-border bg-rx-surface shadow-lg">
                    {patients.slice(0, 8).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="block w-full border-b border-rx-border/40 px-4 py-3 text-right text-sm transition-colors last:border-0 hover:bg-rx-primary-light"
                        onClick={() => selectPatient(p)}
                      >
                        <span className="font-medium">{p.name}</span>
                        <span className="mx-2 text-rx-muted">
                          {genderLabel(p.gender)} — {p.age}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setNewPatientInitialName(patientSearch.trim());
                    setShowNewPatient(true);
                  }}
                >
                  <Plus size={16} />
                  مريض جديد
                </Button>
              </div>
            </div>

            {showNewPatient && (
              <div className="rounded-xl border border-dashed border-rx-primary/40 bg-rx-primary-light/20 p-5">
                <p className="mb-3 text-sm font-medium text-rx-text">
                  إضافة مريض جديد
                </p>
                <PatientForm
                  key={newPatientInitialName || "new-patient"}
                  compact
                  initialName={newPatientInitialName}
                  autoFocusField={newPatientAutoFocus}
                  fieldVisibility={patientFieldVisibility}
                  onSuccess={(p) => {
                    selectPatient(p, { focusDiagnosis: true });
                  }}
                  onSyncStart={(promise) => {
                    pendingPatientSyncRef.current = promise;
                  }}
                  onPatientSynced={(real) => {
                    pendingPatientSyncRef.current = null;
                    setSelectedPatient(real);
                    setPatientSearch(real.name);
                  }}
                  onCancel={() => {
                    pendingPatientSyncRef.current = null;
                    setShowNewPatient(false);
                    setNewPatientInitialName("");
                  }}
                />
                {personalFields.length > 0 && (
                  <div className="mt-4 space-y-2 border-t border-dashed border-rx-primary/30 pt-4">
                    <p className="text-sm font-medium text-rx-text">
                      حقول إضافية
                    </p>
                    <PersonalFieldInputs
                      fields={personalFields}
                      values={fieldValues}
                      onChange={(fieldId, value) =>
                        setFieldValues((fv) => ({ ...fv, [fieldId]: value }))
                      }
                    />
                  </div>
                )}
              </div>
            )}

            {selectedPatient && (
              <div className="grid gap-3 rounded-xl bg-rx-bg-subtle p-4 text-sm sm:grid-cols-4">
                <div>
                  <span className="text-rx-muted">الاسم: </span>
                  {selectedPatient.name}
                </div>
                {patientFieldVisibility.showGender && (
                  <div>
                    <span className="text-rx-muted">الجنس: </span>
                    {genderLabel(selectedPatient.gender)}
                  </div>
                )}
                {patientFieldVisibility.showAge && (
                  <div>
                    <span className="text-rx-muted">العمر: </span>
                    {selectedPatient.age}
                  </div>
                )}
                {patientFieldVisibility.showPhone && selectedPatient.phone && (
                  <div>
                    <span className="text-rx-muted">الهاتف: </span>
                    <span dir="ltr">{selectedPatient.phone}</span>
                  </div>
                )}
                <div>
                  <span className="text-rx-muted">الزيارات: </span>
                  {selectedPatient.visitCount}
                </div>
              </div>
            )}

            {selectedPatient && personalFields.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-rx-text">حقول إضافية</p>
                <PersonalFieldInputs
                  fields={personalFields}
                  values={fieldValues}
                  onChange={(fieldId, value) =>
                    setFieldValues((fv) => ({ ...fv, [fieldId]: value }))
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recipe fields */}
        {recipeFields.length > 0 && (
          <Card hover>
            <CardHeader>
              <CardTitle>حقول الوصفة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                {recipeFields.map((field) => (
                  <div key={field.id} className="space-y-1">
                    <Label>{field.name}</Label>
                    <Input
                      value={fieldValues[field.id] ?? ""}
                      onChange={(e) =>
                        setFieldValues((fv) => ({
                          ...fv,
                          [field.id]: e.target.value,
                        }))
                      }
                      placeholder={
                        field.isPrintable ? "يُطبع على الوصفة" : undefined
                      }
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Diagnosis */}
        <Card hover>
          <CardHeader>
            <CardTitle>التشخيص</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              ref={diagnosisRef}
              rows={3}
              placeholder="اكتب التشخيص..."
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Medicines */}
        <Card hover>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>الأدوية</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setItems((rows) => [...rows, newEmptyRow()])}
            >
              <Plus size={16} />
              صف جديد
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((row) => (
              <MedicineRowEditor
                key={row.key}
                row={row}
                rowKey={row.key}
                groups={medicineGroups}
                presets={medicinePresets}
                isOpen={activeMedicineRowKey === row.key}
                onOpen={() => setActiveMedicineRowKey(row.key)}
                onClose={() => setActiveMedicineRowKey(null)}
                onChange={(updated) =>
                  setItems((rows) =>
                    rows.map((r) => (r.key === row.key ? updated : r))
                  )
                }
                onRemove={() =>
                  setItems((rows) => rows.filter((r) => r.key !== row.key))
                }
                canRemove={items.length > 1}
              />
            ))}
          </CardContent>
        </Card>

        {/* Attachments */}
        <Card hover>
          <CardHeader>
            <CardTitle>مرفقات (أشعة / تحليل)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {(
              [
                {
                  label: "صورة الأشعة",
                  kind: "xray" as const,
                  path: xrayImage,
                  pending: pendingXray,
                  setPath: setXrayImage,
                  setPending: setPendingXray,
                },
                {
                  label: "صورة التحليل",
                  kind: "analysis" as const,
                  path: analysisImage,
                  pending: pendingAnalysis,
                  setPath: setAnalysisImage,
                  setPending: setPendingAnalysis,
                },
              ] as const
            ).map(({ label, kind, path, pending, setPath, setPending }) => (
              <div key={kind} className="space-y-2 rounded-xl border border-rx-border/80 bg-rx-bg-subtle/30 p-4">
                <Label>{label}</Label>
                {(path || pending) && (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        pending
                          ? URL.createObjectURL(pending)
                          : (resolveImageUrl(path) ?? "")
                      }
                      alt={label}
                      className="max-h-40 rounded border object-contain"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="absolute left-1 top-1 bg-white/80"
                      onClick={async () => {
                        if (currentPrescriptionId && path) {
                          try {
                            await rxApi.prescriptions.deleteImage(
                              currentPrescriptionId,
                              kind
                            );
                          } catch (e) {
                            toast.error(
                              e instanceof Error ? e.message : "فشل الحذف"
                            );
                            return;
                          }
                        }
                        setPath(null);
                        setPending(null);
                      }}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) {
                      toast.error("الحد الأقصى 2 ميغابايت");
                      return;
                    }
                    if (currentPrescriptionId) {
                      try {
                        const res = await rxApi.prescriptions.uploadImage(
                          currentPrescriptionId,
                          kind,
                          file
                        );
                        setPath(res.path);
                        setPending(null);
                        toast.success("تم رفع الصورة");
                      } catch (err) {
                        toast.error(
                          err instanceof Error ? err.message : "فشل الرفع"
                        );
                      }
                    } else {
                      setPending(file);
                      toast.info("ستُرفع الصورة عند حفظ الوصفة");
                    }
                  }}
                />
                {!currentPrescriptionId && pending && (
                  <p className="text-xs text-rx-muted">
                    <ImagePlus size={12} className="inline" /> ستُرفع عند الحفظ
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Actions — sticky bar */}
        <div className="sticky bottom-4 z-10 flex flex-wrap gap-2 rounded-2xl border border-rx-border/80 bg-rx-surface/95 p-4 shadow-lg backdrop-blur-sm">
          <Button
            size="lg"
            onClick={() => saveMutation.mutate("save")}
            disabled={saveMutation.isPending}
          >
            <Save size={16} />
            حفظ
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => saveMutation.mutate("save_and_print")}
            disabled={saveMutation.isPending}
          >
            <Printer size={16} />
            حفظ وطباعة
          </Button>
          {currentPrescriptionId && (
            <Button variant="outline" asChild>
              <Link href={`/prescriptions/${currentPrescriptionId}/preview`}>
                معاينة
              </Link>
            </Button>
          )}
          <Button variant="ghost" onClick={resetComposer}>
            <RotateCcw size={16} />
            وصفة جديدة
          </Button>
        </div>
      </PageContent>
    </>
  );
}
