import { fromDbId } from "@/lib/bigint";
import { formatAge, genderLabel } from "@/lib/patient-utils";

export type AppointmentDto = {
  id: number;
  doctorId: number;
  patientId: number;
  appointmentDatetime: string;
  bookingDate: string | null;
  notes: string | null;
  status: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  patient?: {
    id: number;
    name: string;
    phone: string | null;
    gender: string;
    age: string;
  };
};

export function serializeAppointment(
  appointment: {
    id: bigint | number;
    doctorId: bigint | number;
    patientId: bigint | number;
    appointmentDatetime: Date;
    bookingDate: Date | null;
    notes: string | null;
    status: boolean;
    createdAt?: Date | null;
    updatedAt?: Date | null;
    patient?: {
      id: bigint | number;
      name: string;
      phone: string | null;
      gender: string;
      birthdate: Date | null;
    };
  }
): AppointmentDto {
  return {
    id: fromDbId(appointment.id),
    doctorId: fromDbId(appointment.doctorId),
    patientId: fromDbId(appointment.patientId),
    appointmentDatetime: appointment.appointmentDatetime.toISOString(),
    bookingDate: appointment.bookingDate?.toISOString() ?? null,
    notes: appointment.notes,
    status: appointment.status,
    createdAt: appointment.createdAt?.toISOString() ?? null,
    updatedAt: appointment.updatedAt?.toISOString() ?? null,
    patient: appointment.patient
      ? {
          id: fromDbId(appointment.patient.id),
          name: appointment.patient.name,
          phone: appointment.patient.phone,
          gender: appointment.patient.gender,
          age: formatAge(appointment.patient.birthdate),
        }
      : undefined,
  };
}

export function appointmentPatientLabel(dto: AppointmentDto): string {
  if (!dto.patient) return "—";
  return `${dto.patient.name} — ${genderLabel(dto.patient.gender as "male" | "female")}`;
}
