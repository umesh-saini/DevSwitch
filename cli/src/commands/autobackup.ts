import { backupService } from "@devswitch/core";
import type { ParsedArgs } from "../args.ts";
import { error, success, info, c } from "../ui.ts";

export async function autobackupCommand(args: ParsedArgs): Promise<number> {
  const { positionals } = args;
  const val = positionals[0]?.toLowerCase();

  if (!val) {
    const isEnabled = backupService.isAutoBackupEnabled();
    info(`Auto-backup is currently ${isEnabled ? c.green("enabled") : c.red("disabled")}.`);
    return 0;
  }

  if (val === "on" || val === "true") {
    backupService.setAutoBackupEnabled(true);
    success("Auto-backup has been enabled.");
    return 0;
  } else if (val === "off" || val === "false") {
    backupService.setAutoBackupEnabled(false);
    success("Auto-backup has been disabled.");
    return 0;
  } else {
    error(`Invalid argument: "${positionals[0]}". Use "on" or "off".`);
    return 1;
  }
}
