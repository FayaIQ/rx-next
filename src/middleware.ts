import { auth } from "@/auth";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/auth/signin",
  "/auth/signup",
  "/auth/admin",
  "/auth/login/secretary",
  "/auth/register/secretary",
  "/subscription/expired",
  "/api/auth",
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
  if (type === "secretary") return isConfirmed ? "/secretary/patients" : "/secretary";
  return "/home";
}

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/uploads/") ||
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
      "/subscription",
    ];
    const allowed = doctorPaths.some((p) => pathname.startsWith(p));
    if (!allowed && !pathname.startsWith("/api/")) {
      return NextResponse.redirect(new URL("/home", req.url));
    }
  }

  if (type === "secretary") {
    if (!isConfirmed && pathname !== "/secretary" && !pathname.startsWith("/api/")) {
      return NextResponse.redirect(new URL("/secretary", req.url));
    }
    if (!isConfirmed && pathname.startsWith("/secretary/")) {
      return NextResponse.redirect(new URL("/secretary", req.url));
    }
    if (
      isConfirmed &&
      !pathname.startsWith("/secretary") &&
      !pathname.startsWith("/api/")
    ) {
      return NextResponse.redirect(new URL("/secretary/patients", req.url));
    }
  }

  if (type === "admin" && !pathname.startsWith("/dashboard") && !pathname.startsWith("/api/")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|glb|gltf|obj|bin)$).*)",
  ],
};
