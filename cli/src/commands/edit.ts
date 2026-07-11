import { storageService, profileManager } from "@devswitch/core";
import type { ParsedArgs } from "../args.ts";
import { flagStr, flagBool } from "../args.ts";
import { error, success, c } from "../ui.ts";
import { ask, select } from "../prompt.ts";

const PROVIDERS = ["github", "gitlab", "bitbucket", "azure", "other"];

export async function editCommand(args: ParsedArgs): Promise<number> {
  const { positionals, flags } = args;
  const identifier = positionals[0];

  if (!identifier) {
    error("Missing required argument: <profile-name>");
    return 1;
  }

  const profile = storageService.findProfile(identifier);
  if (!profile) {
    error(`Profile "${identifier}" not found.`);
    return 1;
  }

  const jsonOut = flagBool(flags, "json");
  const interactive =
    process.stdin.isTTY && !jsonOut && Object.keys(flags).length === 0;

  let name = flagStr(flags, "name");
  let email = flagStr(flags, "email");
  let username = flagStr(flags, "username");
  let provider = flagStr(flags, "provider");
  let tagsStr = flagStr(flags, "tags");

  if (interactive) {
    name = await ask("Profile name", profile.name);
    email = await ask("Email", profile.email);
    username = await ask("Username", profile.username);

    const provIdx = await select(
      `Git provider (currently: ${profile.provider || "github"}):`,
      PROVIDERS
    );
    if (provIdx >= 0) {
      provider = PROVIDERS[provIdx];
    }

    tagsStr = await ask("Tags (comma separated)", profile.tags?.join(",") || "");
  }

  const updatedInput: any = {
    id: profile.id,
  };

  if (name !== undefined) updatedInput.name = name;
  if (email !== undefined) updatedInput.email = email;
  if (username !== undefined) updatedInput.username = username;
  if (provider !== undefined) updatedInput.provider = provider;
  if (tagsStr !== undefined) {
    updatedInput.tags = tagsStr
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }

  try {
    const updated = await profileManager.updateProfile(updatedInput, "cli");
    if (jsonOut) {
      console.log(JSON.stringify(updated, null, 2));
      return 0;
    }
    success(`Profile "${c.bold(updated.name)}" has been successfully updated.`);
    return 0;
  } catch (err) {
    error(
      `Failed to update profile: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return 1;
  }
}
