/**
 * Re-export of the shared core git service.
 * Shared by the desktop app and the `devswitch` CLI.
 */
export { GitService, gitService } from "../../core/services/gitService.ts";
export type {
  CloneRepoParams,
  UpdateProjectParams,
} from "../../core/services/gitService.ts";
