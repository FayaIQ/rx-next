"use client";

import { Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function ConnectionStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);

    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return (
    <div
      className={cn(
        "flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium",
        online ? "bg-cyan-50 text-cyan-700" : "bg-red-50 text-red-700"
      )}
      title={online ? "متصل بالإنترنت" : "وضع أوفلاين"}
    >
      {online ? <Wifi size={13} /> : <WifiOff size={13} />}
      <span className="hidden sm:inline">{online ? "متصل" : "أوفلاين"}</span>
    </div>
  );
}
