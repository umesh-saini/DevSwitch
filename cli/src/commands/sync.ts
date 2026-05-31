import { profileManager } from "@devswitch/core";
import type { ParsedArgs } from "../args.ts";
import { flagBool } from "../args.ts";
import { c, error, success, info } from "../ui.ts";

export async function syncCommand(args: ParsedArgs): Promise<number> {
  const result = await profileManager.scanAndSync("cli");

  if (flagBool(args.flags, "json")) {
    console.log(JSON.stringify(result, null, 2));
    return result.success ? 0 : 1;
  }

  if (!result.success) {
    error(result.error || "Sync failed.");
    return 1;
  }

  if (result.syncedCount > 0) {
    success(
      `Synced ${c.bold(String(result.syncedCount))} new profile${result.syncedCount === 1 ? "" : "s"}.`,
    );
    for (const p of result.profiles) {
      console.log(`  ${c.gray("•")} ${p.name} ${c.gray(`(${p.keyPath})`)}`);
    }
  } else {
    info("No new profiles to sync. All SSH keys are already managed.");
  }
  if (result.skippedCount > 0) {
    info(
      `Skipped ${result.skippedCount} already-managed key${result.skippedCount === 1 ? "" : "s"}.`,
    );
  }
  return 0;
}
