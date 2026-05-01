import Store from 'electron-store';
import { type Profile } from '../type/profile.ts';

interface StoreSchema {
  profiles: Profile[];
}

class StorageService {
  private store: Store<StoreSchema>;

  constructor() {
    this.store = new Store<StoreSchema>({
      name: 'dev-switch-data',
      defaults: {
        profiles: [],
      },
    });
  }

  getAllProfiles(): Profile[] {
    return this.store.get('profiles', []);
  }

  getProfile(id: string): Profile | undefined {
    const profiles = this.getAllProfiles();
    return profiles.find((p) => p.id === id);
  }

  saveProfile(profile: Profile): void {
    const profiles = this.getAllProfiles();
    const index = profiles.findIndex((p) => p.id === profile.id);
    
    if (index >= 0) {
      profiles[index] = profile;
    } else {
      profiles.push(profile);
    }
    
    this.store.set('profiles', profiles);
  }

  deleteProfile(id: string): boolean {
    const profiles = this.getAllProfiles();
    const filtered = profiles.filter((p) => p.id !== id);
    
    if (filtered.length < profiles.length) {
      this.store.set('profiles', filtered);
      return true;
    }
    
    return false;
  }

  clear(): void {
    this.store.clear();
  }
}

export const storageService = new StorageService();
