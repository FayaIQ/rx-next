"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileText,
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
import { Textarea } from "@/components/ui/textarea";
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
  updatePrescriptionOffline,
} from "@/lib/data/offline-api";
import {
  rxApi,
  type MedicinePresetDto,
  type PatientDto,
  type PatientFieldDto,
  type PrescriptionDto,
} from "@/lib/api/rx-client";
import {
  formatPrescriptionDateTime,
  genderLabel,
  toDateInputValue,
  visitCountLabel,
} from "@/lib/patient-utils";
import { normalizeRecipeSettingsDto } from "@/lib/recipe-settings";
import {
  firstCoreFieldAfterName,
  patientFieldVisibilityFromSettings,
  type CoreFocusField,
} from "@/lib/patient-core-fields";
import {
  activePersonalFields,
  activeRecipeFields,
  normalizePatientFieldsArray,
} from "@/lib/patient-field-display";
import { useMedicineGroups } from "@/lib/medicine-utils";
import { resolveImageUrl } from "@/lib/image-url";
import { mergePresetsFromItems } from "@/lib/medicine-preset-utils";
import { upsertLocalMedicinePresets, upsertLocalMedicinesFromPrescription, syncLocalPrescriptionFromDto } from "@/lib/sync/offline-store";
import { queryKeys } from "@/lib/query-keys";
import { useFieldsOnlyTab } from "@/lib/fields-only-tab";
import { buildPrescriptionPreviewData } from "@/lib/prescription-preview-data";
import { PrescriptionLivePreview } from "@/components/prescription/prescription-live-preview";
import { DoctorQueuePanel } from "@/components/waiting-room/doctor-queue-panel";
import { TodayTreatmentSessionsPanel } from "@/components/treatment/today-sessions-panel";

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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="rx-label">{children}</label>;
}

function PersonalFieldInputs({
  fields,
  values,
  onChange,
  dense = false,
}: {
  fields: PatientFieldDto[];
  values: Record<number, string>;
  onChange: (fieldId: number, value: string) => void;
  dense?: boolean;
}) {
  if (fields.length === 0) return null;

  return (
    <div
      className={
        dense
          ? "grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-3 lg:grid-cols-4"
          : "grid gap-3 sm:grid-cols-2"
      }
    >
      {fields.map((field) => (
        <div key={field.id} className={dense ? "space-y-0.5" : "space-y-1"}>
          <FieldLabel>{field.name}</FieldLabel>
          <Input
            fieldSize="compact"
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
  const preselectPatientId = searchParams.get("patientId");
  const queryClient = useQueryClient();
  const nextRowKeyRef = useRef(1);
  const diagnosisRef = useRef<HTMLTextAreaElement>(null);
  const composerRootRef = useRef<HTMLDivElement>(null);
  const pendingPatientSyncRef = useRef<Promise<PatientDto> | null>(null);

  useFieldsOnlyTab(composerRootRef);

  function newEmptyRow() {
    const key = `medicine-row-${nextRowKeyRef.current++}`;
    return emptyRow(key);
  }

  function focusMedicineRowName(rowKey: string) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.querySelector(
          `[data-rx-medicine-row="${rowKey}"][data-rx-medicine-field="name"]`
        ) as HTMLInputElement | null;
        el?.focus();
      });
    });
  }

  function addMedicineRowAndFocus() {
    const newRow = newEmptyRow();
    setItems((rows) => [...rows, newRow]);
    setActiveMedicineRowKey(newRow.key);
    focusMedicineRowName(newRow.key);
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
    queryKey: queryKeys.fieldsRecipe.all,
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

  const editPatientId = editData?.prescription?.patientId;
  const { data: editPatientData } = useQuery({
    queryKey: ["patient", editPatientId],
    queryFn: () => rxApi.patients.get(editPatientId!),
    enabled: !!editPatientId,
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
    const personalIds = new Set(
      normalizePatientFieldsArray(fieldsData)
        .filter((f) => f.isPersonal)
        .map((f) => f.id)
    );
    p.fieldValues.forEach((f) => {
      if (!personalIds.has(f.patientFieldId)) {
        fv[f.patientFieldId] = f.value;
      }
    });
    setFieldValues(fv);
    setXrayImage(p.xrayImage ?? null);
    setAnalysisImage(p.analysisImage ?? null);
    if (p.patient) {
      setPatientSearch(p.patient.name);
    }
  }, [editData, fieldsData]);

  useEffect(() => {
    if (!editPatientData?.patient) return;
    setSelectedPatient(editPatientData.patient);
    setPatientSearch(editPatientData.patient.name);
  }, [editPatientData]);

  const { data: preselectPatientData } = useQuery({
    queryKey: ["patient", "preselect", preselectPatientId],
    queryFn: () => rxApi.patients.get(Number(preselectPatientId)),
    enabled: !!preselectPatientId && !editId,
  });

  const personalFields = useMemo(
    () => activePersonalFields(fieldsData),
    [fieldsData]
  );

  const recipeFields = useMemo(
    () => activeRecipeFields(fieldsData),
    [fieldsData]
  );

  const recipeFieldIds = useMemo(
    () => new Set(recipeFields.map((f) => f.id)),
    [recipeFields]
  );

  const personalFieldLabels = useMemo(() => {
    const map = new Map<number, string>();
    for (const field of personalFields) map.set(field.id, field.name);
    return map;
  }, [personalFields]);

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
          .filter(([id, v]) => v.trim() && recipeFieldIds.has(Number(id)))
          .map(([patientFieldId, value]) => ({
            patientFieldId: Number(patientFieldId),
            value,
          })),
      };

      if (payload.items.length === 0) {
        throw new Error("أضف دواءً واحداً على الأقل");
      }

      const result = currentPrescriptionId
        ? await updatePrescriptionOffline(currentPrescriptionId, payload)
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
      void upsertLocalMedicinesFromPrescription(savedItems);
      if (rx.id) {
        void syncLocalPrescriptionFromDto(rx as PrescriptionDto);
      }
      void queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      void queryClient.invalidateQueries({ queryKey: ["patients"] });
      void queryClient.invalidateQueries({ queryKey: ["medicines"] });
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

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (!saveMutation.isPending) {
          saveMutation.mutate("save");
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [saveMutation]);

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

  useEffect(() => {
    if (!preselectPatientData?.patient || editId) return;
    selectPatient(preselectPatientData.patient, { focusDiagnosis: true });
  }, [preselectPatientData, editId]);

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

    const matches = patientsData ?? [];
    if (matches.length > 0) {
      selectPatient(matches[0]!, { focusDiagnosis: true });
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
  const recipeSettings = useMemo(
    () =>
      recipeSettingsData?.settings
        ? normalizeRecipeSettingsDto(recipeSettingsData.settings)
        : null,
    [recipeSettingsData]
  );

  const livePreviewData = useMemo(() => {
    if (!recipeSettings) return null;
    return buildPrescriptionPreviewData({
      settings: recipeSettings,
      prescriptionNumber,
      prescriptionDate,
      patientName: selectedPatient?.name ?? patientSearch,
      patientGender: selectedPatient?.gender ?? "male",
      patientBirthdate: selectedPatient?.birthdate ?? null,
      patientPhone: selectedPatient?.phone ?? undefined,
      diagnosis,
      items,
      recipeFields,
      fieldValues,
      xrayImage,
      analysisImage,
    });
  }, [
    recipeSettings,
    prescriptionNumber,
    prescriptionDate,
    selectedPatient,
    patientSearch,
    diagnosis,
    items,
    recipeFields,
    fieldValues,
    xrayImage,
    analysisImage,
  ]);

  const attachmentsSection = (
    <section className="rx-section space-y-2 text-sm">
      <FieldLabel>مرفقات (أشعة / تحليل)</FieldLabel>
      <div className="grid gap-2 sm:grid-cols-2">
        {(
          [
            {
              label: "أشعة",
              kind: "xray" as const,
              path: xrayImage,
              pending: pendingXray,
              setPath: setXrayImage,
              setPending: setPendingXray,
            },
            {
              label: "تحليل",
              kind: "analysis" as const,
              path: analysisImage,
              pending: pendingAnalysis,
              setPath: setAnalysisImage,
              setPending: setPendingAnalysis,
            },
          ] as const
        ).map(({ label, kind, path, pending, setPath, setPending }) => (
          <div key={kind} className="space-y-1">
            <FieldLabel>{label}</FieldLabel>
            {(path || pending) && (
              <div className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    pending
                      ? URL.createObjectURL(pending)
                      : (resolveImageUrl(path) ?? "")
                  }
                  alt={label}
                  className="max-h-24 rounded border object-contain"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  tabIndex={-1}
                  className="absolute left-0 top-0 size-6 bg-white/80"
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
                  <X size={12} />
                </Button>
              </div>
            )}
            <Input
              type="file"
              accept="image/*"
              fieldSize="compact"
              className="py-1 text-xs file:mr-2 file:rounded file:border-0 file:bg-rx-bg-subtle file:px-2 file:text-xs"
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
                  toast.info("ستُرفع عند الحفظ");
                }
              }}
            />
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <div ref={composerRootRef}>
      <AppHeader
        title="كتابة الوصفة"
        subtitle={editId ? "تعديل وصفة" : "وصفة جديدة"}
        meta={
          <span className="hidden text-xs text-rx-muted sm:inline">
            <span className="font-mono font-medium text-rx-text">
              #{prescriptionNumber ?? "—"}
            </span>
            <span className="mx-1.5 opacity-50">·</span>
            {formatPrescriptionDateTime(prescriptionDate)}
          </span>
        }
        actions={
          <>
            <Button
              size="sm"
              tabIndex={-1}
              onClick={() => saveMutation.mutate("save")}
              disabled={saveMutation.isPending}
            >
              <Save size={14} />
              حفظ
            </Button>
            <Button
              size="sm"
              variant="outline"
              tabIndex={-1}
              onClick={() => saveMutation.mutate("save_and_print")}
              disabled={saveMutation.isPending}
            >
              <Printer size={14} />
              طباعة
            </Button>
            {currentPrescriptionId && (
              <Button size="sm" variant="outline" asChild>
                <Link
                  tabIndex={-1}
                  href={`/prescriptions/${currentPrescriptionId}/preview`}
                >
                  معاينة
                </Link>
              </Button>
            )}
            <Button size="sm" variant="ghost" tabIndex={-1} onClick={resetComposer}>
              <RotateCcw size={14} />
            </Button>
            <span className="hidden h-4 w-px bg-rx-border lg:inline" />
            <Button variant="ghost" size="sm" asChild className="hidden lg:inline-flex">
              <Link tabIndex={-1} href="/prescriptions">
                <FileText size={14} />
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className="hidden lg:inline-flex">
              <Link tabIndex={-1} href="/recipe-settings">
                <Settings size={14} />
              </Link>
            </Button>
          </>
        }
      />
      <PageContent wide className="px-3 py-2 pb-3 lg:px-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(260px,380px)_minmax(0,1fr)] xl:items-start">
        <div className="rx-prescription-sheet min-w-0 space-y-0 xl:col-start-2">
        <TodayTreatmentSessionsPanel
          onSelectPatient={async (patientId) => {
            try {
              const { patient } = await rxApi.patients.get(patientId);
              selectPatient(patient, { focusDiagnosis: true });
            } catch {
              toast.error("تعذّر تحميل بيانات المريض");
            }
          }}
        />
        <DoctorQueuePanel
          onSelectPatient={async (patientId) => {
            try {
              const { patient } = await rxApi.patients.get(patientId);
              selectPatient(patient, { focusDiagnosis: true });
            } catch {
              toast.error("تعذّر تحميل بيانات المريض");
            }
          }}
        />
        {/* Patient */}
        <section className="rx-section space-y-2">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[12rem] flex-1">
              <FieldLabel>المريض — Enter</FieldLabel>
              <SearchInput
                placeholder="ابحث بالاسم..."
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
            </div>
            <Button
              variant="outline"
              size="sm"
              tabIndex={-1}
              className="h-8"
              onClick={() => {
                setNewPatientInitialName(patientSearch.trim());
                setShowNewPatient(true);
              }}
            >
              <Plus size={14} />
              جديد
            </Button>
          </div>

          {patientSearch.trim() && !selectedPatient && !showNewPatient && (
            <p className="text-xs text-rx-muted-foreground">
              {findPatientByExactName(patientSearch) || patients.length > 0
                ? "Enter — اختيار"
                : "Enter — مريض جديد"}
            </p>
          )}

          {patientSearch && !selectedPatient && !showNewPatient && patients.length > 0 && (
            <ul className="max-h-32 overflow-y-auto rounded-md border border-rx-form-border bg-rx-surface">
              {patients.slice(0, 6).map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    tabIndex={-1}
                    className="rx-list-item"
                    onClick={() => selectPatient(p)}
                  >
                    <span className="font-medium text-rx-text">{p.name}</span>
                    <span className="mr-2 text-xs text-rx-muted">
                      {genderLabel(p.gender)} · {p.age} · {visitCountLabel(p.visitCount)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {showNewPatient && (
            <div className="border-t border-rx-form-border pt-2">
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
            </div>
          )}

          {selectedPatient && !showNewPatient && (
            <>
              {selectedPatient.allergies?.trim() ? (
                <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                  <strong>تنبيه حساسية:</strong> {selectedPatient.allergies}
                </div>
              ) : null}
              {selectedPatient.currentMedications?.trim() ? (
                <p className="text-xs text-slate-600">
                  <strong>أدوية حالية:</strong> {selectedPatient.currentMedications}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <p className="rx-patient-chip">
                  <strong>{selectedPatient.name}</strong>
                  {patientFieldVisibility.showGender && (
                    <span className="text-rx-muted">
                      {" "}
                      · {genderLabel(selectedPatient.gender)}
                    </span>
                  )}
                  {patientFieldVisibility.showAge && (
                    <span className="text-rx-muted"> · {selectedPatient.age}</span>
                  )}
                  {patientFieldVisibility.showPhone && selectedPatient.phone && (
                    <span className="text-rx-muted" dir="ltr">
                      {" "}
                      · {selectedPatient.phone}
                    </span>
                  )}
                  <span className="text-rx-muted">
                    {" "}
                    · {visitCountLabel(selectedPatient.visitCount)}
                  </span>
                </p>
                {selectedPatient.id > 0 && (
                  <Button variant="outline" size="sm" asChild className="h-7 text-xs">
                    <Link href={`/patients/${selectedPatient.id}/record`}>
                      <FileText size={13} />
                      السجل
                    </Link>
                  </Button>
                )}
              </div>
              {(selectedPatient.fieldValues ?? []).some((fv) => fv.value.trim()) && (
                <p className="text-xs text-rx-muted">
                  {(selectedPatient.fieldValues ?? [])
                    .filter((fv) => fv.value.trim())
                    .map((fv) => {
                      const label = personalFieldLabels.get(fv.patientFieldId);
                      return label ? `${label}: ${fv.value}` : fv.value;
                    })
                    .join(" · ")}
                </p>
              )}
            </>
          )}
        </section>

        {recipeFields.length > 0 && (
          <section className="rx-section space-y-2">
            <FieldLabel>حقول الوصفة</FieldLabel>
            <PersonalFieldInputs
              dense
              fields={recipeFields}
              values={fieldValues}
              onChange={(fieldId, value) =>
                setFieldValues((fv) => ({ ...fv, [fieldId]: value }))
              }
            />
          </section>
        )}

        {/* Diagnosis */}
        <section className="rx-section space-y-2">
          <FieldLabel>التشخيص</FieldLabel>
          <Textarea
            ref={diagnosisRef}
            fieldSize="compact"
            rows={2}
            placeholder="التشخيص..."
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
          />
        </section>

        {/* Medicines */}
        <section className="rx-section space-y-2">
          <div className="flex items-center justify-between gap-2">
            <FieldLabel>الأدوية</FieldLabel>
            <Button
              variant="ghost"
              size="sm"
              tabIndex={-1}
              className="h-7 px-2 text-xs"
              onClick={() => setItems((rows) => [...rows, newEmptyRow()])}
            >
              <Plus size={12} />
              صف
            </Button>
          </div>
          <div className="space-y-1">
            {items.map((row, index) => (
              <MedicineRowEditor
                key={row.key}
                compact
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
                isLastRow={index === items.length - 1}
                onAddRow={addMedicineRowAndFocus}
              />
            ))}
          </div>
        </section>

        {/* Attachments — collapsed by default */}
        {attachmentsSection}
        </div>

          {livePreviewData ? (
            <aside className="min-h-0 xl:sticky xl:col-start-1 xl:row-start-1 xl:self-start xl:top-[calc(var(--rx-header-height)+0.5rem)]">
              <PrescriptionLivePreview data={livePreviewData} className="w-full" />
            </aside>
          ) : (
            <p className="text-sm text-rx-muted xl:col-start-1 xl:row-start-1">
              جاري تحميل إعدادات الوصفة للمعاينة...
            </p>
          )}
        </div>
      </PageContent>
    </div>
  );
}
