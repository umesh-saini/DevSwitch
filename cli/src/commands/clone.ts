import * as path from "path";
import {
  storageService,
  gitService,
  getProviderSSHConfig,
} from "@devswitch/core";
import type { ParsedArgs } from "../args.ts";
import { flagStr, flagBool } from "../args.ts";
import { c, error, success, info } from "../ui.ts";

export async function cloneCommand(args: ParsedArgs): Promise<number> {
  const repoUrl = args.positionals[0];
  const destination = args.positionals[1] || process.cwd();

  if (!repoUrl) {
    error(
      "Usage: devswitch clone <repo-url> [destination-dir] --profile <profile>",
    );
    return 1;
  }

  const profileId = flagStr(args.flags, "profile", "p");
  if (!profileId) {
    error("A profile is required. Pass --profile <name>.");
    return 1;
  }

  const profile = storageService.findProfile(profileId);
  if (!profile) {
    error(`No profile found matching "${profileId}".`);
    return 1;
  }

  const { sshHost } = getProviderSSHConfig(profile.provider);
  const hostAlias = `${sshHost}-${profile.username}`;

  const jsonOut = flagBool(args.flags, "json");
  if (!jsonOut) {
    info(
      `Cloning ${repoUrl} into ${path.resolve(destination)} as ${c.bold(profile.name)}...`,
    );
  }

  const result = await gitService.cloneRepository({
    repoUrl,
    destinationFolder: destination,
    username: profile.username,
    email: profile.email,
    hostAlias,
  });

  if (jsonOut) {
    console.log(JSON.stringify(result, null, 2));
    return result.success ? 0 : 1;
  }

  if (result.success) {
    success(`Cloned to ${result.clonedPath}`);
    info(`Local git identity set to ${profile.username} <${profile.email}>`);
    return 0;
  }

  error(result.error || "Clone failed.");
  return 1;
}
