import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { NextResponse } from "next/server";
import { trackTrialSignup } from "../google-ads";
import { analyticsContext, analyticsRoute, isAnalyticsHost } from "../analytics";

let validSession = true;
let activeSubscription = true;
let databaseUnavailable = false;
let schemaCalls = 0;
let measured: Record<string, unknown> | undefined;
let schemaFails = false;
let welcomeCalls = 0;
let deferred: (() => Promise<void>) | undefined;
let userType = "doctor";
let captchaRequired = false;
let readinessUnavailable = false;
const session = () => ({ user: { id: 17, type: userType, sessionId: "real-session", doctorId: 17 } });

mock.module("../../auth.ts", { namedExports: { auth: async () => session() } });
mock.module("next/navigation", { namedExports: { redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); } } });
mock.module("next/server", { namedExports: { NextResponse, after: (callback: () => Promise<void>) => { deferred = callback; } } });
mock.module("../subscription.ts", { namedExports: { isSubscriptionActive: async () => {
  if (databaseUnavailable) throw new Error("connection lost");
  return activeSubscription;
} } });
mock.module("../auth-credentials.ts", { namedExports: {
  validateSession: async () => { if (databaseUnavailable) throw new Error("connection lost"); return validSession; },
  registerSecretary: async () => ({ id: 18n, name: "Test secretary", phoneNumber: "+9647001234568" }),
  registerDoctor: async () => ({ id: 17n, name: "Test doctor", phoneNumber: "+9647001234567" }),
} });
mock.module("../prisma.ts", { namedExports: { prisma: {
  $queryRaw: async () => { if (readinessUnavailable) throw new Error("private database details"); return []; },
  clinicAcquisition: { findUnique: async () => ({ practiceType: "general", accountMode: "real" }) },
  productMeasurement: { upsert: async (args: { create: Record<string, unknown> }) => { measured = args.create; return measured; } },
  user: { findUnique: async () => ({ isConfirmed: true, doctorId: 17n }) },
  $executeRawUnsafe: async () => { schemaCalls++; if (schemaFails) throw new Error("connection lost"); },
} } });
mock.module("../turnstile.ts", { namedExports: { isTurnstileEnabled: () => captchaRequired, verifyTurnstileToken: async (token: string) => token === "review-human" } });
mock.module("../cflow-messages.ts", { namedExports: { sendCflowWelcomeMessage: async () => { welcomeCalls++; throw new Error("provider unavailable"); } } });

const { requireAuth, requireSubscription, requireSecretaryArea } = await import("../auth-server");
const { ensureClinicFeaturesReady } = await import("../clinic-features");
const { POST } = await import("../../app/api/auth/register/route");

test("analytics excludes local and lookalike hosts and labels sensitive routes without their values", () => {
  assert.equal(isAnalyticsHost("rx.faya.dev"), true);
  for (const host of ["localhost", "127.0.0.1", "preview.faya.dev", "rx.faya.dev.attacker.test"]) assert.equal(isAnalyticsHost(host), false);
  assert.equal(analyticsRoute("/patients/273/record?phone=123"), "/patients/:id/record");
  assert.equal(analyticsRoute("/portal/secret-token?x=1"), "/portal/:token");
  assert.equal(analyticsContext("/home", { type: "doctor", sessionId: "rx-public-demo-session" }).account_mode, "demo");
  assert.equal(analyticsContext("/home", { type: "doctor", sessionId: "real" }).area, "clinic");
  assert.equal(analyticsContext("/dashboard", { type: "admin", sessionId: "real" }).area, "admin");
  assert.equal(analyticsContext("/", undefined).area, "marketing");
  assert.equal(analyticsContext("/home", { type: "doctor", sessionId: "real", phoneNumber: "+9647700000000" }).account_mode, "test");
});

test("an invalid session cannot be mistaken for a database connection failure", async () => {
  validSession = false;
  await assert.rejects(requireAuth(), /REDIRECT:\/auth\/signin\?error=session_expired/);
  validSession = true;
});

test("expired doctor and secretary subscriptions both redirect", async () => {
  activeSubscription = false;
  await assert.rejects(requireSubscription(), /REDIRECT:\/subscription\/expired/);
  userType = "secretary";
  await assert.rejects(requireSecretaryArea(), /REDIRECT:\/subscription\/expired/);
  userType = "doctor";
  activeSubscription = true;
});

test("a real database outage retains the existing offline fallback", async () => {
  databaseUnavailable = true;
  assert.equal((await requireSubscription()).user.id, 17);
  databaseUnavailable = false;
});

test("schema setup retries failures and shares successful work across callers", async () => {
  schemaFails = true;
  await assert.rejects(ensureClinicFeaturesReady(), /connection lost/);
  schemaFails = false;
  await Promise.all([ensureClinicFeaturesReady(), ensureClinicFeaturesReady(), ensureClinicFeaturesReady()]);
  await ensureClinicFeaturesReady();
  assert.equal(schemaCalls, 2);
});

test("a saved account succeeds before welcome delivery, including provider failure", async () => {
  const response = await POST(new Request("http://localhost/api/auth/register", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test doctor", phone: "+9647001234567", password: "a-strong-password", practiceType: "general" }),
  }));
  assert.equal(response.status, 201);
  assert.equal((await response.json()).success, true);
  assert.equal(welcomeCalls, 0);
  assert.ok(deferred);
  await deferred();
  assert.equal(welcomeCalls, 1);
});


test("conversion tracking reports the actual method and cannot break registration", () => {
  const calls: unknown[][] = [];
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  const oldEnvironment = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    Object.defineProperty(globalThis, "window", { configurable: true, value: { location: { hostname: "rx.faya.dev" }, gtag: (...args: unknown[]) => calls.push(args) } });
    trackTrialSignup();
    assert.equal((calls[0][2] as { method: string }).method, "password");
    Object.defineProperty(globalThis, "window", { configurable: true, value: { location: { hostname: "rx.faya.dev" }, gtag: () => { throw new Error("blocked"); } } });
    assert.doesNotThrow(() => trackTrialSignup());
  } finally {
    if (oldEnvironment == null) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldEnvironment;
    if (original) Object.defineProperty(globalThis, "window", original);
    else Reflect.deleteProperty(globalThis, "window");
  }
});


test("telemetry rejects foreign origin and clinical text, normalizes routes and drops portals", async () => {
  const previous = process.env.RX_ANALYTICS_TEST_MODE; process.env.RX_ANALYTICS_TEST_MODE = "true";
  const { POST: ingest } = await import("../../app/api/analytics/telemetry/route");
  const payload = { id: "review-metric", route: "/patients/273/record?phone=private", metric: "LCP", value: 2500, device: "mobile" };
  const request = (data: unknown, origin = "http://localhost") => new Request("http://localhost/api/analytics/telemetry", { method: "POST", headers: { "Content-Type": "application/json", origin, "user-agent": "FBAV/123" }, body: JSON.stringify(data) });
  try {
    assert.equal((await ingest(request(payload, "https://other.example"))).status, 403);
    assert.equal((await ingest(request({ ...payload, patientName: "private" }))).status, 400);
    assert.equal((await ingest(request(payload))).status, 204);
    assert.equal(measured?.route, "/patients/:id/record"); assert.equal(measured?.browser, "Facebook");
    measured = undefined;
    assert.equal((await ingest(request({ ...payload, route: "/portal/secret-token" }))).status, 204);
    assert.equal(measured, undefined);
  } finally { if (previous == null) delete process.env.RX_ANALYTICS_TEST_MODE; else process.env.RX_ANALYTICS_TEST_MODE = previous; }
});


test("removed signup OTP cannot be restored by a stale environment flag", async () => {
  const previousFlag = process.env.SIGNUP_OTP_ENABLED;
  const previousKey = process.env.CFLOW_OTP_KEY;
  process.env.SIGNUP_OTP_ENABLED = "true";
  process.env.CFLOW_OTP_KEY = "local-test-only";
  try {
    const { POST: send } = await import("../../app/api/auth/otp/send/route");
    const { POST: verify } = await import("../../app/api/auth/otp/verify/route");
    assert.deepEqual(await (await send()).json(), { enabled: false });
    assert.equal((await verify()).status, 410);
    const response = await POST(new Request("http://localhost/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Password doctor", phone: "+9647001234567", password: "strong-password", practiceType: "general" }) }));
    assert.equal(response.status, 201);
  } finally {
    if (previousFlag == null) delete process.env.SIGNUP_OTP_ENABLED; else process.env.SIGNUP_OTP_ENABLED = previousFlag;
    if (previousKey == null) delete process.env.CFLOW_OTP_KEY; else process.env.CFLOW_OTP_KEY = previousKey;
  }
});


test("password signup still enforces configured captcha for doctor and secretary", async () => {
  const { POST: secretarySignup } = await import("../../app/api/auth/secretary/register/route");
  const payload = { name: "Password account", phone: "+9647001234567", password: "strong-password", practiceType: "general" };
  const request = (token?: string) => new Request("http://localhost/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, ...(token ? { turnstileToken: token } : {}) }) });
  captchaRequired = true;
  try {
    assert.equal((await POST(request())).status, 401);
    assert.equal((await secretarySignup(request())).status, 401);
    assert.equal((await POST(request("review-human"))).status, 201);
    assert.equal((await secretarySignup(request("review-human"))).status, 200);
  } finally { captchaRequired = false; }
});


test("production readiness is uncached and never exposes private database details", async () => {
  const { GET } = await import("../../app/api/health/route");
  const response = await GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal((await response.json()).status, "ok");
  readinessUnavailable = true;
  try {
    const failed = await GET();
    assert.equal(failed.status, 503);
    const data = await failed.json();
    assert.equal(data.status, "not_ready");
    assert.equal(JSON.stringify(data).includes("private database details"), false);
  } finally { readinessUnavailable = false; }
});
