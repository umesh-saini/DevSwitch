import { randomUUID } from "crypto";
import * as path from "path";
import type {
  CreateProfileInput,
  Profile,
  UpdateProfileInput,
  SyncResult,
} from "../types.ts";
import type { LogSource } from "../type/log.ts";
import { storageService } from "./storageService.ts";
import { logService } from "./logService.ts";
import { sshKeyService } from "./sshKeyService.ts";
import { sshConfigService } from "./sshConfigService.ts";
import { sshAgentService } from "./sshAgentService.ts";
import { encryptPassphrase } from "../utils/encryption.ts";
import { getProviderSSHConfig } from "../utils/providerUtils.ts";

/**
 * High-level profile orchestration shared by the desktop app and the CLI.
 *
 * This is the single source of truth for create / update / delete / sync /
 * switch behavior. Both the Electron IPC handlers and the CLI commands call
 * into these functions, guaranteeing identical side effects (SSH key gen,
 * ssh-agent, ~/.ssh/config, storage, activity logs) regardless of entry point.
 */

const SYNC_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];
const SYNC_EMOJIS = ["👤", "💻", "🚀", "🔑", "💼", "🎯", "🌟", "💡"];

export async function createProfile(
  input: CreateProfileInput,
  source: LogSource = "app",
): Promise<Profile> {
  const profile: Profile = {
    id: randomUUID(),
    name: input.name,
    email: input.email,
    username: input.username,
    sshKeyType: input.sshKeyType,
    keyPath: null,
    keyAlgorithm: null,
    hasPassphrase: false,
    passphraseEncrypted: null,
    hostConfigured: false,
    provider: input.provider,
    avatar: input.avatar,
    color: input.color,
    tags: input.tags,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  if (input.sshKeyType === "default") {
    profile.keyPath = sshKeyService.getDefaultKeyPath();
  } else if (
    input.sshKeyType === "generated" &&
    input.keyAlgorithm &&
    input.keyName
  ) {
    const result = await sshKeyService.generateKey({
      algorithm: input.keyAlgorithm,
      name: input.keyName,
      passphrase: input.passphrase,
      email: input.email,
    });

    if (result.success && result.keyPath) {
      profile.keyPath = result.keyPath;
      profile.keyAlgorithm = input.keyAlgorithm;

      if (input.passphrase) {
        profile.hasPassphrase = true;
        profile.passphraseEncrypted = encryptPassphrase(input.passphrase);
      }

      await sshAgentService.addKeyToAgent({
        keyPath: result.keyPath,
        passphrase: input.passphrase,
      });
    } else {
      throw new Error(result.error || "Failed to generate SSH key");
    }
  } else if (input.sshKeyType === "existing" && input.existingKeyPath) {
    profile.keyPath = input.existingKeyPath;
  }

  if (profile.keyPath) {
    const configResult = await sshConfigService.updateConfig(profile);
    profile.hostConfigured = configResult.success;
  }

  storageService.saveProfile(profile);

  logService.addLog(
    "PROFILE_CREATED",
    `Profile "${profile.name}" created`,
    {
      profileId: profile.id,
      provider: profile.provider,
      sshKeyType: profile.sshKeyType,
    },
    source,
  );

  return profile;
}

export async function updateProfile(
  input: UpdateProfileInput,
  source: LogSource = "app",
): Promise<Profile> {
  const existingProfile = storageService.getProfile(input.id);
  if (!existingProfile) {
    throw new Error("Profile not found");
  }

  const updatedProfile: Profile = {
    ...existingProfile,
    name: input.name ?? existingProfile.name,
    email: input.email ?? existingProfile.email,
    username: input.username ?? existingProfile.username,
    avatar: input.avatar ?? existingProfile.avatar,
    color: input.color ?? existingProfile.color,
    tags: input.tags ?? existingProfile.tags,
    provider: input.provider ?? existingProfile.provider,
    updatedAt: Date.now(),
  };

  if (input.sshKeyType) {
    updatedProfile.sshKeyType = input.sshKeyType;

    if (input.sshKeyType === "default") {
      updatedProfile.keyPath = sshKeyService.getDefaultKeyPath();
      updatedProfile.keyAlgorithm = null;
      updatedProfile.hasPassphrase = false;
      updatedProfile.passphraseEncrypted = null;
    } else if (
      input.sshKeyType === "generated" &&
      input.keyAlgorithm &&
      input.keyName
    ) {
      const result = await sshKeyService.generateKey({
        algorithm: input.keyAlgorithm,
        name: input.keyName,
        passphrase: input.passphrase,
        email: updatedProfile.email,
      });

      if (result.success && result.keyPath) {
        updatedProfile.keyPath = result.keyPath;
        updatedProfile.keyAlgorithm = input.keyAlgorithm;

        if (input.passphrase) {
          updatedProfile.hasPassphrase = true;
          updatedProfile.passphraseEncrypted = encryptPassphrase(
            input.passphrase,
          );
        }

        await sshAgentService.addKeyToAgent({
          keyPath: result.keyPath,
          passphrase: input.passphrase,
        });
      }
    } else if (input.sshKeyType === "existing" && input.existingKeyPath) {
      updatedProfile.keyPath = input.existingKeyPath;
      updatedProfile.keyAlgorithm = null;
      updatedProfile.hasPassphrase = false;
      updatedProfile.passphraseEncrypted = null;
    }
  }

  if (updatedProfile.keyPath) {
    const configResult = await sshConfigService.updateConfig(updatedProfile);
    updatedProfile.hostConfigured = configResult.success;
  }

  storageService.saveProfile(updatedProfile);

  logService.addLog(
    "PROFILE_UPDATED",
    `Profile "${updatedProfile.name}" updated`,
    {
      profileId: updatedProfile.id,
      provider: updatedProfile.provider,
    },
    source,
  );

  return updatedProfile;
}

export async function deleteProfile(
  id: string,
  source: LogSource = "app",
): Promise<boolean> {
  const profile = storageService.getProfile(id);

  if (profile) {
    await sshConfigService.removeProfileConfig(id);

    if (profile.sshKeyType === "generated" && profile.keyPath) {
      sshKeyService.deleteKey(profile.keyPath);
    }

    logService.addLog(
      "PROFILE_DELETED",
      `Profile "${profile.name}" deleted`,
      {
        profileId: profile.id,
        provider: profile.provider,
      },
      source,
    );
  }

  return storageService.deleteProfile(id);
}

export function getAllProfiles(): Profile[] {
  return storageService.getAllProfiles();
}

export function getProfileById(id: string): Profile | null {
  return storageService.getProfile(id) || null;
}

/**
 * "Switch to" / activate a profile.
 *
 * Switching means: make sure the profile's SSH host alias exists in
 * ~/.ssh/config, the key is loaded into ssh-agent, and (optionally) the global
 * git user.name/user.email are set to this profile. Returns the host alias so
 * callers can show the clone URL format.
 */
export interface SwitchOptions {
  /** Also set global git user.name / user.email. Default true. */
  setGlobalGit?: boolean;
  /** Decrypted passphrase, if the caller already has it. */
  passphrase?: string;
}

export interface SwitchResult {
  success: boolean;
  profile?: Profile;
  hostAlias?: string;
  cloneUrlExample?: string;
  agentLoaded?: boolean;
  globalGitSet?: boolean;
  error?: string;
}

export async function switchProfile(
  id: string,
  options: SwitchOptions = {},
  source: LogSource = "app",
): Promise<SwitchResult> {
  const { setGlobalGit = true } = options;
  const profile = storageService.getProfile(id);
  if (!profile) {
    return { success: false, error: "Profile not found" };
  }

  // Ensure SSH config entry exists / is up to date.
  if (profile.keyPath) {
    const configResult = await sshConfigService.updateConfig(profile);
    if (configResult.success && !profile.hostConfigured) {
      profile.hostConfigured = true;
      storageService.saveProfile(profile);
    }
  }

  // Load key into ssh-agent.
  let agentLoaded = false;
  if (profile.keyPath) {
    const agentResult = await sshAgentService.addKeyToAgent({
      keyPath: profile.keyPath,
      passphrase: options.passphrase,
    });
    agentLoaded = agentResult.success;
  }

  // Optionally set global git identity.
  let globalGitSet = false;
  if (setGlobalGit) {
    try {
      const { execSync } = await import("child_process");
      execSync(`git config --global user.name "${profile.username}"`, {
        stdio: "pipe",
      });
      execSync(`git config --global user.email "${profile.email}"`, {
        stdio: "pipe",
      });
      globalGitSet = true;
    } catch {
      globalGitSet = false;
    }
  }

  const { sshHost } = getProviderSSHConfig(profile.provider);
  const hostAlias = `${sshHost}-${profile.username}`;
  const cloneUrlExample = `git@${hostAlias}:<owner>/<repo>.git`;

  logService.addLog(
    "PROFILE_SWITCHED",
    `Switched to profile "${profile.name}"`,
    {
      profileId: profile.id,
      provider: profile.provider,
      globalGitSet,
      agentLoaded,
    },
    source,
  );

  return {
    success: true,
    profile,
    hostAlias,
    cloneUrlExample,
    agentLoaded,
    globalGitSet,
  };
}

/**
 * Scan ~/.ssh + ~/.ssh/config and create profiles for any unmanaged keys.
 * Identical logic to the desktop "Sync" button.
 */
export async function scanAndSync(
  source: LogSource = "app",
): Promise<SyncResult> {
  try {
    const allKeys = await sshKeyService.scanAllSSHKeys();
    const hostMappings = sshConfigService.getAllHostKeyMappings();
    const existingProfiles = storageService.getAllProfiles();

    const syncedProfiles: Profile[] = [];
    const skippedKeys: string[] = [];

    for (const keyInfo of allKeys) {
      const existingProfile = existingProfiles.find(
        (p) => p.keyPath === keyInfo.privatePath,
      );
      if (existingProfile) {
        skippedKeys.push(keyInfo.privatePath);
        continue;
      }

      const hostMapping = hostMappings.find(
        (m) =>
          path.normalize(m.identityFile) ===
          path.normalize(keyInfo.privatePath),
      );

      let username = hostMapping?.username || null;
      if (!username && keyInfo.email) {
        username = keyInfo.email.split("@")[0];
      }
      if (!username) {
        username = path.basename(keyInfo.privatePath);
      }

      const email = keyInfo.email || `${username}@local`;
      const profileName = `${username} (Synced)`;

      const color = SYNC_COLORS[syncedProfiles.length % SYNC_COLORS.length];
      const avatar = SYNC_EMOJIS[syncedProfiles.length % SYNC_EMOJIS.length];

      const profile: Profile = {
        id: randomUUID(),
        name: profileName,
        email,
        username,
        sshKeyType: "existing",
        keyPath: keyInfo.privatePath,
        keyAlgorithm:
          keyInfo.algorithm === "rsa" || keyInfo.algorithm === "ed25519"
            ? keyInfo.algorithm
            : null,
        hasPassphrase: false,
        passphraseEncrypted: null,
        hostConfigured: hostMapping ? true : false,
        avatar,
        color,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      if (!hostMapping) {
        await sshConfigService.updateConfig(profile);
        profile.hostConfigured = true;
      }

      storageService.saveProfile(profile);
      syncedProfiles.push(profile);
    }

    if (syncedProfiles.length > 0) {
      logService.addLog(
        "PROFILE_CREATED",
        `Synced ${syncedProfiles.length} profile(s) from SSH keys`,
        {
          syncedCount: syncedProfiles.length,
        },
        source,
      );
    }

    return {
      success: true,
      syncedCount: syncedProfiles.length,
      skippedCount: skippedKeys.length,
      profiles: syncedProfiles,
    };
  } catch (error) {
    return {
      success: false,
      syncedCount: 0,
      skippedCount: 0,
      profiles: [],
      error: error instanceof Error ? error.message : "Failed to sync profiles",
    };
  }
}
