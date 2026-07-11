import { backupService } from "@devswitch/core";
import type { ParsedArgs } from "../args.ts";
import { flagStr } from "../args.ts";
import { error, success, c, info, table } from "../ui.ts";

export async function backupCommand(args: ParsedArgs): Promise<number> {
  const { positionals, flags } = args;
  const subcommand = positionals[0];

  if (subcommand === "list" || subcommand === "ls") {
    try {
      const list = await backupService.listBackups();
      if (list.length === 0) {
        info("No backup files found.");
        return 0;
      }
      const rows = list.map((bk, index) => [
        String(index + 1),
        bk.filename,
        new Date(bk.timestamp).toLocaleString(),
        `${(bk.size / 1024).toFixed(1)} KB`,
        bk.filePath
      ]);
      table(["#", "FILENAME", "CREATED AT", "SIZE", "FULL PATH"], rows);
      return 0;
    } catch (err) {
      error(`Failed to list backups: ${err instanceof Error ? err.message : String(err)}`);
      return 1;
    }
  }

  if (subcommand === "delete" || subcommand === "rm") {
    const filename = positionals[1];
    if (!filename) {
      error("Please specify the backup filename to delete. Usage: devswitch backup delete <filename>");
      return 1;
    }
    try {
      const successDel = await backupService.deleteBackup(filename);
      if (successDel) {
        success(`Backup ${c.bold(filename)} deleted successfully.`);
        return 0;
      } else {
        error(`Backup file ${c.bold(filename)} does not exist.`);
        return 1;
      }
    } catch (err) {
      error(`Failed to delete backup: ${err instanceof Error ? err.message : String(err)}`);
      return 1;
    }
  }

  const output = flagStr(flags, "output");

  try {
    const savedPath = await backupService.createBackup(output);
    success(`Backup created successfully at ${c.bold(savedPath)}`);
    return 0;
  } catch (err) {
    error(
      `Failed to create backup: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return 1;
  }
}
