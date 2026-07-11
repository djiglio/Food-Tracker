import { create } from 'zustand';

interface AppState {
  isOffline: boolean;
  setOfflineMode: (status: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isOffline: !navigator.onLine,
  setOfflineMode: (status) => set({ isOffline: status }),
}));
