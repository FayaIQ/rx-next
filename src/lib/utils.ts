import { type ClassValue, clsx } from "clsx";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizePhone(phone: string): string {
  const trimmed = phone.replace(/\s+/g, "").trim();
  const parsed = parsePhoneNumberFromString(trimmed, "SY");
  if (parsed?.isValid()) return parsed.format("E.164");
  if (trimmed.startsWith("+")) return trimmed;
  if (trimmed.startsWith("0")) return `+963${trimmed.slice(1)}`;
  // Syrian mobile without country code: 9XXXXXXXX
  if (/^9\d{8}$/.test(trimmed)) return `+963${trimmed}`;
  return trimmed;
}
