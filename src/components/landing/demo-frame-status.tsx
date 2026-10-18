"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { PUBLIC_DEMO_SESSION_ID } from "@/lib/demo/constants";

/** A loaded document is not a ready application. Signal after composer data loads. */
export function DemoFrameStatus({ ready }: { ready: boolean }) {
  const { data: session } = useSession();
  useEffect(() => {
    if (!ready || session?.user.sessionId !== PUBLIC_DEMO_SESSION_ID || window.parent === window) return;
    window.parent.postMessage({ type: "rx-demo-ready" }, window.location.origin);
  }, [ready, session?.user.sessionId]);
  return null;
}
