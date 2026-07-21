"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchInput } from "@/components/ui/search-input";
import {
  FINANCE_INCOME_CATEGORIES,
  PAYMENT_METHODS,
  defaultAmountForCategory,
} from "@/lib/finance/constants";
import {
  rxApi,
  type FinanceSettingsDto,
  type PatientDto,
} from "@/lib/api/rx-client";
import { fetchPatientsOfflineFirst } from "@/lib/data/offline-api";
import { useSyncStore } from "@/stores/sync-store";
import { genderLabel } from "@/lib/patient-utils";
import { useLocale } from "@/i18n/locale-provider";

function todayKey() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const VISIT_CATEGORIES = FINANCE_INCOME_CATEGORIES.filter((c) =>
  ["consultation", "follow_up", "procedure"].includes(c.id)
);

type Props = {
  settings?: FinanceSettingsDto;
  defaultPatient?: Pick<PatientDto, "id" | "name" | "phone" | "gender"> | null;
  defaultAppointmentId?: number | null;
  defaultCategory?: string;
  onSuccess?: () => void;
  submitLabel?: string;
};

export function ConsultationRecordForm({
  settings,
  defaultPatient = null,
  defaultAppointmentId = null,
  defaultCategory = "consultation",
  onSuccess,
  submitLabel,
}: Props) {
  const { t, locale } = useLocale();
  const resolvedSubmitLabel = submitLabel ?? t("secretary.submitConsultation");
  const [patientSearch, setPatientSearch] = useState(defaultPatient?.name ?? "");
  const [selectedPatient, setSelectedPatient] = useState<PatientDto | null>(
    defaultPatient
      ? ({
          id: defaultPatient.id,
          name: defaultPatient.name,
          phone: defaultPatient.phone ?? null,
          gender: defaultPatient.gender,
        } as PatientDto)
      : null
  );
  const [category, setCategory] = useState(defaultCategory);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [description, setDescription] = useState("");

  const online = useSyncStore((s) => s.online);

  const searchQuery = patientSearch.trim();

  const { data: patientsData, isFetching } = useQuery({
    queryKey: ["patients", "consultation-search", searchQuery],
    queryFn: async () => {
      const patients = await fetchPatientsOfflineFirst(
        searchQuery || undefined
      );
      return { patients: patients.slice(0, 20) };
    },
    enabled: searchQuery.length >= 1 && !selectedPatient,
  });

  const patients = patientsData?.patients ?? [];

  const suggestions = useMemo(() => {
    if (!searchQuery || selectedPatient) return [];
    return patients.slice(0, 8);
  }, [searchQuery, patients, selectedPatient]);

  useEffect(() => {
    if (defaultPatient) {
      setSelectedPatient({
        id: defaultPatient.id,
        name: defaultPatient.name,
        phone: defaultPatient.phone ?? null,
        gender: defaultPatient.gender,
      } as PatientDto);
      setPatientSearch(defaultPatient.name);
    }
    setCategory(defaultCategory);
    if (settings) {
      const suggested = defaultAmountForCategory(defaultCategory, settings);
      if (suggested != null && suggested > 0) {
        setAmount(String(suggested));
      }
    }
  }, [defaultPatient, defaultCategory, settings]);

  function selectPatient(patient: PatientDto) {
    setSelectedPatient(patient);
    setPatientSearch(patient.name);
  }

  function handlePatientEnter() {
    const q = patientSearch.trim();
    if (!q) return;

    const exact = patients.find(
      (p) => p.name.trim().toLowerCase() === q.toLowerCase()
    );
    if (exact) {
      selectPatient(exact);
      return;
    }
    if (patients.length > 0) {
      selectPatient(patients[0]!);
    }
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      rxApi.finances.createTransaction({
        type: "income",
        category,
        amount: Number(amount),
        paymentMethod,
        description: description.trim() || null,
        transactionDate: todayKey(),
        patientId: selectedPatient!.id,
        appointmentId: defaultAppointmentId ?? null,
      }),
    onSuccess: () => {
      toast.success(t("secretary.consultationSaved"));
      setDescription("");
      if (!defaultPatient) {
        setSelectedPatient(null);
        setPatientSearch("");
      }
      onSuccess?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!online) {
          toast.error(t("secretary.needsOnline"));
          return;
        }
        if (!selectedPatient) {
          toast.error(t("secretary.selectPatient"));
          return;
        }
        if (!amount || Number(amount) <= 0) {
          toast.error(t("secretary.enterAmount"));
          return;
        }
        saveMutation.mutate();
      }}
    >
      <div className="space-y-2">
        <Label>{t("secretary.patientRequired")}</Label>
        <SearchInput
          placeholder={t("secretary.searchPatientPlaceholder")}
          value={patientSearch}
          onChange={(v) => {
            setPatientSearch(v);
            setSelectedPatient(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handlePatientEnter();
            }
          }}
        />

        {searchQuery && !selectedPatient ? (
          <p className="text-xs text-rx-muted">
            {isFetching
              ? t("secretary.searching")
              : suggestions.length > 0
                ? t("secretary.pressToSelect")
                : t("secretary.noSearchResults")}
          </p>
        ) : null}

        {suggestions.length > 0 ? (
          <ul className="max-h-44 overflow-y-auto rounded-lg border border-rx-border bg-white shadow-sm">
            {suggestions.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 border-b border-rx-border/60 px-3 py-2.5 text-right text-sm last:border-b-0 hover:bg-rx-bg-subtle"
                  onClick={() => selectPatient(p)}
                >
                  <span className="font-medium text-rx-text">{p.name}</span>
                  <span className="text-xs text-rx-muted">
                    {genderLabel(p.gender, locale)}
                    {p.phone ? (
                      <>
                        {" · "}
                        <span dir="ltr">{p.phone}</span>
                      </>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {selectedPatient ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-sm">
            <span className="font-semibold text-emerald-900">
              {selectedPatient.name}
            </span>
            <span className="text-emerald-800/80">
              {" "}
              · {genderLabel(selectedPatient.gender, locale)}
              {selectedPatient.phone ? (
                <>
                  {" · "}
                  <span dir="ltr">{selectedPatient.phone}</span>
                </>
              ) : null}
            </span>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t("secretary.visitType")}</Label>
          <select
            className="h-10 w-full rounded-lg border border-rx-border bg-white px-3 text-sm"
            value={category}
            onChange={(e) => {
              const next = e.target.value;
              setCategory(next);
              if (settings) {
                const suggested = defaultAmountForCategory(next, settings);
                if (suggested != null && suggested > 0) {
                  setAmount(String(suggested));
                }
              }
            }}
          >
            {VISIT_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>{t("secretary.amountSyp")}</Label>
          <Input
            type="number"
            min={1}
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>{t("secretary.paymentMethod")}</Label>
        <select
          className="h-10 w-full rounded-lg border border-rx-border bg-white px-3 text-sm"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
        >
          {PAYMENT_METHODS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label>{t("secretary.notesOptional")}</Label>
        <Textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("secretary.notesPlaceholder")}
        />
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={saveMutation.isPending}
      >
        {saveMutation.isPending ? (
          t("secretary.recording")
        ) : (
          <>
            <Save size={16} />
            {resolvedSubmitLabel}
          </>
        )}
      </Button>
    </form>
  );
}

export function ConsultationRecordIcon() {
  return <Stethoscope size={18} className="text-rx-primary" />;
}
