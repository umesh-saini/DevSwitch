/**
 * @devswitch/core
 *
 * Electron-independent shared library used by BOTH the desktop app and the
 * standalone `devswitch` CLI. Everything here runs in plain Node.js.
 *
 * Importing from this barrel guarantees the app and CLI use the exact same
 * data store, encryption, and profile orchestration logic.
 */

// Types
export * from "./types.ts";
export type { ActivityLog, LogActionType, LogSource } from "./type/log.ts";

// Paths & store
export * from "./paths.ts";
export { JsonStore } from "./jsonStore.ts";

// Utils
export { encryptPassphrase, decryptPassphrase } from "./utils/encryption.ts";
export * from "./utils/environment.ts";
export * from "./utils/providerUtils.ts";

// Services (singletons)
export { storageService } from "./services/storageService.ts";
export { logService } from "./services/logService.ts";
export { sshKeyService } from "./services/sshKeyService.ts";
export type {
  SSHKeyInfo,
  GenerateKeyParams,
  GenerateKeyResult,
} from "./services/sshKeyService.ts";
export { sshAgentService } from "./services/sshAgentService.ts";
export { sshConfigService } from "./services/sshConfigService.ts";
export type { HostKeyMapping } from "./services/sshConfigService.ts";
export { gitService } from "./services/gitService.ts";
export type {
  CloneRepoParams,
  UpdateProjectParams,
} from "./services/gitService.ts";
export { testSSHConnection } from "./services/sshTestService.ts";
export type {
  SSHTestParams,
  SSHTestResult,
} from "./services/sshTestService.ts";

// High-level orchestration (used by app IPC handlers and CLI commands)
export * as profileManager from "./services/profileManager.ts";
