import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { auth } from "@/auth-edge";
import { clearSessionCookies } from "@/lib/auth-cookies";
import { isSecretaryApiAllowed } from "@/lib/api/secretary-api-access";
import { PUBLIC_DEMO_SESSION_ID } from "@/lib/demo/constants";

function nextWithPathname(req: NextRequest) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", req.nextUrl.pathname);
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

const PUBLIC_PATHS = [
  "/robots.txt",
  "/sitemap.xml",
  "/llms.txt",
  "/solutions",
  "/features",
  "/blog",
  "/compare",
  "/about",
  "/auth/signin",
  "/auth/signup",
  "/auth/admin",
  "/auth/login/secretary",
  "/auth/register/secretary",
  "/subscription/expired",
  "/demo-preview",
  "/clinic/free-trial",
  "/terms",
  "/privacy",
  "/api/auth",
  "/api/health",
  "/api/analytics/telemetry",
  "/portal",
  "/api/portal",
];

const AUTH_PATHS = [
  "/auth/signin",
  "/auth/signup",
  "/auth/admin",
  "/auth/login/secretary",
  "/auth/register/secretary",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some((p) => pathname === p);
}

function getDefaultRoute(type: string, isConfirmed: boolean): string {
  if (type === "admin") return "/dashboard";
  if (type === "secretary") return isConfirmed ? "/secretary/desk" : "/secretary";
  return "/home";
}

function publicDemoExitUrl(req: NextRequest, nextPath: string) {
  const url = new URL("/auth/demo-exit", req.url);
  url.searchParams.set("next", nextPath);
  return url;
}

const authenticatedProxy = auth((req, _event: NextFetchEvent) => {
  const { pathname } = req.nextUrl;

  if (
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    pathname === "/offline.html" ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/fonts/") ||
    pathname.startsWith("/uploads/") ||
    pathname.startsWith("/api/storage/") ||
    pathname.startsWith("/models/")
  ) {
    return nextWithPathname(req);
  }

  const session = req.auth;
  const isPublicDemoSession =
    session?.user?.sessionId === PUBLIC_DEMO_SESSION_ID;
  const isTopLevelDocument =
    req.headers.get("sec-fetch-dest") === "document";

  if (!session?.user) {
    if (isPublicPath(pathname) || pathname === "/") {
      return nextWithPathname(req);
    }
    // Never redirect API callers to the HTML sign-in page — that breaks
    // fetch/json clients and pollutes callbackUrl with /api/... paths.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const signInUrl = new URL("/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  const { type, isConfirmed } = session.user;

  // The public demo is allowed inside the landing-page iframe only. If its
  // session ever reaches a normal browser tab, discard it instead of treating
  // the visitor as a logged-in doctor.
  if (isPublicDemoSession && isAuthPath(pathname)) {
    return NextResponse.redirect(publicDemoExitUrl(req, pathname));
  }

  if (
    isPublicDemoSession &&
    isTopLevelDocument &&
    pathname !== "/" &&
    pathname !== "/demo-preview"
  ) {
    const destination =
      pathname === "/terms" || pathname === "/privacy"
        ? pathname
        : "/auth/signin";
    return NextResponse.redirect(
      publicDemoExitUrl(req, destination)
    );
  }

  // Already-logged-in users go to their home. Expired-session exits are
  // handled before Auth.js below, so it cannot renew the cookie we clear.
  if (isAuthPath(pathname)) {
    return NextResponse.redirect(
      new URL(getDefaultRoute(type, isConfirmed), req.url)
    );
  }

  // بوابة المريض ومسارات عامة — متاحة حتى للمستخدم المسجّل
  if (isPublicPath(pathname)) {
    return nextWithPathname(req);
  }

  if (pathname === "/") {
    if (isPublicDemoSession) {
      if (isTopLevelDocument) {
        return NextResponse.redirect(publicDemoExitUrl(req, "/"));
      }
      return nextWithPathname(req);
    }
    return NextResponse.redirect(
      new URL(getDefaultRoute(type, isConfirmed), req.url)
    );
  }

  if (type === "doctor") {
    const doctorPaths = [
      "/onboarding",
      "/home",
      "/dates",
      "/pharmaceutical",
      "/patients",
      "/recipe-settings",
      "/setting",
      "/prescriptions",
      "/dental",
      "/finances",
      "/queue",
      "/subscription",
      "/print",
      "/reports",
      "/treatment",
      "/tasks",
    ];
    const allowed = doctorPaths.some((p) => pathname.startsWith(p));
    if (!allowed && !pathname.startsWith("/api/")) {
      return NextResponse.redirect(new URL("/home", req.url));
    }
  }

  if (type === "secretary") {
    if (
      pathname.startsWith("/api/") &&
      !isSecretaryApiAllowed(pathname)
    ) {
      return NextResponse.json(
        { error: "غير مصرح لهذا الدور" },
        { status: 403 }
      );
    }

    if (isConfirmed && pathname === "/secretary") {
      return NextResponse.redirect(new URL("/secretary/desk", req.url));
    }
    if (
      !isConfirmed &&
      pathname !== "/secretary" &&
      !pathname.startsWith("/secretary/") &&
      !pathname.startsWith("/api/")
    ) {
      return NextResponse.redirect(new URL("/secretary", req.url));
    }
    if (
      isConfirmed &&
      !pathname.startsWith("/secretary") &&
      !pathname.startsWith("/api/")
    ) {
      return NextResponse.redirect(new URL("/secretary/desk", req.url));
    }
  }

  if (type === "admin" && !pathname.startsWith("/dashboard") && !pathname.startsWith("/api/")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return nextWithPathname(req);
});

export default async function proxy(req: NextRequest, event: NextFetchEvent) {
  const { pathname } = req.nextUrl;

  // Auth handlers own their cookies. Wrapping them in auth() adds another
  // session response, including cookies that can undo a logout/reset.
  if (
    pathname === "/api/auth" ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/auth/demo-exit"
  ) {
    return nextWithPathname(req);
  }

  if (isAuthPath(pathname) && req.nextUrl.searchParams.get("error") === "session_expired") {
    const response = nextWithPathname(req);
    clearSessionCookies(response, req.headers.get("cookie"));
    return response;
  }

  const response = await authenticatedProxy(req, event);
  if (response) {
    // A slow background request started before logout must not restore its
    // old JWT afterwards. /api/auth/session remains responsible for renewal.
    const cookies = response.headers.getSetCookie();
    response.headers.delete("set-cookie");
    for (const cookie of cookies) {
      if (!/^(?:__Secure-)?authjs\.session-token(?:\.\d+)?=[^;]/.test(cookie)) {
        response.headers.append("set-cookie", cookie);
      }
    }
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|fonts/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|woff2|woff|ttf|otf|glb|gltf|obj|bin)$).*)",
  ],
};
