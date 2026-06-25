import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { parseAnyRegionalPhone } from "./phone-regions";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizePhone(phone: string): string {
  const trimmed = phone.replace(/\s+/g, "").trim();
  if (!trimmed) return trimmed;

  const parsed = parseAnyRegionalPhone(trimmed);
  if (parsed) return parsed.format("E.164");

  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) return trimmed;

  if (/^07\d{9}$/.test(digits)) return `+964${digits.slice(1)}`;
  if (/^7\d{9}$/.test(digits)) return `+964${digits}`;
  if (digits.startsWith("964")) return `+${digits}`;

  if (/^09\d{8}$/.test(digits)) return `+963${digits.slice(1)}`;
  if (/^9\d{8}$/.test(digits)) return `+963${digits}`;
  if (digits.startsWith("963")) return `+${digits}`;
  if (trimmed.startsWith("0")) return `+963${trimmed.slice(1)}`;

  return trimmed;
}
