/**
 * Re-export of the shared core storage service.
 *
 * The desktop app and the `devswitch` CLI now use the SAME storage backend
 * (plain JSON at the shared data dir, see core/paths.ts). This file is kept so
 * existing imports (`./services/storageService.ts`) continue to work unchanged.
 */
export { storageService } from "../../core/services/storageService.ts";
