import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { parsePatientPhoneInput } from "./patient-utils";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizePhone(phone: string): string {
  const { normalized } = parsePatientPhoneInput(phone);
  if (normalized) return normalized;

  const trimmed = phone.replace(/\s+/g, "").trim();
  return trimmed;
}
