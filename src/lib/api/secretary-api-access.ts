/**
 * مسارات API المسموح بها للسكرتير: مواعيد، مرضى (أساسي)، مالية، مزامنة.
 * باقي المسارات (وصفات، علاج، طبلة، تقارير…) للطبيب فقط.
 */
const SECRETARY_API_ALLOW: RegExp[] = [
  /^\/api\/appointments(\/|$)/,
  /^\/api\/patients$/,
  /^\/api\/patients\/check-phone$/,
  /^\/api\/patients\/\d+$/,
  /^\/api\/finances(\/|$)/,
  /^\/api\/sync\/(bulk|changes|hydrate)$/,
  /^\/api\/secretary(\/|$)/,
  /^\/api\/settings\/profile$/,
  /^\/api\/fields$/,
];

export function isSecretaryApiAllowed(pathname: string): boolean {
  return SECRETARY_API_ALLOW.some((re) => re.test(pathname));
}
