import { profileManager } from "@devswitch/core";
import type { ParsedArgs } from "../args.ts";
import { flagBool } from "../args.ts";
import { c, table, info } from "../ui.ts";

export async function listCommand(args: ParsedArgs): Promise<number> {
  const profiles = profileManager.getAllProfiles();

  if (flagBool(args.flags, "json")) {
    console.log(JSON.stringify(profiles, null, 2));
    return 0;
  }

  if (profiles.length === 0) {
    info(
      "No profiles yet. Create one with 'devswitch add' or import with 'devswitch sync'.",
    );
    return 0;
  }

  const rows = profiles.map((p) => [
    p.avatar ? `${p.avatar} ${p.name}` : p.name,
    p.username,
    p.email,
    p.provider || "github",
    p.keyAlgorithm || p.sshKeyType,
    p.hostConfigured ? c.green("yes") : c.gray("no"),
  ]);

  table(["NAME", "USERNAME", "EMAIL", "PROVIDER", "KEY", "SSH CFG"], rows);
  console.log("");
  info(
    `${profiles.length} profile${profiles.length === 1 ? "" : "s"}. Use ${c.cyan("devswitch use <name>")} to switch.`,
  );
  return 0;
}
