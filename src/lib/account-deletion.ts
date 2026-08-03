export const ACCOUNT_DELETE_PHRASES = {
  ar: "حذف حسابي نهائياً",
  en: "DELETE MY ACCOUNT",
} as const;

export function isValidAccountDeletePhrase(value: string): boolean {
  return Object.values(ACCOUNT_DELETE_PHRASES).includes(
    value as (typeof ACCOUNT_DELETE_PHRASES)[keyof typeof ACCOUNT_DELETE_PHRASES]
  );
}
