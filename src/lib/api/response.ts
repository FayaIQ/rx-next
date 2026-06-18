import { NextResponse } from "next/server";
import { serializeForJson } from "@/lib/bigint";

export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json(serializeForJson(data), { status });
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function apiUnauthorized() {
  return apiError("غير مصرح", 401);
}

export function apiForbidden() {
  return apiError("غير مسموح", 403);
}

export function apiNotFound(message = "غير موجود") {
  return apiError(message, 404);
}

export function apiServerError(message = "خطأ في الخادم") {
  return apiError(message, 500);
}
