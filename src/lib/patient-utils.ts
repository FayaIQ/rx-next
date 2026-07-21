import {
  parseRegionalPhone,
  PHONE_REGIONS,
} from "./phone-regions";

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export function normalizeDigits(input: string): string {
  return input.replace(/[٠-٩۰-۹]/g, (ch) => {
    const ar = ARABIC_DIGITS.indexOf(ch);
    if (ar >= 0) return String(ar);
    const fa = PERSIAN_DIGITS.indexOf(ch);
    return fa >= 0 ? String(fa) : ch;
  });
}

export function parseBirthdateInput(input?: string | null): Date | null {
  if (!input?.trim()) return null;

  const normalized = normalizeDigits(input.trim());

  if (/^\d{1,3}$/.test(normalized)) {
    const age = Number(normalized);
    if (age >= 1 && age <= 130) {
      const now = new Date();
      return new Date(
        now.getFullYear() - age,
        now.getMonth(),
        now.getDate()
      );
    }
  }

  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  const parts = normalized.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const [a, b, c] = parts.map(Number);
    if (a > 31) {
      const d = new Date(a, b - 1, c);
      if (!Number.isNaN(d.getTime())) return d;
    }
    const d = new Date(c, b - 1, a);
    if (!Number.isNaN(d.getTime())) return d;
  }

  return null;
}

export function computeAgeYears(
  birthdate: Date | string | null | undefined
): number | null {
  if (!birthdate) return null;
  const birth = birthdate instanceof Date ? birthdate : new Date(birthdate);
  if (Number.isNaN(birth.getTime())) return null;

  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    years -= 1;
  }
  return years >= 0 ? years : null;
}

/** YYYY-MM-DD for API / local storage */
export function serializeBirthdateInput(input?: string | null): string | null {
  const parsed = parseBirthdateInput(input);
  if (!parsed) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
}

/** Display value when editing an existing patient */
export function birthdateToFormInput(
  birthdate: string | null | undefined
): string {
  if (!birthdate?.trim()) return "";
  const trimmed = birthdate.trim();
  if (/^\d{1,3}$/.test(normalizeDigits(trimmed))) return trimmed;

  const years = computeAgeYears(trimmed);
  if (years !== null && years >= 1) return String(years);

  const parsed = parseBirthdateInput(trimmed);
  if (parsed) return serializeBirthdateInput(trimmed) ?? trimmed;
  return trimmed;
}

export function formatAge(birthdate: Date | string | null | undefined): string {
  if (!birthdate) return "—";
  const birth = birthdate instanceof Date ? birthdate : new Date(birthdate);
  if (Number.isNaN(birth.getTime())) return "—";

  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();

  if (days < 0) {
    months -= 1;
    days += 30;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years > 0) return `${years} سنة`;
  if (months > 0) return `${months} شهر`;
  return `${Math.max(days, 0)} يوم`;
}

export function buildOptimisticPatient(body: {
  name: string;
  gender: "male" | "female";
  birthdate: string | null;
  diagnosis?: string | null;
  phone?: string | null;
  fieldValues?: Array<{ patientFieldId: number; value: string }>;
}) {
  const now = new Date().toISOString();
  return {
    id: 0,
    name: body.name,
    gender: body.gender,
    birthdate: body.birthdate,
    diagnosis: body.diagnosis ?? null,
    phone: body.phone ?? null,
    doctorId: 0,
    age: formatAge(body.birthdate),
    visitCount: 0,
    lastVisit: null,
    createdAt: now,
    updatedAt: now,
    fieldValues: body.fieldValues ?? [],
  };
}

export function genderLabel(
  gender: "male" | "female",
  locale: "ar" | "en" = "ar"
): string {
  if (locale === "en") return gender === "male" ? "Male" : "Female";
  return gender === "male" ? "ذكر" : "أنثى";
}

/** Calendar day key for grouping prescriptions into visits. */
export function prescriptionDayKey(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** A visit = at least one prescription on a distinct calendar day. */
export function countVisitsFromDates(
  dates: Array<Date | string | null | undefined>
): number {
  const days = new Set<string>();
  for (const date of dates) {
    if (!date) continue;
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) continue;
    days.add(prescriptionDayKey(d));
  }
  return days.size;
}

export function visitCountLabel(
  count: number,
  locale: "ar" | "en" = "ar"
): string {
  if (locale === "en") {
    if (count === 1) return "1 visit";
    return `${count} visits`;
  }
  if (count === 1) return "زيارة واحدة";
  if (count === 2) return "زيارتان";
  return `${count} زيارات`;
}

export function toDateInputValue(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatPrescriptionDateTime(
  value: string,
  locale: "ar" | "en" = "ar"
): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(locale === "en" ? "en-GB" : "ar-IQ", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    numberingSystem: "latn",
  });
}

/** Date on the printed prescription — Latin numerals, no sequence number. */
export function formatPrescriptionDate(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

/** Validate and normalize Syrian / Iraqi patient phone. Empty input is allowed. */
export function parsePatientPhoneInput(raw: string): {
  normalized: string | null;
  error: string | null;
} {
  const trimmed = normalizeDigits(raw).replace(/[\s\-().]/g, "").trim();
  if (!trimmed) return { normalized: null, error: null };

  for (const region of PHONE_REGIONS) {
    const parsed = parseRegionalPhone(trimmed, region);
    if (parsed?.isValid()) {
      return { normalized: parsed.format("E.164"), error: null };
    }
  }

  const digits = trimmed.replace(/\D/g, "");

  const iraqiLocal = digits.replace(/^964/, "").replace(/^0+/, "");
  if (/^7\d{9}$/.test(iraqiLocal)) {
    return { normalized: `+964${iraqiLocal}`, error: null };
  }

  const syrianLocal = digits.replace(/^963/, "").replace(/^0+/, "");
  if (/^9\d{8}$/.test(syrianLocal)) {
    return { normalized: `+963${syrianLocal}`, error: null };
  }

  return {
    normalized: null,
    error: "رقم الهاتف غير صالح — مثال: 07xxxxxxxxx",
  };
}

export function phonesMatch(a: string, b: string): boolean {
  const left = parsePatientPhoneInput(a).normalized;
  const right = parsePatientPhoneInput(b).normalized;
  if (!left || !right) return false;
  return left === right;
}

/** All DB-stored formats that may match the same Syrian/Iraqi mobile number. */
export function getPhoneLookupVariants(phone: string): string[] {
  const trimmed = normalizeDigits(phone).replace(/[\s\-().]/g, "").trim();
  if (!trimmed) return [];

  const variants = new Set<string>([trimmed]);
  const digits = trimmed.replace(/\D/g, "");
  if (digits) variants.add(digits);

  const { normalized: e164 } = parsePatientPhoneInput(trimmed);
  if (e164) variants.add(e164);

  function addRegionalVariants(prefix: "+963" | "+964", local: string) {
    const bare = prefix.slice(1);
    variants.add(`${prefix}${local}`);
    variants.add(`${bare}${local}`);
    variants.add(`0${local}`);
    variants.add(local);
  }

  if (e164?.startsWith("+963")) {
    addRegionalVariants("+963", e164.slice(4));
  } else if (e164?.startsWith("+964")) {
    addRegionalVariants("+964", e164.slice(4));
  }

  if (/^09\d{8}$/.test(digits)) {
    addRegionalVariants("+963", digits.slice(1));
  } else if (/^9\d{8}$/.test(digits)) {
    addRegionalVariants("+963", digits);
  } else if (/^07\d{9}$/.test(digits)) {
    addRegionalVariants("+964", digits.slice(1));
  } else if (/^7\d{9}$/.test(digits)) {
    addRegionalVariants("+964", digits);
  } else if (digits.startsWith("963") && digits.length >= 11) {
    addRegionalVariants("+963", digits.slice(3));
  } else if (digits.startsWith("964") && digits.length >= 12) {
    addRegionalVariants("+964", digits.slice(3));
  } else if (trimmed.startsWith("+963")) {
    addRegionalVariants("+963", trimmed.slice(4).replace(/\D/g, ""));
  } else if (trimmed.startsWith("+964")) {
    addRegionalVariants("+964", trimmed.slice(4).replace(/\D/g, ""));
  }

  return [...variants].filter((v) => v.length > 0);
}

export function normalizePhoneForAuth(phone: string): string {
  const { normalized, error } = parsePatientPhoneInput(phone);
  if (normalized) return normalized;
  throw new Error(error ?? "رقم الهاتف غير صالح");
}

export function normalizePatientPhoneForSave(
  phone: string | null | undefined
): string | null {
  if (phone == null || !String(phone).trim()) return null;
  const { normalized, error } = parsePatientPhoneInput(String(phone));
  if (error || !normalized) return null;
  return normalized;
}
