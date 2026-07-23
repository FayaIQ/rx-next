import { parsePhoneNumberFromString } from "libphonenumber-js";

export type PhoneRegion = "SY" | "IQ";

// New input is Iraqi-only; SY parsing helpers remain for matching legacy records.
export const PHONE_REGIONS: PhoneRegion[] = ["IQ"];

/** Infer E.164 candidate for regional parsing. */
export function phoneCandidate(raw: string, region: PhoneRegion): string {
  const digits = raw.replace(/\D/g, "");
  if (raw.startsWith("+")) return raw;

  if (region === "IQ") {
    if (digits.startsWith("964")) return `+${digits}`;
    if (/^07\d{9}$/.test(digits)) return `+964${digits.slice(1)}`;
    if (/^7\d{9}$/.test(digits)) return `+964${digits}`;
  }

  if (region === "SY") {
    if (digits.startsWith("963")) return `+${digits}`;
    if (/^09\d{8}$/.test(digits)) return `+963${digits.slice(1)}`;
    if (/^9\d{8}$/.test(digits)) return `+963${digits}`;
    if (digits.startsWith("0")) return `+963${digits.slice(1)}`;
  }

  return raw;
}

export function parseRegionalPhone(raw: string, region: PhoneRegion) {
  return (
    parsePhoneNumberFromString(phoneCandidate(raw, region), region) ??
    parsePhoneNumberFromString(raw, region)
  );
}

/** E.164 for any valid international "+…" number, else null. */
export function parseInternationalPhone(raw: string): string | null {
  const parsed = parsePhoneNumberFromString(raw);
  return parsed?.isValid() ? parsed.format("E.164") : null;
}

export function parseAnyRegionalPhone(raw: string) {
  for (const region of PHONE_REGIONS) {
    const parsed = parseRegionalPhone(raw, region);
    if (parsed?.isValid()) return parsed;
  }
  return null;
}
