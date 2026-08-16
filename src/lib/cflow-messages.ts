import { normalizePhoneForAuth } from "./patient-utils";

const DEFAULT_CFLOW_MESSAGES_URL =
  "https://cflow.faya.dev/api/v1/messages/send";
const DEFAULT_TIMEOUT_MS = 7_000;

export interface CflowWelcomeMessageInput {
  doctorId: string | number;
  name: string;
  phone: string;
}

export interface CflowMessageResult {
  ok: boolean;
  skipped?: boolean;
  status?: number;
}

function cflowMessagesUrl(): string {
  return (
    process.env.CFLOW_MESSAGES_URL?.trim() || DEFAULT_CFLOW_MESSAGES_URL
  ).replace(/\/+$/, "");
}

function cflowTimeoutMs(): number {
  const configured = Number(process.env.CFLOW_MESSAGES_TIMEOUT_MS);
  if (!Number.isFinite(configured)) return DEFAULT_TIMEOUT_MS;
  return Math.min(Math.max(configured, 1_000), 30_000);
}

/**
 * Sends the CFlow welcome template after a doctor account is created.
 * The idempotency key keeps retries or duplicate registration requests from
 * sending the same WhatsApp message twice.
 */
export async function sendCflowWelcomeMessage(
  input: CflowWelcomeMessageInput
): Promise<CflowMessageResult> {
  const key = process.env.CFLOW_MESSAGES_KEY?.trim();
  if (!key) return { ok: false, skipped: true };

  try {
    const response = await fetch(cflowMessagesUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "Idempotency-Key": `rx-doctor-${input.doctorId}-welcome-v1`,
      },
      body: JSON.stringify({
        phone: normalizePhoneForAuth(input.phone),
        name: input.name.trim(),
        variables: [input.name.trim()],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(cflowTimeoutMs()),
    });

    return { ok: response.ok, status: response.status };
  } catch {
    // Registration must remain successful even if CFlow is temporarily down.
    return { ok: false, status: 503 };
  }
}
