import { storageService, profileManager } from "@devswitch/core";
import type { ParsedArgs } from "../args.ts";
import { flagBool } from "../args.ts";
import { c, error, success, info } from "../ui.ts";
import { confirm } from "../prompt.ts";

export async function removeCommand(args: ParsedArgs): Promise<number> {
  const identifier = args.positionals[0];
  if (!identifier) {
    error("Usage: devswitch remove <profile>");
    return 1;
  }

  const profile = storageService.findProfile(identifier);
  if (!profile) {
    error(`No profile found matching "${identifier}".`);
    return 1;
  }

  const jsonOut = flagBool(args.flags, "json");
  const skipConfirm = flagBool(args.flags, "yes", "y");
  const interactive = process.stdin.isTTY && !jsonOut;

  if (!skipConfirm && interactive) {
    const willDeleteKey = profile.sshKeyType === "generated";
    const extra = willDeleteKey
      ? ` This will also delete the generated SSH key at ${profile.keyPath}.`
      : "";
    const ok = await confirm(
      `Delete profile "${profile.name}"?${extra}`,
      false,
    );
    if (!ok) {
      info("Cancelled.");
      return 0;
    }
  } else if (!skipConfirm && !interactive) {
    error("Refusing to delete without confirmation. Re-run with --yes.");
    return 1;
  }

  const deleted = await profileManager.deleteProfile(profile.id, "cli");

  if (jsonOut) {
    console.log(JSON.stringify({ success: deleted, id: profile.id }, null, 2));
    return deleted ? 0 : 1;
  }

  if (deleted) {
    success(`Removed profile ${c.bold(profile.name)}.`);
    return 0;
  }
  error("Failed to remove profile.");
  return 1;
}
