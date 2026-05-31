/**
 * Shared domain types used by BOTH the Electron desktop app and the
 * standalone `devswitch` CLI. This file must never import Electron.
 */

export type SSHKeyType = "default" | "generated" | "existing";
export type KeyAlgorithm = "ed25519" | "rsa";
export type GitProvider = "github" | "gitlab" | "bitbucket" | "azure" | "other";

/**
 * Generic provider connection metadata.
 * Works for any provider (GitHub, GitLab, …).
 */
export interface ProviderConnectionMeta {
  connected: boolean;
  accessTokenEncrypted: string | null;
  username: string | null;
  sshKeyAdded: boolean;
}

// ── Permission types ──────────────────────────────────────────────────────────
export type PermissionStatus =
  | "authorized"
  | "denied"
  | "not-determined"
  | "restricted";
export type AppPlatform = "mac" | "windows" | "linux";

export interface PermissionCheckResult {
  granted: boolean;
  status: PermissionStatus;
  platform: AppPlatform;
  details?: string;
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
   * Written by all provider OAuth services. Read by the frontend via providerMeta.
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
  avatar?: string;
  color?: string;
  tags?: string[];
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

export interface SSHConfigEntry {
  id: string; // Unique identifier for UI state
  Host: string;
  HostName: string;
  User: string;
  Port: string;
  IdentityFile: string;
  customFields: { param: string; value: string }[];
}

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  skippedCount: number;
  profiles: Profile[];
  error?: string;
}
