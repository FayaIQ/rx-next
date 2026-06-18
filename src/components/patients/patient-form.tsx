"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPatientOffline, updatePatientOffline } from "@/lib/data/offline-api";
import {
  birthdateToFormInput,
  buildOptimisticPatient,
  serializeBirthdateInput,
} from "@/lib/patient-utils";
import type { PatientDto } from "@/lib/api/rx-client";
import {
  DEFAULT_PATIENT_FIELD_VISIBILITY,
  nextCoreField,
  type CoreFocusField,
  type PatientCoreFieldVisibility,
} from "@/lib/patient-core-fields";

type FocusField = CoreFocusField;

interface PatientFormProps {
  patient?: PatientDto | null;
  initialName?: string;
  autoFocusField?: FocusField;
  fieldVisibility?: PatientCoreFieldVisibility;
  onSuccess: (patient: PatientDto) => void;
  onPatientSynced?: (patient: PatientDto) => void;
  onSyncStart?: (promise: Promise<PatientDto>) => void;
  onCancel?: () => void;
  compact?: boolean;
}

export function PatientForm({
  patient,
  initialName,
  autoFocusField,
  fieldVisibility = DEFAULT_PATIENT_FIELD_VISIBILITY,
  onSuccess,
  onPatientSynced,
  onSyncStart,
  onCancel,
  compact,
}: PatientFormProps) {
  const queryClient = useQueryClient();
  const nameRef = useRef<HTMLInputElement>(null);
  const genderRef = useRef<HTMLSelectElement>(null);
  const ageRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(patient?.name ?? initialName ?? "");
  const [gender, setGender] = useState<"male" | "female">(
    patient?.gender ?? "male"
  );
  const [birthdateInput, setBirthdateInput] = useState(() =>
    birthdateToFormInput(patient?.birthdate)
  );
  const [phone, setPhone] = useState(patient?.phone ?? "");
  const [diagnosis, setDiagnosis] = useState(patient?.diagnosis ?? "");

  const visibility = useMemo(
    () => ({
      showGender: fieldVisibility.showGender,
      showAge: fieldVisibility.showAge,
      showPhone: fieldVisibility.showPhone,
    }),
    [fieldVisibility]
  );

  const buildBody = useCallback(
    () => ({
      name,
      gender,
      birthdate: serializeBirthdateInput(birthdateInput),
      phone: phone || null,
      diagnosis: diagnosis || null,
    }),
    [name, gender, birthdateInput, phone, diagnosis]
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const body = buildBody();
      if (patient) {
        return updatePatientOffline(patient.id, body);
      }
      return createPatientOffline(body);
    },
    onSuccess: (savedPatient) => {
      void queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success(patient ? "تم تحديث المريض" : "تم إضافة المريض");
      onSuccess(savedPatient);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function submitPatient() {
    const body = buildBody();

    if (!patient && navigator.onLine) {
      const optimistic = buildOptimisticPatient(body);
      onSuccess(optimistic);
      toast.success("تم إضافة المريض");

      const syncPromise = createPatientOffline(body);
      onSyncStart?.(syncPromise);
      void syncPromise
        .then((savedPatient) => {
          onPatientSynced?.(savedPatient);
          void queryClient.invalidateQueries({ queryKey: ["patients"] });
        })
        .catch((e: Error) => toast.error(e.message));
      return;
    }

    mutation.mutate();
  }

  const focusField = useCallback((field: FocusField) => {
    const refs = {
      name: nameRef,
      gender: genderRef,
      age: ageRef,
      phone: phoneRef,
    };
    refs[field].current?.focus();
  }, []);

  useEffect(() => {
    if (!autoFocusField || patient) return;
    requestAnimationFrame(() => focusField(autoFocusField));
  }, [autoFocusField, patient, focusField]);

  function handleFieldEnter(
    e: React.KeyboardEvent,
    current: FocusField
  ) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const next = nextCoreField(current, visibility);
    if (next === "submit") {
      submitPatient();
      return;
    }
    focusField(next);
  }

  function handleGenderKeyDown(e: React.KeyboardEvent<HTMLSelectElement>) {
    if (e.key === "m" || e.key === "M" || e.key === "ذ") {
      e.preventDefault();
      setGender("male");
      return;
    }
    if (e.key === "f" || e.key === "F" || e.key === "أ") {
      e.preventDefault();
      setGender("female");
      return;
    }
    handleFieldEnter(e, "gender");
  }

  return (
    <form
      className={compact ? "grid gap-3 sm:grid-cols-2" : "space-y-4"}
      onSubmit={(e) => {
        e.preventDefault();
        submitPatient();
      }}
    >
      <div className="space-y-2 sm:col-span-2">
        <Label>اسم المريض</Label>
        <Input
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => handleFieldEnter(e, "name")}
          required
        />
      </div>
      {visibility.showGender && (
        <div className="space-y-2">
          <Label>الجنس</Label>
          <select
            ref={genderRef}
            className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
            value={gender}
            onChange={(e) => setGender(e.target.value as "male" | "female")}
            onKeyDown={handleGenderKeyDown}
          >
            <option value="male">ذكر</option>
            <option value="female">أنثى</option>
          </select>
        </div>
      )}
      {visibility.showAge && (
        <div className="space-y-2">
          <Label>العمر أو تاريخ الميلاد</Label>
          <Input
            ref={ageRef}
            value={birthdateInput}
            onChange={(e) => setBirthdateInput(e.target.value)}
            onKeyDown={(e) => handleFieldEnter(e, "age")}
            placeholder="مثال: 35 أو 1990-05-12"
          />
        </div>
      )}
      {visibility.showPhone && (
        <div className="space-y-2">
          <Label>الهاتف</Label>
          <Input
            ref={phoneRef}
            dir="ltr"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => handleFieldEnter(e, "phone")}
          />
        </div>
      )}
      {!compact && (
        <div className="space-y-2 sm:col-span-2">
          <Label>التشخيص</Label>
          <Textarea
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
          />
        </div>
      )}
      <div className={`flex gap-2 ${compact ? "sm:col-span-2" : ""}`}>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "جاري الحفظ..." : patient ? "تحديث" : "إضافة"}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            إلغاء
          </Button>
        )}
      </div>
    </form>
  );
}
