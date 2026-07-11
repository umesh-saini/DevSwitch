import { execSync } from "child_process";
import { CLI_VERSION } from "../version.ts";
import type { ParsedArgs } from "../args.ts";
import { error, success, info, c } from "../ui.ts";
import { confirm } from "../prompt.ts";

export async function updateCommand(args: ParsedArgs): Promise<number> {
  info("Checking for updates...");

  let latestCli = CLI_VERSION;
  try {
    const res = await fetch("https://registry.npmjs.org/devswitch-cli/latest");
    if (res.ok) {
      const data = (await res.json()) as { version: string };
      latestCli = data.version;
    }
  } catch (err) {
    info("Could not check npm for CLI updates. Skipping CLI check.");
  }

  let latestApp = "";
  try {
    const res = await fetch(
      "https://api.github.com/repos/umesh-saini/DevSwitch/releases/latest",
      { headers: { "User-Agent": "devswitch-cli" } }
    );
    if (res.ok) {
      const data = (await res.json()) as { tag_name: string };
      latestApp = data.tag_name.replace(/^v/, "");
    }
  } catch (err) {
    info("Could not check GitHub for Desktop App updates. Skipping App check.");
  }

  console.log("");
  console.log(c.bold("=== DevSwitch Update Center ==="));

  if (latestCli !== CLI_VERSION) {
    info(
      `CLI Version:         ${c.red(CLI_VERSION)} (Latest: ${c.green(
        latestCli
      )})`
    );
  } else {
    info(`CLI Version:         ${c.green(CLI_VERSION)} (Up to date)`);
  }

  if (latestApp) {
    info(`Latest Desktop App:  ${c.green(latestApp)}`);
    info(
      `Download page:       https://github.com/umesh-saini/DevSwitch/releases/tag/v${latestApp}`
    );
  }

  console.log("");

  if (latestCli !== CLI_VERSION) {
    if (process.stdin.isTTY) {
      const runUpdate = await confirm(
        "Would you like to update the CLI to the latest version now?",
        true
      );
      if (runUpdate) {
        info("Running: npm install -g devswitch-cli...");
        try {
          execSync("npm install -g devswitch-cli", { stdio: "inherit" });
          success("CLI updated successfully!");
        } catch (err) {
          error(
            "Failed to update CLI. Try running: sudo npm install -g devswitch-cli"
          );
        }
      }
    } else {
      info(
        `To update the CLI, run: ${c.cyan("npm install -g devswitch-cli")}`
      );
    }
  } else {
    success("Your DevSwitch CLI is already up to date!");
  }

  return 0;
}
