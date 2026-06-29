import { create } from "zustand";

interface SyncState {
  online: boolean;
  hydrated: boolean;
  hydrating: boolean;
  syncing: boolean;
  pendingCount: number;
  lastSync: string | null;
  subscriptionBlocked: boolean;
  setOnline: (v: boolean) => void;
  setHydrated: (v: boolean) => void;
  setHydrating: (v: boolean) => void;
  setSyncing: (v: boolean) => void;
  setPendingCount: (v: number) => void;
  setLastSync: (v: string) => void;
  setSubscriptionBlocked: (v: boolean) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  // Keep SSR and first client render identical; update in useEffect after mount.
  online: true,
  hydrated: false,
  hydrating: false,
  syncing: false,
  pendingCount: 0,
  lastSync: null,
  subscriptionBlocked: false,
  setOnline: (online) => set({ online }),
  setHydrated: (hydrated) => set({ hydrated }),
  setHydrating: (hydrating) => set({ hydrating }),
  setSyncing: (syncing) => set({ syncing }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setLastSync: (lastSync) => set({ lastSync }),
  setSubscriptionBlocked: (subscriptionBlocked) => set({ subscriptionBlocked }),
}));
