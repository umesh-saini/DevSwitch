import {
  getDataDir,
  getProfilesFilePath,
  getLogsFilePath,
} from "@devswitch/core";
import type { ParsedArgs } from "../args.ts";
import { flagBool } from "../args.ts";
import { c } from "../ui.ts";

export async function pathCommand(args: ParsedArgs): Promise<number> {
  const data = {
    dataDir: getDataDir(),
    profiles: getProfilesFilePath(),
    logs: getLogsFilePath(),
  };

  if (flagBool(args.flags, "json")) {
    console.log(JSON.stringify(data, null, 2));
    return 0;
  }

  console.log(`${c.gray("Data dir:")} ${data.dataDir}`);
  console.log(`${c.gray("Profiles:")} ${data.profiles}`);
  console.log(`${c.gray("Logs:    ")} ${data.logs}`);
  return 0;
}
