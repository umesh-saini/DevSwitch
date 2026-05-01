import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LayoutView = 'grid' | 'list' | 'compact';

interface SettingsState {
  layoutView: LayoutView;
  setLayoutView: (view: LayoutView) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      layoutView: 'grid',
      setLayoutView: (view) => set({ layoutView: view }),
    }),
    {
      name: 'dev-switch-settings',
    }
  )
);
