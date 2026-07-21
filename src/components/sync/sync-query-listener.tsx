"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RX_SYNC_COMPLETE } from "@/lib/sync/sync-events";

const INVALIDATE_KEYS = [
  ["waiting-room"],
  ["doctor-queue"],
  ["secretary-desk"],
  ["appointments"],
  ["patients"],
  ["prescriptions"],
  ["medicines"],
  ["medicine-presets"],
  ["fields"],
  ["patient-fields"],
  ["dental-chart"],
  ["treatment-plans"],
  ["treatment-sessions-today"],
  ["treatment-sessions-week"],
];

export function SyncQueryListener() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const onSyncComplete = () => {
      for (const queryKey of INVALIDATE_KEYS) {
        void queryClient.invalidateQueries({ queryKey });
      }
    };

    window.addEventListener(RX_SYNC_COMPLETE, onSyncComplete);
    return () => window.removeEventListener(RX_SYNC_COMPLETE, onSyncComplete);
  }, [queryClient]);

  return null;
}
