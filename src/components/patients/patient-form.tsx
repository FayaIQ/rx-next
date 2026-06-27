"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPatientOffline, updatePatientOffline } from "@/lib/data/offline-api";
import {
  birthdateToFormInput,
  buildOptimisticPatient,
  normalizePatientPhoneForSave,
  parsePatientPhoneInput,
  serializeBirthdateInput,
} from "@/lib/patient-utils";
import { rxApi, type PatientDto } from "@/lib/api/rx-client";
import {
  DEFAULT_PATIENT_FIELD_VISIBILITY,
  nextCoreField,
  type CoreFocusField,
  type PatientCoreFieldVisibility,
} from "@/lib/patient-core-fields";
import {
  PatientDynamicFields,
  patientFieldValuesFromRecord,
  recordFromPatientFieldValues,
} from "@/components/patients/patient-dynamic-fields";
import { usePatientFields } from "@/hooks/use-patient-fields";
import { activePersonalFields } from "@/lib/patient-field-display";

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
  /** داخل نموذج آخر — يمنع form متداخل */
  embedded?: boolean;
}

export type PatientFormHandle = {
  submit: () => Promise<PatientDto | null>;
};

export const PatientForm = forwardRef<PatientFormHandle, PatientFormProps>(
  function PatientForm(
    {
      patient,
      initialName,
      autoFocusField,
      fieldVisibility = DEFAULT_PATIENT_FIELD_VISIBILITY,
      onSuccess,
      onPatientSynced,
      onSyncStart,
      onCancel,
      compact,
      embedded = false,
    },
    ref
  ) {
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
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneDuplicateHint, setPhoneDuplicateHint] = useState<string | null>(
    null
  );
  const [phoneDuplicateName, setPhoneDuplicateName] = useState<string | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [dynamicFieldValues, setDynamicFieldValues] = useState<
    Record<number, string>
  >(() => recordFromPatientFieldValues(patient?.fieldValues));

  const { data: fieldsData } = usePatientFields();

  const personalFields = useMemo(
    () => activePersonalFields(fieldsData),
    [fieldsData]
  );

  useEffect(() => {
    setName(patient?.name ?? initialName ?? "");
    setGender(patient?.gender ?? "male");
    setBirthdateInput(birthdateToFormInput(patient?.birthdate));
    setPhone(patient?.phone ?? "");
    setDiagnosis(patient?.diagnosis ?? "");
    setDynamicFieldValues(recordFromPatientFieldValues(patient?.fieldValues));
    setPhoneError(null);
    setPhoneDuplicateHint(null);
    setPhoneDuplicateName(null);
  }, [patient, initialName]);

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
      phone: normalizePatientPhoneForSave(phone),
      diagnosis: diagnosis || null,
      fieldValues: patientFieldValuesFromRecord(dynamicFieldValues),
    }),
    [name, gender, birthdateInput, phone, diagnosis, dynamicFieldValues]
  );

  const notifyPhoneDuplicate = useCallback(
    (duplicateName?: string | null) => {
      const hint = duplicateName
        ? `هذا الرقم مسجّل سابقاً (${duplicateName})`
        : "هذا الرقم مسجّل سابقاً";
      toast.warning(hint, { duration: 5000 });
    },
    []
  );

  const validatePhone = useCallback(
    (value: string, options?: { focusOnError?: boolean }) => {
      if (!visibility.showPhone) {
        setPhoneError(null);
        return true;
      }
      const { error } = parsePatientPhoneInput(value);
      setPhoneError(error);
      if (error && options?.focusOnError) {
        phoneRef.current?.focus();
      }
      return !error;
    },
    [visibility.showPhone]
  );

  const checkPhoneDuplicate = useCallback(
    async (value: string) => {
      if (!visibility.showPhone || !navigator.onLine) {
        setPhoneDuplicateHint(null);
        setPhoneDuplicateName(null);
        return;
      }
      const { normalized, error } = parsePatientPhoneInput(value);
      if (error || !normalized) {
        setPhoneDuplicateHint(null);
        setPhoneDuplicateName(null);
        return;
      }
      try {
        const res = await rxApi.patients.checkPhone(
          normalized,
          patient?.id || undefined
        );
        setPhoneDuplicateName(res.exists ? res.patientName ?? null : null);
        setPhoneDuplicateHint(
          res.exists
            ? res.patientName
              ? `هذا الرقم مسجّل سابقاً (${res.patientName})`
              : "هذا الرقم مسجّل سابقاً"
            : null
        );
      } catch {
        setPhoneDuplicateHint(null);
        setPhoneDuplicateName(null);
      }
    },
    [visibility.showPhone, patient?.id]
  );

  const handlePhoneChange = useCallback(
    (value: string) => {
      setPhone(value);
      if (phoneError) {
        const { error } = parsePatientPhoneInput(value);
        setPhoneError(error);
      }
      if (phoneDuplicateHint) {
        setPhoneDuplicateHint(null);
        setPhoneDuplicateName(null);
      }
    },
    [phoneError, phoneDuplicateHint]
  );

  const handlePhoneBlur = useCallback(() => {
    validatePhone(phone);
    void checkPhoneDuplicate(phone);
  }, [phone, validatePhone, checkPhoneDuplicate]);

  async function submitPatient(options?: { quiet?: boolean }): Promise<PatientDto | null> {
    if (!name.trim()) {
      toast.error("أدخل اسم المريض");
      nameRef.current?.focus();
      return null;
    }

    if (!validatePhone(phone, { focusOnError: true })) {
      toast.error(phoneError ?? "رقم الهاتف غير صالح");
      return null;
    }

    let duplicateName = phoneDuplicateName;
    if (
      visibility.showPhone &&
      phone.trim() &&
      navigator.onLine &&
      duplicateName === null
    ) {
      const { normalized, error } = parsePatientPhoneInput(phone);
      if (!error && normalized) {
        try {
          const res = await rxApi.patients.checkPhone(
            normalized,
            patient?.id || undefined
          );
          if (res.exists) {
            duplicateName = res.patientName ?? null;
            setPhoneDuplicateName(duplicateName);
            setPhoneDuplicateHint(
              duplicateName
                ? `هذا الرقم مسجّل سابقاً (${duplicateName})`
                : "هذا الرقم مسجّل سابقاً"
            );
          }
        } catch {
          /* ignore — save still allowed */
        }
      }
    }

    const body = buildBody();
    const quiet = options?.quiet ?? embedded;

    setIsSaving(true);
    try {
      if (embedded && !patient) {
        const result = await createPatientOffline(body);
        if (result.phoneDuplicate) {
          notifyPhoneDuplicate(result.duplicatePatientName);
        }
        void queryClient.invalidateQueries({ queryKey: ["patients"] });
        onSuccess(result.patient);
        return result.patient;
      }

      if (!patient && navigator.onLine && !embedded) {
        const optimistic = buildOptimisticPatient(body);
        if (duplicateName !== null) {
          notifyPhoneDuplicate(duplicateName);
        }
        onSuccess(optimistic);
        if (!quiet) toast.success("تم إضافة المريض");

        const syncPromise = createPatientOffline(body);
        onSyncStart?.(syncPromise.then((result) => result.patient));
        void syncPromise
          .then((result) => {
            onPatientSynced?.(result.patient);
            if (result.phoneDuplicate) {
              notifyPhoneDuplicate(result.duplicatePatientName);
            }
            void queryClient.invalidateQueries({ queryKey: ["patients"] });
          })
          .catch((e: Error) => toast.error(e.message));
        return optimistic;
      }

      const result = patient
        ? await updatePatientOffline(patient.id, body)
        : await createPatientOffline(body);

      if (quiet) {
        if (result.phoneDuplicate) {
          notifyPhoneDuplicate(result.duplicatePatientName);
        }
        void queryClient.invalidateQueries({ queryKey: ["patients"] });
        onSuccess(result.patient);
        return result.patient;
      }

      finishPatientSave(result.patient, result);
      return result.patient;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل حفظ المريض");
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  function finishPatientSave(
    savedPatient: PatientDto,
    duplicate?: { phoneDuplicate?: boolean; duplicatePatientName?: string | null }
  ) {
    if (duplicate?.phoneDuplicate) {
      notifyPhoneDuplicate(duplicate.duplicatePatientName);
    }
    void queryClient.invalidateQueries({ queryKey: ["patients"] });
    if (savedPatient.id > 0) {
      void queryClient.invalidateQueries({
        queryKey: ["patient", savedPatient.id],
      });
      void queryClient.invalidateQueries({
        queryKey: ["patient-record", savedPatient.id],
      });
    }
    toast.success(patient ? "تم تحديث المريض" : "تم إضافة المريض");
    onSuccess(savedPatient);
  }

  useImperativeHandle(ref, () => ({
    submit: () => submitPatient({ quiet: embedded }),
  }));

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
      if (!embedded) void submitPatient();
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

  const FormTag = embedded ? "div" : "form";

  return (
    <FormTag
      className={compact ? "grid gap-2 sm:grid-cols-2" : "space-y-4"}
      {...(!embedded
        ? {
            onSubmit: (e: React.FormEvent) => {
              e.preventDefault();
              submitPatient();
            },
          }
        : {})}
    >
      <div className={compact ? "space-y-0.5 sm:col-span-2" : "space-y-2 sm:col-span-2"}>
        <Label className={compact ? "rx-label" : undefined}>اسم المريض</Label>
        <Input
          ref={nameRef}
          fieldSize={compact ? "compact" : "default"}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => handleFieldEnter(e, "name")}
          required
        />
      </div>
      {visibility.showGender && (
        <div className={compact ? "space-y-0.5" : "space-y-2"}>
          <Label className={compact ? "rx-label" : undefined}>الجنس</Label>
          <select
            ref={genderRef}
            className={compact ? "rx-select" : "flex h-10 w-full rounded-lg border border-rx-border bg-rx-surface px-3 text-sm"}
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
        <div className={compact ? "space-y-0.5" : "space-y-2"}>
          <Label className={compact ? "rx-label" : undefined}>
            العمر أو تاريخ الميلاد
          </Label>
          <Input
            ref={ageRef}
            fieldSize={compact ? "compact" : "default"}
            value={birthdateInput}
            onChange={(e) => setBirthdateInput(e.target.value)}
            onKeyDown={(e) => handleFieldEnter(e, "age")}
            placeholder="مثال: 35 أو 1990-05-12"
          />
        </div>
      )}
      {visibility.showPhone && (
        <div className={compact ? "space-y-0.5" : "space-y-2"}>
          <Label className={compact ? "rx-label" : undefined}>الهاتف</Label>
          <Input
            ref={phoneRef}
            dir="ltr"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            fieldSize={compact ? "compact" : "default"}
            value={phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            onBlur={handlePhoneBlur}
            onKeyDown={(e) => handleFieldEnter(e, "phone")}
                    placeholder="09xxxxxxxx أو 07xxxxxxxxx"
            className={
              phoneError
                ? "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/20"
                : undefined
            }
          />
          {phoneError && (
            <p className="text-xs text-red-600">{phoneError}</p>
          )}
          {!phoneError && phoneDuplicateHint && (
            <p className="text-xs text-amber-700">{phoneDuplicateHint}</p>
          )}
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
      {personalFields.length > 0 && (
        <div className={compact ? "sm:col-span-2" : "sm:col-span-2"}>
          <PatientDynamicFields
            compact={compact}
            fields={personalFields}
            values={dynamicFieldValues}
            onChange={(fieldId, value) =>
              setDynamicFieldValues((current) => ({
                ...current,
                [fieldId]: value,
              }))
            }
          />
        </div>
      )}
      {!embedded ? (
        <div className={`flex gap-2 ${compact ? "sm:col-span-2" : ""}`}>
          <Button
            type="submit"
            size={compact ? "sm" : "default"}
            tabIndex={compact ? -1 : undefined}
            disabled={isSaving}
          >
            {isSaving ? "جاري الحفظ..." : patient ? "تحديث" : "إضافة"}
          </Button>
          {onCancel ? (
            <Button
              type="button"
              variant="secondary"
              size={compact ? "sm" : "default"}
              tabIndex={compact ? -1 : undefined}
              onClick={onCancel}
            >
              إلغاء
            </Button>
          ) : null}
        </div>
      ) : onCancel ? (
        <div className={`flex gap-2 ${compact ? "sm:col-span-2" : ""}`}>
          <Button
            type="button"
            variant="secondary"
            size={compact ? "sm" : "default"}
            tabIndex={compact ? -1 : undefined}
            onClick={onCancel}
          >
            إلغاء
          </Button>
        </div>
      ) : null}
    </FormTag>
  );
});
