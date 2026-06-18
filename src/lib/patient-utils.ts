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
  };
}

export function genderLabel(gender: "male" | "female"): string {
  return gender === "male" ? "ذكر" : "أنثى";
}

export function toDateInputValue(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
