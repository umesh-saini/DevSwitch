import { storageService, sshConfigService } from "@devswitch/core";
import type { ParsedArgs } from "../args.ts";
import { error, success, c } from "../ui.ts";

export async function renameCommand(args: ParsedArgs): Promise<number> {
  const { positionals } = args;
  const oldName = positionals[0];
  const newName = positionals[1];

  if (!oldName || !newName) {
    error("Missing arguments: Usage: devswitch rename <old-name> <new-name>");
    return 1;
  }

  const profile = storageService.findProfile(oldName);
  if (!profile) {
    error(`Profile "${oldName}" not found.`);
    return 1;
  }

  const prevName = profile.name;
  profile.name = newName;
  profile.updatedAt = Date.now();

  try {
    storageService.saveProfile(profile);
    if (profile.keyPath) {
      await sshConfigService.updateConfig(profile);
    }
    success(`Successfully renamed profile "${c.bold(prevName)}" to "${c.bold(newName)}".`);
    return 0;
  } catch (err) {
    error(
      `Failed to rename profile: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return 1;
  }
}
