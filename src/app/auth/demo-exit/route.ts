import { NextResponse } from "next/server";
import { clearSessionCookies } from "@/lib/auth-cookies";

const ALLOWED_DESTINATIONS = new Set([
  "/",
  "/auth/signin",
  "/auth/signup",
  "/auth/login/secretary",
  "/auth/register/secretary",
  "/terms",
  "/privacy",
]);

export function GET(req: Request) {
  const url = new URL(req.url);
  const requestedDestination = url.searchParams.get("next") ?? "/auth/signin";
  const destination = ALLOWED_DESTINATIONS.has(requestedDestination)
    ? requestedDestination
    : "/auth/signin";
  const response = NextResponse.redirect(new URL(destination, url.origin));

  clearSessionCookies(response);
  return response;
}
