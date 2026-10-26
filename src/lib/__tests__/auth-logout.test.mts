import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest, type NextFetchEvent } from "next/server";
import { encode } from "next-auth/jwt";

// Synthetic sessions only: these tests never connect to a database.
const secret = "rx-logout-regression-test-secret-only";
process.env.AUTH_SECRET = secret;
process.env.AUTH_URL = "http://localhost:3107";
const { default: proxy } = await import("../../proxy");
const { GET: exitSession } = await import("../../app/auth/demo-exit/route");

async function requestWithSession(path: string, type = "doctor") {
  const cookieName = "authjs.session-token";
  const token = await encode({
    secret,
    salt: cookieName,
    token: {
      id: 17,
      name: "Logout regression fixture",
      type,
      isConfirmed: true,
      sessionId: "logout-regression-fixture",
    },
  });
  return new NextRequest(`http://localhost:3107${path}`, {
    headers: { cookie: `${cookieName}=${token}` },
  });
}

function hasActiveSessionCookie(response: Response) {
  return response.headers.getSetCookie().some((cookie) =>
    /^(?:__Secure-)?authjs\.session-token(?:\.\d+)?=[^;]/.test(cookie),
  );
}

for (const path of [
  "/api/auth/csrf",
  "/api/auth/signout",
  "/api/auth/session",
  "/auth/demo-exit",
]) {
  test(`${path} cannot refresh a session that its route may clear`, async () => {
    const response = await proxy(
      await requestWithSession(path),
      {} as NextFetchEvent,
    );
    assert.ok(response instanceof Response);
    assert.equal(response.headers.get("x-middleware-next"), "1");
    assert.equal(hasActiveSessionCookie(response), false);
  });
}

for (const [path, type] of [
  ["/auth/signin", "doctor"],
  ["/auth/login/secretary", "secretary"],
  ["/auth/admin", "admin"],
]) {
  test(`${type} expired-session exit clears cookies without restoring the JWT`, async () => {
    const response = await proxy(
      await requestWithSession(`${path}?error=session_expired`, type),
      {} as NextFetchEvent,
    );
    assert.ok(response instanceof Response);
    assert.equal(response.headers.get("x-middleware-next"), "1");
    assert.ok(response.headers.getSetCookie().some((cookie) =>
      cookie.startsWith("authjs.session-token=;") && cookie.includes("Max-Age=0"),
    ));
    assert.equal(hasActiveSessionCookie(response), false);
  });
}

test("background requests authenticate without restoring a cookie after logout", async () => {
  const response = await proxy(
    await requestWithSession("/home"),
    {} as NextFetchEvent,
  );
  assert.ok(response instanceof Response);
  assert.equal(response.headers.get("x-middleware-next"), "1");
  assert.equal(hasActiveSessionCookie(response), false);
});

test("signed-out users cannot reopen protected clinic pages or APIs", async () => {
  for (const path of ["/home", "/api/patients"]) {
    const response = await proxy(
      new NextRequest(`http://localhost:3107${path}`),
      {} as NextFetchEvent,
    );
    assert.ok(response instanceof Response);
    if (path.startsWith("/api/")) {
      assert.equal(response.status, 401);
    } else {
      assert.equal(response.status, 307);
      assert.equal(new URL(response.headers.get("location")!).pathname, "/auth/signin");
    }
  }
});

test("server logout expires secure and chunked cookies without removing clinic storage", () => {
  const response = exitSession(new Request("https://rx.example.test/auth/demo-exit?next=%2Fauth%2Flogin%2Fsecretary", {
    headers: {
      cookie: "__Secure-authjs.session-token.0=fixture; __Secure-authjs.session-token.1=fixture; next-auth.session-token.0=fixture; rx-locale=ar",
    },
  }));
  assert.equal(response.headers.get("location"), "/auth/login/secretary");
  assert.equal(response.headers.get("cache-control"), "no-store");
  const cookies = response.headers.getSetCookie();
  for (const name of [
    "__Secure-authjs.session-token", "__Secure-authjs.session-token.0",
    "__Secure-authjs.session-token.1", "next-auth.session-token.0",
    "__Host-authjs.csrf-token",
  ]) {
    const cookie = cookies.find((value) => value.startsWith(`${name}=;`));
    assert.ok(cookie, `missing deletion for ${name}`);
    assert.ok(cookie.includes("Max-Age=0"));
    if (name.startsWith("__")) assert.ok(cookie.includes("Secure"));
  }
  assert.equal(cookies.some((cookie) => cookie.startsWith("rx-locale=")), false);
  assert.equal(response.headers.has("clear-site-data"), false);
});

test("server logout does not redirect to an external destination", () => {
  const response = exitSession(new Request("https://rx.example.test/auth/demo-exit?next=https%3A%2F%2Fother.example"));
  assert.equal(response.headers.get("location"), "/auth/signin");
});

test("server logout never redirects the browser to an internal deployment host", () => {
  const response = exitSession(new Request("http://localhost:3000/auth/demo-exit?next=%2Fauth%2Fsignin", {
    headers: { "x-forwarded-host": "rx.example.test", "x-forwarded-proto": "https" },
  }));
  assert.equal(response.headers.get("location"), "/auth/signin");
});
