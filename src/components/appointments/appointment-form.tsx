"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PatientForm } from "@/components/patients/patient-form";
import { rxApi, type AppointmentDto, type PatientDto } from "@/lib/api/rx-client";
import {
  createAppointmentOffline,
  updateAppointmentOffline,
  fetchPatientsOfflineFirst,
} from "@/lib/data/offline-api";
import { toDateInputValue, genderLabel } from "@/lib/patient-utils";

type Props = {
  appointment?: AppointmentDto | null;
  defaultDate?: string;
  onSuccess: () => void;
  onCancel: () => void;
  offline?: boolean;
};

export function AppointmentForm({
  appointment,
  defaultDate,
  onSuccess,
  onCancel,
  offline = true,
}: Props) {
  const queryClient = useQueryClient();
  const [patientSearch, setPatientSearch] = useState(
    appointment?.patient?.name ?? ""
  );
  const [selectedPatient, setSelectedPatient] = useState<PatientDto | null>(
    appointment?.patient
      ? {
          id: appointment.patient.id,
          name: appointment.patient.name,
          gender: appointment.patient.gender as "male" | "female",
          birthdate: null,
          diagnosis: null,
          phone: appointment.patient.phone,
          doctorId: 0,
          age: appointment.patient.age,
          visitCount: 0,
          lastVisit: null,
          createdAt: "",
          updatedAt: "",
        }
      : null
  );
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [datetime, setDatetime] = useState(
    appointment
      ? toDateInputValue(appointment.appointmentDatetime)
      : defaultDate
        ? `${defaultDate}T09:00`
        : toDateInputValue(new Date())
  );
  const [notes, setNotes] = useState(appointment?.notes ?? "");
  const [status, setStatus] = useState(appointment?.status ?? true);

  const { data: patientsData } = useQuery({
    queryKey: ["patients", patientSearch],
    queryFn: () => fetchPatientsOfflineFirst(patientSearch || undefined),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPatient) throw new Error("اختر مريضاً");
      const payload = {
        patientId: selectedPatient.id,
        appointmentDatetime: new Date(datetime).toISOString(),
        bookingDate: new Date(datetime).toISOString().slice(0, 10),
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

  const patients = patientsData ?? [];

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        saveMutation.mutate();
      }}
    >
      <div className="space-y-2">
        <Label>المريض</Label>
        <Input
          placeholder="ابحث بالاسم..."
          value={patientSearch}
          onChange={(e) => {
            setPatientSearch(e.target.value);
            setSelectedPatient(null);
          }}
        />
        {patientSearch && !selectedPatient && patients.length > 0 && (
          <div className="max-h-36 overflow-y-auto rounded-lg border bg-white shadow-sm">
            {patients.slice(0, 8).map((p) => (
              <button
                key={p.id}
                type="button"
                className="block w-full px-3 py-2 text-right text-sm hover:bg-gray-50"
                onClick={() => {
                  setSelectedPatient(p);
                  setPatientSearch(p.name);
                }}
              >
                {p.name} — {genderLabel(p.gender)} — {p.phone ?? "—"}
              </button>
            ))}
          </div>
        )}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setShowNewPatient(!showNewPatient)}
        >
          مريض جديد
        </Button>
        {showNewPatient && (
          <div className="rounded-lg border border-dashed p-3">
            <PatientForm
              compact
              onSuccess={(p) => {
                setSelectedPatient(p);
                setPatientSearch(p.name);
                setShowNewPatient(false);
              }}
              onCancel={() => setShowNewPatient(false)}
            />
          </div>
        )}
      </div>

      <div className="space-y-1">
        <Label>تاريخ ووقت الموعد</Label>
        <Input
          type="datetime-local"
          value={datetime}
          onChange={(e) => setDatetime(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1">
        <Label>ملاحظات</Label>
        <Textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="ملاحظات اختيارية..."
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={status}
          onChange={(e) => setStatus(e.target.checked)}
        />
        موعد نشط (غير ملغى)
      </label>

      <div className="flex gap-2">
        <Button type="submit" disabled={saveMutation.isPending}>
          {appointment ? "حفظ التعديل" : "حجز الموعد"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          إلغاء
        </Button>
      </div>
    </form>
  );
}
