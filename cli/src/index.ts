import { logService, storageService } from "@devswitch/core";
import { parseArgs, flagBool } from "./args.ts";
import { error } from "./ui.ts";
import { CLI_VERSION } from "./version.ts";
import { printHelp } from "./commands/help.ts";
import { listCommand } from "./commands/list.ts";
import { useCommand } from "./commands/use.ts";
import { addCommand } from "./commands/add.ts";
import { removeCommand } from "./commands/remove.ts";
import { showCommand } from "./commands/show.ts";
import { syncCommand } from "./commands/sync.ts";
import { testCommand } from "./commands/test.ts";
import { pubkeyCommand } from "./commands/pubkey.ts";
import { cloneCommand } from "./commands/clone.ts";
import { logsCommand } from "./commands/logs.ts";
import { pathCommand } from "./commands/path.ts";
import { doctorCommand } from "./commands/doctor.ts";
import { currentCommand } from "./commands/current.ts";
import { completionCommand } from "./commands/completion.ts";
// @ts-ignore
import omelette from "omelette";

// Setup shell autocompletion
const completion = omelette("devswitch <action> <profile>");

completion.on("action", ({ reply }) => {
  reply([
    "add", "create", "new",
    "use", "switch",
    "remove", "rm", "delete",
    "list", "ls",
    "show", "view", "info",
    "sync",
    "test",
    "pubkey", "key", "sshkey", "ssh-key", "publickey", "pub",
    "clone",
    "logs", "log",
    "path",
    "doctor",
    "current", "whoami",
    "completion"
  ]);
});

completion.on("profile", ({ reply, before }) => {
  const profileActions = [
    "use", "switch",
    "remove", "rm", "delete",
    "show", "view", "info",
    "test",
    "pubkey", "key", "sshkey", "ssh-key", "publickey", "pub"
  ];
  if (profileActions.includes(before)) {
    try {
      const profiles = storageService.getAllProfiles();
      reply(profiles.map(p => p.name));
    } catch {
      reply([]);
    }
  } else {
    reply([]);
  }
});

completion.init();

// Anything logged from the CLI is tagged as originating from the terminal.
logService.setDefaultSource("cli");

type CommandFn = (args: ReturnType<typeof parseArgs>) => Promise<number>;

// Canonical command -> handler, plus aliases.
const COMMANDS: Record<string, CommandFn> = {
  list: listCommand,
  ls: listCommand,
  use: useCommand,
  switch: useCommand,
  add: addCommand,
  create: addCommand,
  new: addCommand,
  remove: removeCommand,
  rm: removeCommand,
  delete: removeCommand,
  show: showCommand,
  view: showCommand,
  info: showCommand,
  sync: syncCommand,
  test: testCommand,
  pubkey: pubkeyCommand,
  key: pubkeyCommand,
  sshkey: pubkeyCommand,
  "ssh-key": pubkeyCommand,
  publickey: pubkeyCommand,
  pub: pubkeyCommand,
  clone: cloneCommand,
  logs: logsCommand,
  log: logsCommand,
  path: pathCommand,
  doctor: doctorCommand,
  current: currentCommand,
  whoami: currentCommand,
  completion: completionCommand,
};

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const [command, ...rest] = argv;

  // Top-level version / help shortcuts.
  if (!command || command === "help") {
    printHelp(rest[0]);
    return 0;
  }
  if (command === "--version" || command === "-v" || command === "version") {
    console.log(CLI_VERSION);
    return 0;
  }

  const parsed = parseArgs(rest);

  // Per-command help: `devswitch use --help`
  if (flagBool(parsed.flags, "help", "h")) {
    printHelp(command);
    return 0;
  }

  const handler = COMMANDS[command];
  if (!handler) {
    error(`Unknown command: "${command}"`);
    printHelp();
    return 1;
  }

  return handler(parsed);
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    error(err instanceof Error ? err.message : String(err));
    if (process.env.DEVSWITCH_DEBUG) console.error(err);
    process.exit(1);
  });
