/** Country codes selectable on the auth pages. Iraq is the default. */
export interface PhoneCountry {
  iso: string;
  dial: string;
  flag: string;
  nameAr: string;
  nameEn: string;
  /** Example local number shown as the input placeholder. */
  placeholder: string;
}

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: "IQ", dial: "+964", flag: "🇮🇶", nameAr: "العراق", nameEn: "Iraq", placeholder: "7xxxxxxxxx" },
  { iso: "SY", dial: "+963", flag: "🇸🇾", nameAr: "سوريا", nameEn: "Syria", placeholder: "9xxxxxxxx" },
  { iso: "JO", dial: "+962", flag: "🇯🇴", nameAr: "الأردن", nameEn: "Jordan", placeholder: "7xxxxxxxx" },
  { iso: "KW", dial: "+965", flag: "🇰🇼", nameAr: "الكويت", nameEn: "Kuwait", placeholder: "5xxxxxxx" },
  { iso: "SA", dial: "+966", flag: "🇸🇦", nameAr: "السعودية", nameEn: "Saudi Arabia", placeholder: "5xxxxxxxx" },
  { iso: "AE", dial: "+971", flag: "🇦🇪", nameAr: "الإمارات", nameEn: "UAE", placeholder: "5xxxxxxxx" },
  { iso: "QA", dial: "+974", flag: "🇶🇦", nameAr: "قطر", nameEn: "Qatar", placeholder: "3xxxxxxx" },
  { iso: "BH", dial: "+973", flag: "🇧🇭", nameAr: "البحرين", nameEn: "Bahrain", placeholder: "3xxxxxxx" },
  { iso: "OM", dial: "+968", flag: "🇴🇲", nameAr: "عُمان", nameEn: "Oman", placeholder: "9xxxxxxx" },
  { iso: "LB", dial: "+961", flag: "🇱🇧", nameAr: "لبنان", nameEn: "Lebanon", placeholder: "3xxxxxx" },
  { iso: "PS", dial: "+970", flag: "🇵🇸", nameAr: "فلسطين", nameEn: "Palestine", placeholder: "5xxxxxxxx" },
  { iso: "YE", dial: "+967", flag: "🇾🇪", nameAr: "اليمن", nameEn: "Yemen", placeholder: "7xxxxxxxx" },
  { iso: "EG", dial: "+20", flag: "🇪🇬", nameAr: "مصر", nameEn: "Egypt", placeholder: "10xxxxxxxx" },
  { iso: "TR", dial: "+90", flag: "🇹🇷", nameAr: "تركيا", nameEn: "Turkey", placeholder: "5xxxxxxxxx" },
  { iso: "IR", dial: "+98", flag: "🇮🇷", nameAr: "إيران", nameEn: "Iran", placeholder: "9xxxxxxxxx" },
  { iso: "GB", dial: "+44", flag: "🇬🇧", nameAr: "بريطانيا", nameEn: "UK", placeholder: "7xxxxxxxxx" },
  { iso: "DE", dial: "+49", flag: "🇩🇪", nameAr: "ألمانيا", nameEn: "Germany", placeholder: "15xxxxxxxxx" },
  { iso: "SE", dial: "+46", flag: "🇸🇪", nameAr: "السويد", nameEn: "Sweden", placeholder: "7xxxxxxxx" },
  { iso: "US", dial: "+1", flag: "🇺🇸", nameAr: "أمريكا", nameEn: "USA", placeholder: "2xxxxxxxxx" },
];

export const DEFAULT_PHONE_COUNTRY = PHONE_COUNTRIES[0];

/** Combine a dial code and a local number into E.164-ish input (+9647…). */
export function composeInternationalPhone(dial: string, local: string): string {
  const digits = local.replace(/\D/g, "").replace(/^0+/, "");
  return `${dial}${digits}`;
}
