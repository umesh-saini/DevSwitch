import { logService } from "@devswitch/core";
import type { ParsedArgs } from "../args.ts";
import { flagStr, flagBool } from "../args.ts";
import { c, info } from "../ui.ts";

export async function logsCommand(args: ParsedArgs): Promise<number> {
  const limitStr = flagStr(args.flags, "limit", "n");
  const limit = limitStr ? parseInt(limitStr, 10) : 20;
  const logs = logService
    .getAllLogs()
    .slice(0, Number.isNaN(limit) ? 20 : limit);

  if (flagBool(args.flags, "json")) {
    console.log(JSON.stringify(logs, null, 2));
    return 0;
  }

  if (logs.length === 0) {
    info("No activity logged yet.");
    return 0;
  }

  for (const log of logs) {
    const time = new Date(log.timestamp).toLocaleString();
    const src = log.source === "cli" ? c.magenta("[cli]") : c.blue("[app]");
    console.log(`${c.gray(time)} ${src} ${c.cyan(log.action)}  ${log.message}`);
  }
  return 0;
}
