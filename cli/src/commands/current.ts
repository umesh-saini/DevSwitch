import { sshConfigService, storageService } from "@devswitch/core";
import type { ParsedArgs } from "../args.ts";
import { flagBool } from "../args.ts";
import { c, info } from "../ui.ts";

/**
 * Determine the "active" profile by comparing the global git user.email/name
 * against stored profiles. The profile last switched-to via `use` sets these.
 */
export async function currentCommand(args: ParsedArgs): Promise<number> {
  const gitConfig = await sshConfigService.getGlobalGitConfig();
  const email = gitConfig["user.email"];
  const name = gitConfig["user.name"];

  const profiles = storageService.getAllProfiles();
  const match =
    profiles.find(
      (p) => email && p.email.toLowerCase() === email.toLowerCase(),
    ) ||
    profiles.find(
      (p) => name && p.username.toLowerCase() === name.toLowerCase(),
    );

  if (flagBool(args.flags, "json")) {
    console.log(
      JSON.stringify(
        {
          globalGit: { name: name || null, email: email || null },
          activeProfile: match || null,
        },
        null,
        2,
      ),
    );
    return 0;
  }

  console.log(
    `${c.gray("Global git user:")} ${name || c.gray("unset")} <${email || c.gray("unset")}>`,
  );

  if (match) {
    console.log(
      `${c.gray("Active profile: ")} ${match.avatar ? match.avatar + " " : ""}${c.bold(match.name)} ${c.gray(`(${match.provider || "github"})`)}`,
    );
  } else {
    info(
      "No DevSwitch profile matches the current global git identity. Use 'devswitch use <profile>' to switch.",
    );
  }
  return 0;
}
