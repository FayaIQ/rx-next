import { apiOk } from "@/lib/api/response";

// Compatibility for older signup clients. Registration no longer sends OTP.
export async function POST() {
  return apiOk({ enabled: false });
}
