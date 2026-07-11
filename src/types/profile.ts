export type LogActionType =
  | 'APP_UPDATE'
  | 'APP_UPDATE_ERROR'
  | 'PROFILE_CREATED'
  | 'PROFILE_UPDATED'
  | 'PROFILE_DELETED'
  | 'SSH_KEY_GENERATED'
  | 'SSH_KEY_IMPORTED'
  | 'SSH_CONFIG_UPDATED'
  | 'PROVIDER_KEY_UPLOADED'
  | 'PROVIDER_DISCONNECTED';

export interface ActivityLog {
  id: string;
  timestamp: number;
  action: LogActionType;
  message: string;
  details?: Record<string, any>;
}

export type SSHKeyType = 'default' | 'generated' | 'existing';
export type KeyAlgorithm = 'ed25519' | 'rsa';
export type GitProvider = 'github' | 'gitlab' | 'bitbucket' | 'azure' | 'other';
import type { SSHConfigEntry } from './sshConfig';

/**
 * Generic provider connection metadata.
 * This replaces the old github-prefixed fields and works for any provider.
 */
export interface ProviderConnectionMeta {
  connected: boolean;
  accessTokenEncrypted: string | null;
  username: string | null;
  sshKeyAdded: boolean;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  username: string;
  sshKeyType: SSHKeyType;
  keyPath: string | null;
  keyAlgorithm: KeyAlgorithm | null;
  hasPassphrase: boolean;
  passphraseEncrypted: string | null;
  hostConfigured: boolean;
  createdAt: number;
  updatedAt: number;
  // Customization fields
  avatar?: string; // emoji or icon name
  color?: string; // hex color for theme
  tags?: string[]; // tags for filtering
  // Git provider (defaults to 'github' for backward-compat)
  provider?: GitProvider;
  /**
   * Provider-agnostic OAuth connection metadata.
   * Written by all provider OAuth services.
   */
  providerMeta?: ProviderConnectionMeta;
  // ── Legacy GitHub-specific fields (kept for backward-compat with stored profiles) ──
  /** @deprecated Use providerMeta instead */
  githubConnected?: boolean;
  /** @deprecated Use providerMeta instead */
  githubAccessTokenEncrypted?: string | null;
  /** @deprecated Use providerMeta instead */
  githubUsername?: string | null;
  /** @deprecated Use providerMeta instead */
  sshKeyAddedToGithub?: boolean;
}

export interface CreateProfileInput {
  name: string;
  email: string;
  username: string;
  sshKeyType: SSHKeyType;
  provider?: GitProvider;
  keyAlgorithm?: KeyAlgorithm;
  keyName?: string;
  passphrase?: string;
  existingKeyPath?: string;
}

export interface UpdateProfileInput {
  id: string;
  name?: string;
  email?: string;
  username?: string;
  sshKeyType?: SSHKeyType;
  provider?: GitProvider;
  keyAlgorithm?: KeyAlgorithm;
  keyName?: string;
  passphrase?: string;
  existingKeyPath?: string;
  avatar?: string;
  color?: string;
  tags?: string[];
}

export interface SSHKeyGenerationResult {
  success: boolean;
  keyPath?: string;
  error?: string;
}

export interface DefaultSSHKey {
  algorithm: KeyAlgorithm;
  privatePath: string;
  publicPath: string;
}

// ── Permission types ──────────────────────────────────────────────────────────
export type PermissionStatus = 'authorized' | 'denied' | 'not-determined' | 'restricted';
export type AppPlatform = 'mac' | 'windows' | 'linux';

export interface PermissionCheckResult {
  granted: boolean;
  status: PermissionStatus;
  platform: AppPlatform;
  details?: string;
}

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
    getPublicKey: (privateKeyPath: string) => Promise<{ content: string | null; error?: string }>;
    testConnection: (params: {
      hostAlias: string;
      sshUser: string;
      keyPath?: string;
    }) => Promise<{ success: boolean; output: string; error?: string }>;
  };
  sshConfig: {
    update: (profile: Profile) => Promise<{ success: boolean; error?: string }>;
    read: () => Promise<{ content: string; error?: string }>;
    getHostAlias: (keyPath: string) => Promise<{ hostAlias: string | null; error?: string }>;
  };
  sshConfigEditor: {
    read: () => Promise<{ entries: SSHConfigEntry[]; error?: string }>;
    save: (entries: SSHConfigEntry[]) => Promise<{ success: boolean; error?: string }>;
  };
  git: {
    getGlobalConfig: () => Promise<{ config: { [key: string]: string }; error?: string }>;
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
      remotes?: Array<{ name: string; url: string; type: 'fetch' | 'push' }>;
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
    startOAuth: (profileId: string) => Promise<{ success: boolean; error?: string }>;
    disconnectAccount: (profileId: string) => Promise<{ success: boolean; error?: string }>;
    uploadSSHKey: (profileId: string) => Promise<{ success: boolean; keyTitle?: string; error?: string }>;
    checkKeyExists: (profileId: string) => Promise<{ exists: boolean; error?: string }>;
  };
  gitlab: {
    startOAuth: (profileId: string) => Promise<{ success: boolean; error?: string }>;
    disconnectAccount: (profileId: string) => Promise<{ success: boolean; error?: string }>;
    uploadSSHKey: (profileId: string) => Promise<{ success: boolean; keyTitle?: string; error?: string }>;
    checkKeyExists: (profileId: string) => Promise<{ exists: boolean; error?: string }>;
  };
  bitbucket: {
    startOAuth: (profileId: string) => Promise<{ success: boolean; error?: string }>;
    disconnectAccount: (profileId: string) => Promise<{ success: boolean; error?: string }>;
    uploadSSHKey: (profileId: string) => Promise<{ success: boolean; keyTitle?: string; error?: string }>;
    checkKeyExists: (profileId: string) => Promise<{ exists: boolean; error?: string }>;
  };
  azure: {
    startOAuth: (profileId: string) => Promise<{ success: boolean; error?: string }>;
    disconnectAccount: (profileId: string) => Promise<{ success: boolean; error?: string }>;
    uploadSSHKey: (profileId: string) => Promise<{ success: boolean; keyTitle?: string; error?: string }>;
    checkKeyExists: (profileId: string) => Promise<{ exists: boolean; error?: string }>;
  };
  app: {
    getVersion: () => Promise<string>;
  };
  updater: {
    check: () => Promise<void>;
    download: () => Promise<void>;
    install: () => Promise<void>;
    onStatus: (callback: (status: 'checking' | 'available' | 'not-available' | 'error' | 'progress' | 'downloaded', data?: any) => void) => () => void;
  };
  permissions: {
    check: () => Promise<PermissionCheckResult>;
    openSettings: () => Promise<void>;
    continue: () => Promise<void>;
  };
  backup: {
    create: (outputPath?: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
    list: () => Promise<Array<{ filename: string; filePath: string; timestamp: number; size: number }>>;
    restore: (filePath: string) => Promise<{ success: boolean; error?: string }>;
    delete: (filename: string) => Promise<{ success: boolean; error?: string }>;
    isAutoEnabled: () => Promise<boolean>;
    setAutoEnabled: (enabled: boolean) => Promise<void>;
  };
  transfer: {
    exportData: (params: { withSSH: boolean; password?: string }) => Promise<{ success: boolean; filePath?: string; error?: string }>;
    importData: (params: { newSSH: boolean; password?: string; filePath?: string }) => Promise<{ success: boolean; requiresPassword?: boolean; filePath?: string; importedCount?: number; addedCount?: number; updatedCount?: number; skippedCount?: number; error?: string }>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
