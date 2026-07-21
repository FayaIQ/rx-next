"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Printer, RotateCcw } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SearchInput } from "@/components/ui/search-input";
import {
  MedicineRowEditor,
  type MedicineRowData,
} from "@/components/prescription/medicine-row-editor";
import { PrescriptionLivePreview } from "@/components/prescription/prescription-live-preview";
import { PrescriptionDocument } from "@/components/prescription/prescription-document";
import { buildPrescriptionPreviewData } from "@/lib/prescription-preview-data";
import { normalizeRecipeSettingsDto } from "@/lib/recipe-settings";
import { medicineGroupKey, useMedicineGroups } from "@/lib/medicine-utils";
import type { MedicineDto, MedicinePresetDto } from "@/lib/api/rx-client";
import {
  formatAge,
  formatPrescriptionDateTime,
  genderLabel,
  toDateInputValue,
  visitCountLabel,
} from "@/lib/patient-utils";
import { useLocale } from "@/i18n/locale-provider";

type DemoPatient = {
  id: number;
  name: { ar: string; en: string };
  gender: "male" | "female";
  birthdate: string;
  phone: string;
  visits: number;
};

const DEMO_PATIENTS: DemoPatient[] = [
  {
    id: 1,
    name: { ar: "سارة محمد", en: "Sara Mohammed" },
    gender: "female",
    birthdate: "1998-03-12",
    phone: "0770 123 4567",
    visits: 3,
  },
  {
    id: 2,
    name: { ar: "علي حسن", en: "Ali Hassan" },
    gender: "male",
    birthdate: "1985-07-01",
    phone: "0781 555 0192",
    visits: 5,
  },
  {
    id: 3,
    name: { ar: "نور حسين", en: "Noor Hussein" },
    gender: "female",
    birthdate: "2015-11-20",
    phone: "0750 222 8844",
    visits: 1,
  },
];

type CatalogEntry = {
  name: string;
  type: { ar: string; en: string };
  dosage: string;
  quantity: string;
  period: { ar: string; en: string };
  timeOfUse: { ar: string; en: string };
};

const DEMO_CATALOG: CatalogEntry[] = [
  {
    name: "Amoxicillin 500mg",
    type: { ar: "كبسول", en: "Capsule" },
    dosage: "1×3",
    quantity: "21",
    period: { ar: "7 أيام", en: "7 days" },
    timeOfUse: { ar: "بعد الأكل", en: "After meals" },
  },
  {
    name: "Amoxicillin 1g",
    type: { ar: "قرص", en: "Tablet" },
    dosage: "1×2",
    quantity: "14",
    period: { ar: "7 أيام", en: "7 days" },
    timeOfUse: { ar: "بعد الأكل", en: "After meals" },
  },
  {
    name: "Paracetamol 500mg",
    type: { ar: "قرص", en: "Tablet" },
    dosage: "1×3",
    quantity: "15",
    period: { ar: "5 أيام", en: "5 days" },
    timeOfUse: { ar: "عند الحاجة", en: "As needed" },
  },
  {
    name: "Ibuprofen 400mg",
    type: { ar: "قرص", en: "Tablet" },
    dosage: "1×2",
    quantity: "10",
    period: { ar: "5 أيام", en: "5 days" },
    timeOfUse: { ar: "بعد الأكل", en: "After meals" },
  },
  {
    name: "Azithromycin 250mg",
    type: { ar: "كبسول", en: "Capsule" },
    dosage: "1×1",
    quantity: "6",
    period: { ar: "3 أيام", en: "3 days" },
    timeOfUse: { ar: "قبل الأكل", en: "Before meals" },
  },
  {
    name: "Omeprazole 20mg",
    type: { ar: "كبسول", en: "Capsule" },
    dosage: "1×1",
    quantity: "14",
    period: { ar: "14 يوم", en: "14 days" },
    timeOfUse: { ar: "قبل الفطور", en: "Before breakfast" },
  },
  {
    name: "Cetirizine 10mg",
    type: { ar: "قرص", en: "Tablet" },
    dosage: "1×1",
    quantity: "10",
    period: { ar: "10 أيام", en: "10 days" },
    timeOfUse: { ar: "مساءً", en: "In the evening" },
  },
  {
    name: "Vitamin D3 5000IU",
    type: { ar: "كبسولة", en: "Capsule" },
    dosage: "1×1",
    quantity: "8",
    period: { ar: "8 أسابيع", en: "8 weeks" },
    timeOfUse: { ar: "مع وجبة", en: "With a meal" },
  },
];

function emptyRow(key: string): MedicineRowData {
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

function ComposerPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="rx-composer-card rounded-xl shadow-sm">
      <CardHeader className="border-b border-rx-border/60 px-4 py-3 pb-3 pt-4 sm:px-5">
        <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-4 py-4 sm:px-5">{children}</CardContent>
    </Card>
  );
}

const DEMO_PRESCRIPTION_NUMBER = 1024;

export function LandingRxDemo() {
  const { t, dir, locale } = useLocale();
  const nextRowKeyRef = useRef(2);
  const [mounted, setMounted] = useState(false);
  const [printing, setPrinting] = useState(false);

  useEffect(() => setMounted(true), []);

  const medicines = useMemo<MedicineDto[]>(
    () =>
      DEMO_CATALOG.map((e, i) => ({
        id: i + 1,
        doctorId: 0,
        name: e.name,
        type: e.type[locale],
        dosage: e.dosage,
        quantity: e.quantity,
        period: e.period[locale],
        timeOfUse: e.timeOfUse[locale],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      })),
    [locale]
  );

  const presets = useMemo<MedicinePresetDto[]>(
    () =>
      DEMO_CATALOG.map((e, i) => ({
        id: i + 1,
        doctorId: 0,
        medicineKey: medicineGroupKey(e.name),
        name: e.name,
        type: e.type[locale],
        dosage: e.dosage,
        quantity: e.quantity,
        period: e.period[locale],
        timeOfUse: e.timeOfUse[locale],
        usageCount: DEMO_CATALOG.length - i,
        lastUsedAt: "2026-07-01T00:00:00.000Z",
      })),
    [locale]
  );

  const medicineGroups = useMedicineGroups(medicines);

  const settings = useMemo(
    () =>
      normalizeRecipeSettingsDto({
        id: 0,
        doctorId: 0,
        doctorName: t("landing.demoDoctor"),
        doctorSpecialty: t("landing.demoSpecialty"),
        additionalText1: t("landing.demoClinic"),
        phoneNumber: "0770 123 4567",
        address: t("landing.demoAddress"),
        paperSize: "A4",
      }),
    [t]
  );

  function initialItems(): MedicineRowData[] {
    const first = DEMO_CATALOG[0]!;
    return [
      {
        key: "medicine-row-0",
        name: first.name,
        type: first.type[locale],
        dosage: first.dosage,
        quantity: first.quantity,
        period: first.period[locale],
        timeOfUse: first.timeOfUse[locale],
      },
      emptyRow("medicine-row-1"),
    ];
  }

  const [patientQuery, setPatientQuery] = useState(
    DEMO_PATIENTS[0]!.name[locale === "en" ? "en" : "ar"]
  );
  const [selectedPatient, setSelectedPatient] = useState<DemoPatient | null>(
    DEMO_PATIENTS[0]!
  );
  const [diagnosis, setDiagnosis] = useState("");
  const [items, setItems] = useState<MedicineRowData[]>(initialItems);
  const [activeRowKey, setActiveRowKey] = useState<string | null>(null);
  const [prescriptionDate, setPrescriptionDate] = useState(() =>
    toDateInputValue(new Date())
  );

  const patientName = (p: DemoPatient) => p.name[locale === "en" ? "en" : "ar"];

  const filteredPatients =
    patientQuery.trim() && !selectedPatient
      ? DEMO_PATIENTS.filter((p) =>
          patientName(p)
            .toLowerCase()
            .includes(patientQuery.trim().toLowerCase())
        )
      : [];

  function newEmptyRow() {
    return emptyRow(`medicine-row-${nextRowKeyRef.current++}`);
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
    setActiveRowKey(newRow.key);
    focusMedicineRowName(newRow.key);
  }

  function resetDemo() {
    setSelectedPatient(DEMO_PATIENTS[0]!);
    setPatientQuery(patientName(DEMO_PATIENTS[0]!));
    setDiagnosis("");
    nextRowKeyRef.current = 2;
    setItems(initialItems());
    setActiveRowKey(null);
    setPrescriptionDate(toDateInputValue(new Date()));
  }

  const previewData = useMemo(
    () =>
      buildPrescriptionPreviewData({
        settings,
        prescriptionNumber: DEMO_PRESCRIPTION_NUMBER,
        prescriptionDate,
        patientName: selectedPatient
          ? patientName(selectedPatient)
          : patientQuery,
        patientGender: selectedPatient?.gender ?? "male",
        patientBirthdate: selectedPatient?.birthdate ?? null,
        patientPhone: selectedPatient?.phone,
        diagnosis,
        items,
        recipeFields: [],
        fieldValues: {},
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings, prescriptionDate, selectedPatient, patientQuery, diagnosis, items, locale]
  );

  const hasMedicines = items.some((i) => i.name.trim());

  useEffect(() => {
    if (!printing) return;
    document.body.classList.add("rx-demo-printing");
    const raf = requestAnimationFrame(() => {
      window.print();
      document.body.classList.remove("rx-demo-printing");
      setPrinting(false);
    });
    return () => {
      cancelAnimationFrame(raf);
      document.body.classList.remove("rx-demo-printing");
    };
  }, [printing]);

  return (
    <div className="mt-12" dir={dir}>
      <style jsx global>{`
        #rx-demo-print-root {
          display: none;
        }
        @media print {
          body.rx-demo-printing > *:not(#rx-demo-print-root) {
            display: none !important;
          }
          body.rx-demo-printing #rx-demo-print-root {
            display: block !important;
          }
        }
      `}</style>

      <div className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-rx-bg shadow-sm">
        {/* Header — mirrors in-app AppHeader */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rx-border/70 bg-rx-surface px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-rx-text sm:text-base">
                {t("home.title")}
              </p>
              <p className="text-xs text-rx-muted">
                <span className="font-mono font-medium text-rx-text">
                  #{DEMO_PRESCRIPTION_NUMBER}
                </span>
                <span className="mx-1.5 opacity-50">·</span>
                {formatPrescriptionDateTime(prescriptionDate, locale)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setPrinting(true)}
              disabled={!hasMedicines || printing}
            >
              <Printer size={14} />
              {t("composer.print")}
            </Button>
            <Button size="sm" variant="ghost" onClick={resetDemo}>
              <RotateCcw size={14} />
            </Button>
          </div>
        </div>

        {/* Body — mirrors the composer layout */}
        <div className="p-3 lg:p-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(260px,380px)_minmax(0,1fr)] xl:items-start">
            <div className="min-w-0 space-y-4 xl:col-start-2">
              <ComposerPanel title={t("composer.patientData")}>
                <div className="space-y-3">
                  <div>
                    <FieldLabel>{t("composer.patientEnter")}</FieldLabel>
                    <SearchInput
                      fieldSize="default"
                      placeholder={t("composer.searchPatient")}
                      value={patientQuery}
                      onChange={(v: string) => {
                        setPatientQuery(v);
                        setSelectedPatient(null);
                      }}
                    />
                  </div>

                  {filteredPatients.length > 0 && (
                    <ul className="max-h-40 overflow-y-auto rounded-lg border border-rx-form-border bg-rx-surface">
                      {filteredPatients.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            tabIndex={-1}
                            className="rx-list-item"
                            onClick={() => {
                              setSelectedPatient(p);
                              setPatientQuery(patientName(p));
                            }}
                          >
                            <span className="font-medium text-rx-text">
                              {patientName(p)}
                            </span>
                            <span className="mx-2 text-sm text-rx-muted">
                              {genderLabel(p.gender, locale)} ·{" "}
                              {formatAge(p.birthdate)} ·{" "}
                              {visitCountLabel(p.visits, locale)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {selectedPatient && (
                    <div className="rounded-lg border border-rx-border/60 bg-rx-bg-subtle/30 p-3">
                      <p className="rx-patient-chip">
                        <strong>{patientName(selectedPatient)}</strong>
                        <span className="text-rx-muted">
                          {" "}
                          · {genderLabel(selectedPatient.gender, locale)}
                        </span>
                        <span className="text-rx-muted">
                          {" "}
                          · {formatAge(selectedPatient.birthdate)}
                        </span>
                        <span className="text-rx-muted" dir="ltr">
                          {" "}
                          · {selectedPatient.phone}
                        </span>
                        <span className="text-rx-muted">
                          {" "}
                          · {visitCountLabel(selectedPatient.visits, locale)}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </ComposerPanel>

              <ComposerPanel title={t("composer.prescription")}>
                <section className="space-y-3">
                  <FieldLabel>{t("composer.diagnosis")}</FieldLabel>
                  <Textarea
                    fieldSize="default"
                    rows={2}
                    placeholder={t("composer.diagnosisPlaceholder")}
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                  />
                </section>

                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <FieldLabel>{t("composer.medicines")}</FieldLabel>
                    <Button
                      variant="outline"
                      size="sm"
                      tabIndex={-1}
                      onClick={() => setItems((rows) => [...rows, newEmptyRow()])}
                    >
                      <Plus size={14} />
                      {t("composer.addMedicine")}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {items.map((row, index) => (
                      <MedicineRowEditor
                        key={row.key}
                        row={row}
                        rowKey={row.key}
                        groups={medicineGroups}
                        presets={presets}
                        isOpen={activeRowKey === row.key}
                        onOpen={() => setActiveRowKey(row.key)}
                        onClose={() => setActiveRowKey(null)}
                        onChange={(updated) =>
                          setItems((rows) =>
                            rows.map((r) => (r.key === row.key ? updated : r))
                          )
                        }
                        onRemove={() =>
                          setItems((rows) =>
                            rows.filter((r) => r.key !== row.key)
                          )
                        }
                        canRemove={items.length > 1}
                        isLastRow={index === items.length - 1}
                        onAddRow={addMedicineRowAndFocus}
                      />
                    ))}
                  </div>
                </section>
              </ComposerPanel>
            </div>

            <aside className="min-h-0 xl:col-start-1 xl:row-start-1 xl:self-start">
              <PrescriptionLivePreview
                data={previewData}
                className="w-full"
                label={t("composer.livePreview")}
              />
            </aside>
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-slate-400">
        {t("landing.demoNote")}
      </p>

      {mounted &&
        createPortal(
          <div id="rx-demo-print-root">
            <PrescriptionDocument data={previewData} />
          </div>,
          document.body
        )}
    </div>
  );
}
