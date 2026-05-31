/**
 * Re-export of the shared core SSH key service.
 * Shared by the desktop app and the `devswitch` CLI.
 */
export {
  SSHKeyService,
  sshKeyService,
} from "../../core/services/sshKeyService.ts";
export type {
  SSHKeyInfo,
  GenerateKeyParams,
  GenerateKeyResult,
} from "../../core/services/sshKeyService.ts";
