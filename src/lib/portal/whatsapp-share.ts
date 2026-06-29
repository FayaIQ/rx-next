import { parsePatientPhoneInput } from "@/lib/patient-utils";

export function phoneDigitsForWhatsApp(
  phone: string | null | undefined
): string | null {
  if (!phone?.trim()) return null;
  const { normalized } = parsePatientPhoneInput(phone);
  if (!normalized) return null;
  return normalized.replace(/\D/g, "");
}

export function buildPortalShareMessage(
  patientName: string,
  portalUrl: string,
  instructions?: string | null
): string {
  const lines = [
    `مرحباً ${patientName}،`,
    "",
    "يمكنك الاطلاع على بوابة المريض والتعليمات عبر الرابط:",
    portalUrl,
  ];

  if (instructions?.trim()) {
    lines.splice(
      3,
      0,
      "",
      "تعليمات ما بعد العلاج:",
      instructions.trim()
    );
  }

  return lines.join("\n");
}

export function buildWhatsAppShareUrl(
  phone: string | null | undefined,
  message: string
): string | null {
  const digits = phoneDigitsForWhatsApp(phone);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
