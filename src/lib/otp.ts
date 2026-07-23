import { normalizePhoneForAuth } from "./patient-utils";

const CFLOW_BASE = "https://cflow.faya.dev/api/v1/otp";
const TOKEN_TTL_MS = 10 * 60 * 1000; // proof of verified phone, valid 10 min

/** OTP is enforced only when a CFlow key is configured. */
export function isOtpEnabled(): boolean {
  return Boolean(process.env.CFLOW_OTP_KEY);
}

function apiKey(): string {
  const key = process.env.CFLOW_OTP_KEY;
  if (!key) throw new Error("CFLOW_OTP_KEY غير مضبوط");
  return key;
}

function tokenSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET غير مضبوط");
  return secret;
}

/** Canonical phone format used to bind OTP proof tokens (E.164). */
export function otpPhoneKey(phone: string): string {
  return normalizePhoneForAuth(phone);
}

async function cflowRequest(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${CFLOW_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey(),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    // non-JSON error body — fall through with status only
  }
  return { status: res.status, data };
}

const SEND_ERROR_MESSAGES: Record<string, string> = {
  invalid_phone: "رقم الهاتف غير صالح",
  rate_limited: "تجاوزت عدد المحاولات — انتظر قليلاً ثم أعد المحاولة",
  insufficient_credits: "تعذر إرسال الرمز حالياً — تواصل مع الدعم",
  send_failed: "فشل إرسال الرمز عبر واتساب — أعد المحاولة",
  channel_unavailable: "خدمة واتساب غير متاحة حالياً — أعد المحاولة لاحقاً",
  template_not_configured: "خدمة التحقق غير مهيأة — تواصل مع الدعم",
};

export interface OtpSendResult {
  ok: boolean;
  requestId?: string;
  expiresAt?: string;
  error?: string;
  status?: number;
}

export async function sendOtp(phone: string, ref?: string): Promise<OtpSendResult> {
  const { status, data } = await cflowRequest("/send", {
    phone,
    ...(ref ? { ref } : {}),
  });

  if (status === 201 && data.success) {
    return {
      ok: true,
      requestId: String(data.request_id ?? ""),
      expiresAt: data.expires_at ? String(data.expires_at) : undefined,
    };
  }

  const errorCode =
    typeof data.error === "object" && data.error !== null
      ? String((data.error as Record<string, unknown>).code ?? "")
      : String(data.error ?? "");
  return {
    ok: false,
    status,
    error:
      SEND_ERROR_MESSAGES[errorCode] ??
      "تعذر إرسال رمز التحقق — أعد المحاولة",
  };
}

const VERIFY_REASON_MESSAGES: Record<string, string> = {
  invalid_code: "الرمز غير صحيح",
  expired: "انتهت صلاحية الرمز — أرسل رمزاً جديداً",
  max_attempts: "تجاوزت عدد المحاولات — أرسل رمزاً جديداً",
  already_used: "الرمز مستخدم سابقاً — أرسل رمزاً جديداً",
  not_found: "لا يوجد طلب تحقق فعّال — أرسل رمزاً جديداً",
};

export interface OtpVerifyResult {
  valid: boolean;
  error?: string;
  attemptsRemaining?: number;
}

export async function verifyOtp(
  phone: string,
  code: string
): Promise<OtpVerifyResult> {
  const { status, data } = await cflowRequest("/verify", { phone, code });

  if (data.success && data.valid === true) {
    return { valid: true };
  }

  if (status === 429) {
    return { valid: false, error: SEND_ERROR_MESSAGES.rate_limited };
  }

  const reason = String(data.reason ?? "");
  return {
    valid: false,
    error: VERIFY_REASON_MESSAGES[reason] ?? "فشل التحقق من الرمز",
    attemptsRemaining:
      typeof data.attempts_remaining === "number"
        ? data.attempts_remaining
        : undefined,
  };
}

// --- Proof tokens -----------------------------------------------------------
// Short-lived HMAC tokens bound to a phone, e.g. "the OTP code checked out"
// or "the captcha was solved". Register + NextAuth authorize accept these
// instead of re-verifying with the upstream service (codes and captcha
// tokens are single-use, so one flow may need the proof in several places).

// Web Crypto (not node:crypto) so auth.ts stays bundleable for the edge
// middleware runtime.
async function signProof(
  scope: string,
  phoneKey: string,
  expiresAt: number
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(tokenSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${scope}:${phoneKey}:${expiresAt}`)
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function createProofToken(
  scope: string,
  phone: string,
  ttlMs = TOKEN_TTL_MS
): Promise<string> {
  const phoneKey = otpPhoneKey(phone);
  const expiresAt = Date.now() + ttlMs;
  return `${expiresAt}.${await signProof(scope, phoneKey, expiresAt)}`;
}

export async function verifyProofToken(
  scope: string,
  phone: string,
  token: string | null | undefined
): Promise<boolean> {
  if (!token) return false;
  const [expiresRaw, signature] = token.split(".");
  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;
  if (!signature) return false;

  let phoneKey: string;
  try {
    phoneKey = otpPhoneKey(phone);
  } catch {
    return false;
  }

  const expected = await signProof(scope, phoneKey, expiresAt);
  return constantTimeEqual(expected, signature);
}

export function createOtpToken(phone: string): Promise<string> {
  return createProofToken("otp", phone);
}

export function verifyOtpToken(
  phone: string,
  token: string | null | undefined
): Promise<boolean> {
  return verifyProofToken("otp", phone, token);
}
