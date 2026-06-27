export const RX_SYNC_COMPLETE = "rx-sync-complete";

export function dispatchSyncComplete() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(RX_SYNC_COMPLETE));
}
