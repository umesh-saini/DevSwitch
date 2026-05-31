import * as fs from "fs";
import { JsonStore } from "../jsonStore.ts";
import { getProfilesFilePath, getLegacyStoreCandidates } from "../paths.ts";
import type { Profile } from "../types.ts";

interface StoreSchema {
  profiles: Profile[];
  /** Marks that the one-time electron-store migration already ran. */
  _migratedFromElectronStore?: boolean;
  [key: string]: unknown;
}

/**
 * Shared profile storage used by BOTH the desktop app and the CLI.
 * Backed by a plain JSON file at the shared data dir (see paths.ts).
 */
class StorageService {
  private store: JsonStore<StoreSchema>;

  constructor() {
    this.store = new JsonStore<StoreSchema>(getProfilesFilePath(), {
      profiles: [],
    });
    this.migrateFromElectronStoreIfNeeded();
  }

  /**
   * One-time import of profiles from the old electron-store JSON files.
   * Runs only if the new store has never been migrated AND is empty, so it
   * never clobbers data created directly in the new location.
   */
  private migrateFromElectronStoreIfNeeded(): void {
    try {
      const current = this.store.read();
      if (current._migratedFromElectronStore) return;
      if (current.profiles && current.profiles.length > 0) {
        // New store already has data — just mark migrated, don't overwrite.
        current._migratedFromElectronStore = true;
        this.store.write(current);
        return;
      }

      const { profiles: candidates } = getLegacyStoreCandidates();
      for (const candidate of candidates) {
        if (!fs.existsSync(candidate)) continue;
        try {
          const raw = fs.readFileSync(candidate, "utf8");
          if (!raw.trim()) continue;
          const parsed = JSON.parse(raw) as { profiles?: Profile[] };
          if (parsed.profiles && parsed.profiles.length > 0) {
            current.profiles = parsed.profiles;
            current._migratedFromElectronStore = true;
            this.store.write(current);
            return;
          }
        } catch {
          // ignore malformed legacy file, try next candidate
        }
      }

      // Nothing to migrate — still mark so we don't re-scan every launch.
      current._migratedFromElectronStore = true;
      this.store.write(current);
    } catch {
      // Migration is best-effort; never block startup.
    }
  }

  getAllProfiles(): Profile[] {
    return this.store.get("profiles", []);
  }

  getProfile(id: string): Profile | undefined {
    return this.getAllProfiles().find((p) => p.id === id);
  }

  /**
   * Look up a profile by a human-friendly identifier used on the CLI:
   * matches (case-insensitively) against name, username, or email, and also
   * accepts a full/lowercased id. Returns the first match.
   */
  findProfile(identifier: string): Profile | undefined {
    const profiles = this.getAllProfiles();
    const needle = identifier.trim().toLowerCase();

    // Exact id match first
    const byId = profiles.find((p) => p.id.toLowerCase() === needle);
    if (byId) return byId;

    // Then exact name / username / email
    const exact = profiles.find(
      (p) =>
        p.name.toLowerCase() === needle ||
        p.username.toLowerCase() === needle ||
        p.email.toLowerCase() === needle,
    );
    if (exact) return exact;

    // Finally a partial name/username contains match
    return profiles.find(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.username.toLowerCase().includes(needle),
    );
  }

  saveProfile(profile: Profile): void {
    const profiles = this.getAllProfiles();
    const index = profiles.findIndex((p) => p.id === profile.id);

    if (index >= 0) {
      profiles[index] = profile;
    } else {
      profiles.push(profile);
    }

    this.store.set("profiles", profiles);
  }

  deleteProfile(id: string): boolean {
    const profiles = this.getAllProfiles();
    const filtered = profiles.filter((p) => p.id !== id);

    if (filtered.length < profiles.length) {
      this.store.set("profiles", filtered);
      return true;
    }

    return false;
  }

  clear(): void {
    this.store.set("profiles", []);
  }
}

export const storageService = new StorageService();
