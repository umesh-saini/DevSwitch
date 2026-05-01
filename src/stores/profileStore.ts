import { create } from 'zustand';
import type { Profile } from '../types/profile';

interface ProfileStore {
  profiles: Profile[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadProfiles: () => Promise<void>;
  addProfile: (profile: Profile) => void;
  updateProfile: (profile: Profile) => void;
  removeProfile: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useProfileStore = create<ProfileStore>((set) => ({
  profiles: [],
  isLoading: false,
  error: null,

  loadProfiles: async () => {
    set({ isLoading: true, error: null });
    try {
      const profiles = await window.electronAPI.profile.getAll();
      set({ profiles, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load profiles',
        isLoading: false 
      });
    }
  },

  addProfile: (profile) => {
    set((state) => ({ profiles: [...state.profiles, profile] }));
  },

  updateProfile: (updatedProfile) => {
    set((state) => ({
      profiles: state.profiles.map((p) =>
        p.id === updatedProfile.id ? updatedProfile : p
      ),
    }));
  },

  removeProfile: (id) => {
    set((state) => ({
      profiles: state.profiles.filter((p) => p.id !== id),
    }));
  },

  setLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error }),
}));
