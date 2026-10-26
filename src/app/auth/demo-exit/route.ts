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

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const url = new URL(req.url);
  const requestedDestination = url.searchParams.get("next") ?? "/auth/signin";
  const destination = ALLOWED_DESTINATIONS.has(requestedDestination)
    ? requestedDestination
    : "/auth/signin";
  // Reverse proxies may expose an internal localhost origin to Next.js.
  // A relative redirect keeps the browser on its actual public origin.
  const response = new NextResponse(null, {
    status: 307,
    headers: { Location: destination },
  });

  response.headers.set("Cache-Control", "no-store");
  clearSessionCookies(response, req.headers.get("cookie"));
  return response;
}
