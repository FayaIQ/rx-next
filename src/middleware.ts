import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isSecretaryApiAllowed } from "@/lib/api/secretary-api-access";

const PUBLIC_PATHS = [
  "/auth/signin",
  "/auth/signup",
  "/auth/admin",
  "/auth/login/secretary",
  "/auth/register/secretary",
  "/subscription/expired",
  "/api/auth",
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

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/fonts/") ||
    pathname.startsWith("/uploads/") ||
    pathname.startsWith("/api/storage/") ||
    pathname.startsWith("/models/")
  ) {
    return NextResponse.next();
  }

  const session = req.auth;

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  if (!session?.user) {
    if (isPublicPath(pathname) || pathname === "/") {
      if (pathname === "/") {
        return NextResponse.redirect(new URL("/auth/signin", req.url));
      }
      return NextResponse.next();
    }
    const signInUrl = new URL("/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  const { type, isConfirmed } = session.user;

  // بوابة المريض ومسارات عامة — متاحة حتى للمستخدم المسجّل
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (isAuthPath(pathname)) {
    return NextResponse.redirect(
      new URL(getDefaultRoute(type, isConfirmed), req.url)
    );
  }

  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(getDefaultRoute(type, isConfirmed), req.url)
    );
  }

  if (type === "doctor") {
    const doctorPaths = [
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

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|fonts/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2|woff|ttf|otf|glb|gltf|obj|bin)$).*)",
  ],
};
