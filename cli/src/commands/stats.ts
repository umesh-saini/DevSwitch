import { storageService, logService } from "@devswitch/core";
import type { ParsedArgs } from "../args.ts";
import { error, c } from "../ui.ts";

export async function statsCommand(args: ParsedArgs): Promise<number> {
  const { positionals } = args;
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

  const logs = logService
    .getAllLogs()
    .filter((l) => l.details?.profileId === profile.id);

  const switchLogs = logs.filter((l) => l.action === "PROFILE_SWITCHED");
  const cliSwitches = switchLogs.filter((l) => l.source === "cli").length;
  const appSwitches = switchLogs.filter((l) => l.source === "app").length;
  const totalSwitches = switchLogs.length;

  const creationDate = new Date(profile.createdAt).toLocaleString();
  const lastSwitchLog = switchLogs[0];
  const lastSwitchDate = lastSwitchLog
    ? new Date(lastSwitchLog.timestamp).toLocaleString()
    : "Never";

  console.log("");
  console.log(c.bold(c.cyan(`=== DevSwitch Statistics: ${profile.name} ===`)));
  console.log(`${c.gray("ID:")}              ${profile.id}`);
  console.log(`${c.gray("Email:")}           ${profile.email}`);
  console.log(`${c.gray("Username:")}        ${profile.username}`);
  console.log(`${c.gray("Git Provider:")}    ${profile.provider || "github"}`);
  console.log(`${c.gray("Created At:")}      ${creationDate}`);
  console.log(
    `${c.gray("Tags:")}            ${profile.tags?.join(", ") || "None"}`
  );
  console.log("");
  console.log(c.bold(c.yellow("--- SSH Key Info ---")));
  console.log(`${c.gray("Type:")}            ${profile.sshKeyType}`);
  console.log(
    `${c.gray("Algorithm:")}       ${profile.keyAlgorithm || "Unknown"}`
  );
  console.log(`${c.gray("Key Path:")}        ${profile.keyPath || "None"}`);
  console.log("");
  console.log(c.bold(c.green("--- Usage Stats ---")));
  console.log(`${c.gray("Total Switches:")}    ${totalSwitches}`);
  console.log(`${c.gray("  via CLI:")}       ${cliSwitches}`);
  console.log(`${c.gray("  via App:")}       ${appSwitches}`);
  console.log(`${c.gray("Last Switched:")}    ${lastSwitchDate}`);
  console.log("");

  return 0;
}
