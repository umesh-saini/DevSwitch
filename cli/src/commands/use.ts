import { storageService, profileManager } from "@devswitch/core";
import type { ParsedArgs } from "../args.ts";
import { flagBool } from "../args.ts";
import { c, error, success, info, warn } from "../ui.ts";

export async function useCommand(args: ParsedArgs): Promise<number> {
  const identifier = args.positionals[0];
  if (!identifier) {
    error("Usage: devswitch use <profile>");
    return 1;
  }

  const profile = storageService.findProfile(identifier);
  if (!profile) {
    error(`No profile found matching "${identifier}".`);
    info("Run 'devswitch list' to see available profiles.");
    return 1;
  }

  const setGlobalGit = !flagBool(args.flags, "no-global-git");

  const result = await profileManager.switchProfile(
    profile.id,
    { setGlobalGit },
    "cli",
  );

  if (flagBool(args.flags, "json")) {
    console.log(JSON.stringify(result, null, 2));
    return result.success ? 0 : 1;
  }

  if (!result.success) {
    error(result.error || "Failed to switch profile.");
    return 1;
  }

  success(
    `Switched to ${c.bold(profile.name)} ${c.gray(`(${profile.username})`)}`,
  );

  if (result.globalGitSet) {
    info(`Global git identity set to ${profile.username} <${profile.email}>`);
  } else if (setGlobalGit) {
    warn("Could not set global git identity (is git installed?).");
  }

  if (result.agentLoaded) {
    info("SSH key loaded into ssh-agent.");
  } else {
    warn(
      "SSH key was not loaded into ssh-agent (it may be passphrase-protected).",
    );
  }

  console.log("");
  console.log(`  ${c.gray("Clone repos with:")} ${result.cloneUrlExample}`);
  return 0;
}
