import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { analyticsContext, isAnalyticsHost } from "@/lib/analytics";
import { browserFamily, measurementRoute, measurementSchema } from "@/lib/product-analytics/shared";
import { toDbId } from "@/lib/bigint";
import { createHash } from "node:crypto";

const rate = new Map<string, { count: number; until: number }>();
export async function POST(request: Request) {
  const empty = () => new Response(null, { status: 204 });
  const url = new URL(request.url);
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host).split(",")[0].trim();
  const publicOrigin = `${request.headers.get("x-forwarded-proto")?.split(",")[0] ?? url.protocol.slice(0, -1)}://${host}`;
  if (process.env.NODE_ENV !== "production" && process.env.RX_ANALYTICS_TEST_MODE !== "true") return empty();
  if (!isAnalyticsHost(host.split(":")[0]) && process.env.RX_ANALYTICS_TEST_MODE !== "true") return empty();
  if (request.headers.get("origin") && request.headers.get("origin") !== publicOrigin) return new Response(null, { status: 403 });
  const now = Date.now();
  const key = createHash("sha256").update(request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local").digest("hex");
  const previous = rate.get(key);
  const current = previous && previous.until > now ? previous : { count: 0, until: now + 60000 };
  if (++current.count > 120) return new Response(null, { status: 429 });
  if (rate.size > 4096) for (const [k, v] of rate) if (v.until <= now) rate.delete(k);
  if (rate.size >= 4096 && !rate.has(key)) return new Response(null, { status: 429 });
  rate.set(key, current);
  try {
    const reader = request.body?.getReader();
    if (!reader) return new Response(null, { status: 400 });
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 4096) { await reader.cancel(); return new Response(null, { status: 413 }); } chunks.push(value); }
    const input = measurementSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    const route = measurementRoute(input.route);
    if (!route) return empty();
    const session = await auth();
    const context = analyticsContext(route, session?.user);
    const clinic = session?.user && (session.user.type === "doctor" || session.user.type === "secretary")
      ? await prisma.clinicAcquisition.findUnique({ where: { doctorId: toDbId(session.user.doctorId ?? session.user.id) }, select: { practiceType: true, accountMode: true } }) : null;
    const data = { visitKey: input.visitKey ?? null, source: input.acquisition?.source ?? "direct", campaign: input.acquisition?.campaign ?? null,
      userRole: context.user_role, practiceType: clinic?.practiceType ?? input.practiceType ?? null,
      environment: process.env.RX_ANALYTICS_TEST_MODE === "true" ? "test" : "production", route, metric: input.metric, value: input.value, device: input.device, browser: browserFamily(request.headers.get("user-agent") ?? ""), area: context.area, accountMode: clinic?.accountMode === "test" ? "test" : context.account_mode, errorCode: input.errorCode ?? null, release: (process.env.RX_RELEASE_ID ?? process.env.RAILWAY_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT_SHA ?? "local").slice(0, 48) };
    await prisma.productMeasurement.upsert({ where: { id: input.id }, create: { id: input.id, ...data }, update: { value: input.value } });
    return empty();
  } catch { return new Response(null, { status: 400 }); }
}
