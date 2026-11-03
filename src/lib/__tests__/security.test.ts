import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { createRequire } from "node:module";
import "fake-indexeddb/auto";
import { sanitizeEmail } from "../recipe-settings";
import { isRasterLogo, storedLogoPreview } from "../logo-preview";
import { createDraftKey, decryptDraft, encryptDraft } from "../draft-encryption";
import { clearAllPrescriptionDrafts, clearPrescriptionDraft, readPrescriptionDraft, writePrescriptionDraft, type PrescriptionComposerDraft } from "../prescription-draft";

class BrowserStorage {
  rows = new Map<string, string>();
  get length() { return this.rows.size; }
  getItem(key: string) { return this.rows.get(key) ?? null; }
  setItem(key: string, value: string) { this.rows.set(key, value); }
  removeItem(key: string) { this.rows.delete(key); }
  key(index: number) { return [...this.rows.keys()][index] ?? null; }
}

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
afterEach(() => {
  for (const [name, descriptor] of [["window", originalWindow], ["localStorage", originalStorage]] as const) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else Reflect.deleteProperty(globalThis, name);
  }
});

function storage() {
  const value = new BrowserStorage();
  Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value });
  return value;
}

const draft: PrescriptionComposerDraft = {
  version: 1, doctorId: 701, savedAt: "2026-11-03T00:00:00Z", currentPrescriptionId: null,
  prescriptionNumber: 1, prescriptionDate: "2026-11-03", patientSearch: "مريض اختبار سري",
  selectedPatient: null, showNewPatient: false, newPatientInitialName: "", newPatientDraft: null,
  diagnosis: "تشخيص سري للاختبار", consultationFee: 0, consultationFeeWaived: false,
  items: [], fieldValues: {}, xrayImage: null, analysisImage: null,
};

test("email validation bounds adversarial input without a backtracking expression", () => {
  assert.equal(sanitizeEmail("  doctor@example.com  "), "doctor@example.com");
  for (const value of ["", "a@@example.com", "a@example", "a@example.", "a@.com", "a b@example.com", "a@" + "a.".repeat(100000) + " "]) assert.equal(sanitizeEmail(value), null);
});

test("logo previews reject executable schemes, foreign hosts and non-raster uploads", () => {
  assert.equal(storedLogoPreview("logos/clinic.webp"), "/api/storage/logos/clinic.webp");
  assert.equal(storedLogoPreview("https://nbg1.your-objectstorage.com/fayapress/rx/logo.webp"), "https://nbg1.your-objectstorage.com/fayapress/rx/logo.webp");
  for (const path of ["javascript:alert(1)", "data:image/svg+xml,<svg onload=alert(1)>", "//attacker.invalid/logo.png", "https://attacker.invalid/logo.png", "https://rx.faya.dev@attacker.invalid/logo.png", "../logo.png", 'logos/<img onerror="alert(1)">']) assert.equal(storedLogoPreview(path), null);
  assert.equal(isRasterLogo({ type: "image/png", size: 2048 }), true);
  assert.equal(isRasterLogo({ type: "image/svg+xml", size: 2048 }), false);
  assert.equal(isRasterLogo({ type: "image/png", size: 11 * 1024 * 1024 }), false);
});

test("AES-GCM drafts authenticate their content and clinic, use unique IVs and a non-exportable key", async () => {
  const key = await createDraftKey();
  assert.equal(key.extractable, false);
  await assert.rejects(crypto.subtle.exportKey("raw", key));
  const first = await encryptDraft(JSON.stringify(draft), draft.doctorId, key);
  const second = await encryptDraft(JSON.stringify(draft), draft.doctorId, key);
  assert.notEqual(first.iv, second.iv);
  assert.equal(await decryptDraft(first, draft.doctorId, key), JSON.stringify(draft));
  await assert.rejects(decryptDraft({ ...first, doctorId: 702 }, 702, key));
  await assert.rejects(decryptDraft({ ...first, ciphertext: "AAAA" + first.ciphertext.slice(4) }, draft.doctorId, key));
});

test("drafts are stored encrypted and recover using the persisted browser key", async () => {
  const local = storage();
  await writePrescriptionDraft(draft);
  const raw = local.getItem("rx:prescription-draft:v2:701")!;
  assert.ok(raw);
  assert.equal(raw.includes(draft.diagnosis), false);
  assert.equal(raw.includes(draft.patientSearch), false);
  assert.deepEqual(await readPrescriptionDraft(701), draft);
  const key = await new Promise<CryptoKey>((resolve, reject) => {
    const open = indexedDB.open("rx-draft-keys", 1);
    open.onsuccess = () => {
      const tx = open.result.transaction("keys", "readonly");
      const request = tx.objectStore("keys").get(701);
      request.onsuccess = () => resolve(request.result);
      tx.oncomplete = () => open.result.close();
      tx.onerror = () => reject(tx.error);
    };
    open.onerror = () => reject(open.error);
  });
  assert.equal(key.extractable, false);
  assert.deepEqual(JSON.parse(await decryptDraft(JSON.parse(raw), 701, key)), draft);
});

test("legacy drafts migrate without losing data and later writes cannot revive a cleared draft", async () => {
  const local = storage();
  const legacy = { ...draft, doctorId: 703 };
  local.setItem("rx:prescription-draft:v1:703", JSON.stringify(legacy));
  assert.deepEqual(await readPrescriptionDraft(703), legacy);
  assert.equal(local.getItem("rx:prescription-draft:v1:703"), null);
  assert.ok(local.getItem("rx:prescription-draft:v2:703"));
  await Promise.all([writePrescriptionDraft({ ...legacy, diagnosis: "first" }), writePrescriptionDraft({ ...legacy, diagnosis: "last" })]);
  assert.equal((await readPrescriptionDraft(703))?.diagnosis, "last");
  const pending = writePrescriptionDraft({ ...legacy, diagnosis: "pending" });
  clearPrescriptionDraft(703);
  await pending;
  assert.equal(await readPrescriptionDraft(703), null);
  await writePrescriptionDraft(legacy);
  clearAllPrescriptionDrafts();
  assert.equal(await readPrescriptionDraft(703), null);
});

test("corrupted ciphertext is rejected and preserved instead of becoming an empty draft", async () => {
  const local = storage();
  await writePrescriptionDraft({ ...draft, doctorId: 704 });
  const key = "rx:prescription-draft:v2:704";
  const value = JSON.parse(local.getItem(key)!);
  value.ciphertext = "AAAA" + value.ciphertext.slice(4);
  local.setItem(key, JSON.stringify(value));
  await assert.rejects(readPrescriptionDraft(704));
  assert.equal(local.getItem(key), JSON.stringify(value));
});

test("legacy glob consumers retain both callable and class APIs on patched minimatch", () => {
  const require = createRequire(import.meta.url);
  const fromEslint = createRequire(require.resolve("eslint/package.json"));
  const minimatch = fromEslint("minimatch");
  assert.equal(typeof minimatch, "function");
  assert.equal(minimatch("src/test.ts", "**/*.ts"), true);
  assert.equal(minimatch("src/test.ts", "**/*.js"), false);
  assert.equal(new minimatch.Minimatch("**/*.{ts,tsx}").match("src/test.tsx"), true);
});
