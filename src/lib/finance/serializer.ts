import type {
  ClinicFinanceSettings,
  FinanceTransaction,
  Patient,
} from "@prisma/client";
import { fromDbId } from "@/lib/bigint";

type TransactionRow = FinanceTransaction & {
  patient?: Pick<Patient, "id" | "name"> | null;
};

function decimalToNumber(value: { toString: () => string } | number): number {
  return Number(value);
}

export function serializeFinanceSettings(row: ClinicFinanceSettings) {
  return {
    id: fromDbId(row.id),
    doctorId: fromDbId(row.doctorId),
    consultationFee: decimalToNumber(row.consultationFee),
    followUpFee: decimalToNumber(row.followUpFee),
    procedureFee: decimalToNumber(row.procedureFee),
    currency: row.currency,
    updatedAt: row.updatedAt?.toISOString() ?? null,
  };
}

export function serializeFinanceTransaction(row: TransactionRow) {
  return {
    id: fromDbId(row.id),
    doctorId: fromDbId(row.doctorId),
    patientId: row.patientId ? fromDbId(row.patientId) : null,
    appointmentId: row.appointmentId ? fromDbId(row.appointmentId) : null,
    prescriptionId: row.prescriptionId ? fromDbId(row.prescriptionId) : null,
    type: row.type as "income" | "expense",
    category: row.category,
    amount: decimalToNumber(row.amount),
    paymentMethod: row.paymentMethod,
    description: row.description,
    transactionDate: row.transactionDate.toISOString().slice(0, 10),
    createdById: row.createdById ? fromDbId(row.createdById) : null,
    createdAt: row.createdAt?.toISOString() ?? null,
    updatedAt: row.updatedAt?.toISOString() ?? null,
    patient: row.patient
      ? { id: fromDbId(row.patient.id), name: row.patient.name }
      : null,
  };
}

export type FinanceSettingsDto = ReturnType<typeof serializeFinanceSettings>;
export type FinanceTransactionDto = ReturnType<
  typeof serializeFinanceTransaction
>;
