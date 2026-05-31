/**
 * Re-export of the shared core SSH config service.
 * Shared by the desktop app and the `devswitch` CLI.
 */
export {
  SSHConfigService,
  sshConfigService,
} from "../../core/services/sshConfigService.ts";
export type { HostKeyMapping } from "../../core/services/sshConfigService.ts";
