"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { PatientForm } from "@/components/patients/patient-form";
import { rxApi, type AppointmentDto, type PatientDto } from "@/lib/api/rx-client";
import {
  createAppointmentOffline,
  updateAppointmentOffline,
  fetchPatientsOfflineFirst,
} from "@/lib/data/offline-api";
import { genderLabel } from "@/lib/patient-utils";

type Props = {
  appointment?: AppointmentDto | null;
  defaultDate?: string;
  onSuccess: () => void;
  onCancel: () => void;
  offline?: boolean;
};

function appointmentPatientToDto(
  patient: NonNullable<AppointmentDto["patient"]>
): PatientDto {
  return {
    id: patient.id,
    name: patient.name,
    gender: patient.gender as "male" | "female",
    birthdate: null,
    diagnosis: null,
    phone: patient.phone,
    doctorId: 0,
    age: patient.age,
    visitCount: 0,
    lastVisit: null,
    createdAt: "",
    updatedAt: "",
  };
}

function splitDatetime(iso?: string, fallbackDate?: string) {
  if (iso) {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return {
      date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    };
  }
  return {
    date: fallbackDate ?? new Date().toISOString().slice(0, 10),
    time: "09:00",
  };
}

export function AppointmentForm({
  appointment,
  defaultDate,
  onSuccess,
  onCancel,
  offline = true,
}: Props) {
  const queryClient = useQueryClient();
  const initial = splitDatetime(
    appointment?.appointmentDatetime,
    defaultDate
  );

  const [patientSearch, setPatientSearch] = useState(
    appointment?.patient?.name ?? ""
  );
  const [selectedPatient, setSelectedPatient] = useState<PatientDto | null>(
    appointment?.patient ? appointmentPatientToDto(appointment.patient) : null
  );
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [notes, setNotes] = useState(appointment?.notes ?? "");
  const [status, setStatus] = useState(appointment?.status ?? true);

  const { data: patientsData } = useQuery({
    queryKey: ["patients", patientSearch],
    queryFn: () => fetchPatientsOfflineFirst(patientSearch || undefined),
  });

  const patients = patientsData ?? [];

  const suggestions = useMemo(() => {
    if (!patientSearch.trim() || selectedPatient) return [];
    return patients.slice(0, 6);
  }, [patientSearch, patients, selectedPatient]);

  function selectPatient(patient: PatientDto) {
    setSelectedPatient(patient);
    setPatientSearch(patient.name);
    setShowNewPatient(false);
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
      return;
    }
    setShowNewPatient(true);
    toast.info("مريض جديد — أكمل البيانات");
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPatient) throw new Error("اختر مريضاً");
      const appointmentDatetime = new Date(`${date}T${time}`).toISOString();
      const payload = {
        patientId: selectedPatient.id,
        appointmentDatetime,
        bookingDate: date,
        notes: notes.trim() || null,
        status,
      };

      if (appointment?.id) {
        if (offline) {
          return updateAppointmentOffline(appointment.id, payload);
        }
        const res = await rxApi.appointments.update(appointment.id, payload);
        return res.appointment;
      }

      if (offline) {
        return createAppointmentOffline(payload);
      }
      const res = await rxApi.appointments.create(payload);
      return res.appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success(appointment ? "تم تحديث الموعد" : "تم حجز الموعد");
      onSuccess();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        saveMutation.mutate();
      }}
    >
      <div className="space-y-2">
        <Label>المريض</Label>
        <div className="flex gap-2">
          <SearchInput
            className="flex-1"
            placeholder="ابحث بالاسم..."
            value={patientSearch}
            onChange={(v) => {
              setPatientSearch(v);
              setSelectedPatient(null);
              if (showNewPatient) setShowNewPatient(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handlePatientEnter();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => {
              setShowNewPatient((v) => !v);
              setSelectedPatient(null);
            }}
          >
            جديد
          </Button>
        </div>

        {patientSearch.trim() && !selectedPatient && !showNewPatient && (
          <p className="text-xs text-rx-muted">
            {suggestions.length > 0 ? "Enter — اختيار" : "Enter — مريض جديد"}
          </p>
        )}

        {suggestions.length > 0 && (
          <ul className="max-h-36 overflow-y-auto rounded-lg border border-rx-form-border bg-rx-surface">
            {suggestions.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="rx-list-item text-sm"
                  onClick={() => selectPatient(p)}
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="mr-2 text-xs text-rx-muted">
                    {genderLabel(p.gender)} · {p.phone ?? "—"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {selectedPatient && !showNewPatient && (
          <p className="rx-patient-chip text-xs">
            <strong>{selectedPatient.name}</strong>
            <span className="text-rx-muted">
              {" "}
              · {genderLabel(selectedPatient.gender)}
              {selectedPatient.phone && (
                <span dir="ltr"> · {selectedPatient.phone}</span>
              )}
            </span>
          </p>
        )}

        {showNewPatient && (
          <div className="rounded-lg border border-dashed border-rx-border p-3">
            <PatientForm
              compact
              initialName={patientSearch.trim()}
              onSuccess={(p) => selectPatient(p)}
              onCancel={() => setShowNewPatient(false)}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>التاريخ</Label>
          <Input
            fieldSize="compact"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label>الوقت</Label>
          <Input
            fieldSize="compact"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label>ملاحظات</Label>
        <Textarea
          fieldSize="compact"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="اختياري..."
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-rx-text-secondary">
        <input
          type="checkbox"
          className="size-4 rounded border-rx-border"
          checked={status}
          onChange={(e) => setStatus(e.target.checked)}
        />
        موعد نشط
      </label>

      <div className="flex gap-2 border-t border-rx-border/80 pt-3">
        <Button
          type="submit"
          size="sm"
          disabled={saveMutation.isPending || !selectedPatient}
        >
          {appointment ? "حفظ" : "حجز الموعد"}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          إلغاء
        </Button>
      </div>
    </form>
  );
}
