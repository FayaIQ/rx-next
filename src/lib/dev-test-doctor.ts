/** Repeatable local-only doctor account used to exercise the onboarding flow. */
export const DEV_TEST_DOCTOR_PHONE = "07700000000";
export const DEV_TEST_ACCOUNT_DELETE_OTP = "000000";

export const IS_DEV_TEST_DOCTOR_ENABLED =
  process.env.NODE_ENV !== "production";

function asciiDigits(value: string) {
  const arabic = "٠١٢٣٤٥٦٧٨٩";
  const persian = "۰۱۲۳۴۵۶۷۸۹";

  return value
    .replace(/[٠-٩۰-۹]/g, (digit) => {
      const arabicIndex = arabic.indexOf(digit);
      if (arabicIndex >= 0) return String(arabicIndex);
      return String(persian.indexOf(digit));
    })
    .replace(/\D/g, "");
}

export function isDevTestDoctorPhone(phone: string) {
  if (!IS_DEV_TEST_DOCTOR_ENABLED) return false;

  const digits = asciiDigits(phone);
  return (
    digits === "07700000000" ||
    digits === "7700000000" ||
    digits === "9647700000000"
  );
}
