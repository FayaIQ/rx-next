export const SECRETARY_INVITE_CODE_LENGTH = 8;

export function normalizeSecretaryInviteCode(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}
