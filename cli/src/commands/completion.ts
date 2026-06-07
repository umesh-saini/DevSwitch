// @ts-ignore
import omelette from "omelette";
import type { ParsedArgs } from "../args.ts";
import { flagBool } from "../args.ts";
import { error, success } from "../ui.ts";

export async function completionCommand(args: ParsedArgs): Promise<number> {
  const isInstall = flagBool(args.flags, "install");
  if (!isInstall) {
    error("Usage: devswitch completion --install");
    return 1;
  }

  try {
    const completion = omelette("devswitch <action> <profile>");
    success("✅ Tab completion installed! Restart your terminal or run: source ~/.bashrc (or ~/.zshrc for zsh)");
    completion.setupShellInitFile();
    return 0;
  } catch (err) {
    error(`Failed to install completion: ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }
}
