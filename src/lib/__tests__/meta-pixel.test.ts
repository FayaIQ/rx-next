import assert from "node:assert/strict";
import { test } from "node:test";
import { META_PIXEL_ID, initializeMetaPixel, isMetaPixelPage, pauseMetaPixel, trackMetaEvent } from "../meta-pixel";

test("Meta tracking excludes clinical, authenticated and sensitive URLs", () => {
  for (const path of ["/patients/273", "/portal/secret-token", "/home", "/onboarding", "/demo-preview", "/dashboard", "/auth/signin", "/auth/login/secretary"]) {
    assert.equal(isMetaPixelPage(path), false, path);
  }
  assert.equal(isMetaPixelPage("/", "?patientName=Private"), false);
  assert.equal(isMetaPixelPage("/auth/signup", "?callbackUrl=/patients/273"), false);
  assert.equal(isMetaPixelPage("/auth/signup", "", "#private"), false);
  assert.equal(isMetaPixelPage("/blog/patient@example.com"), false);
  assert.equal(isMetaPixelPage("/", "?utm_source=facebook&fbclid=public-click-id"), true);
  assert.equal(isMetaPixelPage("/auth/signup", "?practice=dental"), true);
  assert.equal(isMetaPixelPage("/solutions/dental-clinic-software"), true);
});

test("manual Meta events stop immediately on private navigation and cannot break signup", () => {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const oldEnv = process.env.NODE_ENV;
  Object.assign(process.env, { NODE_ENV: "production" });
  const browser = {
    location: { hostname: "rx.faya.dev", pathname: "/auth/signup", search: "", hash: "" },
    __rxMetaAllowed: true,
  } as unknown as Window;
  Object.defineProperty(globalThis, "window", { value: browser, configurable: true });
  try {
    initializeMetaPixel();
    const queue = browser.fbq!;
    assert.equal(queue.disablePushState, true);
    assert.deepEqual(queue.queue.slice(0, 2), [["set", "autoConfig", false, META_PIXEL_ID], ["init", META_PIXEL_ID]]);
    initializeMetaPixel();
    assert.equal(queue.queue.filter(call => call[0] === "init").length, 1);
    const beforeReady = queue.queue.length;
    trackMetaEvent("PageView");
    assert.equal(queue.queue.length, beforeReady, "Events cannot queue until SDK is ready");
    queue.callMethod = (...args) => { queue.queue.push(args); };
    trackMetaEvent("CompleteRegistration");
    const event = queue.queue.at(-1)!;
    assert.deepEqual(event.slice(0, 4), ["trackSingle", META_PIXEL_ID, "CompleteRegistration", {}]);
    assert.match((event[4] as { eventID: string }).eventID, /^[a-f0-9-]{36}$/);
    const count = queue.queue.length;
    browser.location.pathname = "/patients/273";
    trackMetaEvent("PageView");
    assert.equal(queue.queue.length, count);
    browser.location.pathname = "/auth/signup";
    pauseMetaPixel();
    assert.deepEqual(queue.queue.at(-1), ["consent", "revoke"]);
    trackMetaEvent("CompleteRegistration");
    assert.equal(queue.queue.length, count + 1);
    browser.__rxMetaAllowed = true;
    browser.location.hostname = "localhost";
    trackMetaEvent("PageView");
    assert.equal(queue.queue.length, count + 1);
    browser.location.hostname = "rx.faya.dev";
    queue.callMethod = () => { throw new Error("Blocked by browser"); };
    assert.doesNotThrow(() => trackMetaEvent("CompleteRegistration"));
  } finally {
    if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow);
    else Reflect.deleteProperty(globalThis, "window");
    if (oldEnv === undefined) delete process.env.NODE_ENV;
    else Object.assign(process.env, { NODE_ENV: oldEnv });
  }
});
