/**
 * Domain types are now owned by the shared core library so the desktop app and
 * the `devswitch` CLI stay in sync. This file re-exports them and keeps the
 * Electron-specific `ElectronAPI` IPC contract.
 */
export type {
  SSHKeyType,
  KeyAlgorithm,
  GitProvider,
  ProviderConnectionMeta,
  PermissionStatus,
  AppPlatform,
  PermissionCheckResult,
  Profile,
  CreateProfileInput,
  UpdateProfileInput,
  SSHKeyGenerationResult,
  DefaultSSHKey,
} from "../../core/types.ts";

import type {
  Profile,
  CreateProfileInput,
  UpdateProfileInput,
  SSHKeyGenerationResult,
  DefaultSSHKey,
  KeyAlgorithm,
  PermissionCheckResult,
} from "../../core/types.ts";
import type { SSHConfigEntry } from "../../src/types/sshConfig.ts";
import type { ActivityLog } from "./log.ts";

export interface ElectronAPI {
  profile: {
    create: (input: CreateProfileInput) => Promise<Profile>;
    update: (input: UpdateProfileInput) => Promise<Profile>;
    delete: (id: string) => Promise<boolean>;
    getAll: () => Promise<Profile[]>;
    getById: (id: string) => Promise<Profile | null>;
  };
  log: {
    getAll: () => Promise<ActivityLog[]>;
    clear: () => Promise<void>;
    clearBefore: (timestamp: number) => Promise<void>;
  };
  ssh: {
    generateKey: (params: {
      algorithm: KeyAlgorithm;
      name: string;
      passphrase?: string;
    }) => Promise<SSHKeyGenerationResult>;
    selectExisting: () => Promise<{ filePath: string } | null>;
    addToAgent: (params: {
      keyPath: string;
      passphrase?: string;
    }) => Promise<{ success: boolean; error?: string }>;
    checkDefaultKeys: () => Promise<DefaultSSHKey[]>;
    getPublicKey: (
      privateKeyPath: string,
    ) => Promise<{ content: string | null; error?: string }>;
    testConnection: (params: {
      hostAlias: string;
      sshUser: string;
      keyPath?: string;
    }) => Promise<{ success: boolean; output: string; error?: string }>;
  };
  sshConfig: {
    update: (profile: Profile) => Promise<{ success: boolean; error?: string }>;
    read: () => Promise<{ content: string; error?: string }>;
    getHostAlias: (
      keyPath: string,
    ) => Promise<{ hostAlias: string | null; error?: string }>;
  };
  sshConfigEditor: {
    read: () => Promise<{ entries: SSHConfigEntry[]; error?: string }>;
    save: (
      entries: SSHConfigEntry[],
    ) => Promise<{ success: boolean; error?: string }>;
  };
  git: {
    getGlobalConfig: () => Promise<{
      config: { [key: string]: string };
      error?: string;
    }>;
    selectFolder: () => Promise<{ folderPath: string } | null>;
    cloneRepository: (params: {
      repoUrl: string;
      destinationFolder: string;
      username: string;
      email: string;
      hostAlias: string;
    }) => Promise<{ success: boolean; error?: string; clonedPath?: string }>;
    updateProjectConfig: (params: {
      projectPath: string;
      username: string;
      email: string;
      repoUrl?: string;
      remoteName?: string;
      hostAlias: string;
    }) => Promise<{ success: boolean; error?: string; oldOrigin?: string }>;
    getProjectConfig: (projectPath: string) => Promise<{
      success: boolean;
      config?: { username?: string; email?: string; origin?: string };
      error?: string;
    }>;
    getProjectRemotes: (projectPath: string) => Promise<{
      success: boolean;
      remotes?: Array<{ name: string; url: string; type: "fetch" | "push" }>;
      error?: string;
    }>;
  };
  sync: {
    scanAndSync: () => Promise<{
      success: boolean;
      syncedCount: number;
      skippedCount: number;
      profiles: Profile[];
      error?: string;
    }>;
  };
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
  };
  github: {
    startOAuth: (
      profileId: string,
    ) => Promise<{ success: boolean; error?: string }>;
    disconnectAccount: (
      profileId: string,
    ) => Promise<{ success: boolean; error?: string }>;
    uploadSSHKey: (
      profileId: string,
    ) => Promise<{ success: boolean; keyTitle?: string; error?: string }>;
    checkKeyExists: (
      profileId: string,
    ) => Promise<{ exists: boolean; error?: string }>;
  };
  gitlab: {
    startOAuth: (
      profileId: string,
    ) => Promise<{ success: boolean; error?: string }>;
    disconnectAccount: (
      profileId: string,
    ) => Promise<{ success: boolean; error?: string }>;
    uploadSSHKey: (
      profileId: string,
    ) => Promise<{ success: boolean; keyTitle?: string; error?: string }>;
    checkKeyExists: (
      profileId: string,
    ) => Promise<{ exists: boolean; error?: string }>;
  };
  bitbucket: {
    startOAuth: (
      profileId: string,
    ) => Promise<{ success: boolean; error?: string }>;
    disconnectAccount: (
      profileId: string,
    ) => Promise<{ success: boolean; error?: string }>;
    uploadSSHKey: (
      profileId: string,
    ) => Promise<{ success: boolean; keyTitle?: string; error?: string }>;
    checkKeyExists: (
      profileId: string,
    ) => Promise<{ exists: boolean; error?: string }>;
  };
  azure: {
    startOAuth: (
      profileId: string,
    ) => Promise<{ success: boolean; error?: string }>;
    disconnectAccount: (
      profileId: string,
    ) => Promise<{ success: boolean; error?: string }>;
    uploadSSHKey: (
      profileId: string,
    ) => Promise<{ success: boolean; keyTitle?: string; error?: string }>;
    checkKeyExists: (
      profileId: string,
    ) => Promise<{ exists: boolean; error?: string }>;
  };
  app: {
    getVersion: () => Promise<string>;
  };
  updater: {
    check: () => Promise<void>;
    download: () => Promise<void>;
    install: () => Promise<void>;
    onStatus: (
      callback: (
        status:
          | "checking"
          | "available"
          | "not-available"
          | "error"
          | "progress"
          | "downloaded",
        data?: any,
      ) => void,
    ) => () => void;
  };
  permissions: {
    /** Check current SSH folder access status. */
    check: () => Promise<PermissionCheckResult>;
    /** Open macOS System Preferences for Full Disk Access. No-op on Windows/Linux. */
    openSettings: () => Promise<void>;
    /** Close the permission window and open the main app window. */
    continue: () => Promise<void>;
  };
}
