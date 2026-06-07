import { spawn } from "child_process";
import os from "os";

/**
 * Checks if a command exists in the system PATH.
 */
function commandExists(cmd: string): Promise<boolean> {
  return new Promise((resolve) => {
    const checkCmd = os.platform() === "win32" ? "where" : "which";
    const proc = spawn(checkCmd, [cmd], { stdio: "ignore" });
    proc.on("close", (code) => {
      resolve(code === 0);
    });
    proc.on("error", () => {
      resolve(false);
    });
  });
}

/**
 * Copy text to the system clipboard.
 * Supports macOS (pbcopy), Windows (clip), and Linux (wl-copy, xclip, xsel).
 * Returns true if successful, false otherwise.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  const platform = os.platform();
  let cmd = "";
  let args: string[] = [];

  if (platform === "darwin") {
    cmd = "pbcopy";
  } else if (platform === "win32") {
    cmd = "clip";
  } else if (platform === "linux") {
    const hasWlCopy = await commandExists("wl-copy");
    if (hasWlCopy) {
      cmd = "wl-copy";
    } else {
      const hasXclip = await commandExists("xclip");
      if (hasXclip) {
        cmd = "xclip";
        args = ["-selection", "clipboard"];
      } else {
        const hasXsel = await commandExists("xsel");
        if (hasXsel) {
          cmd = "xsel";
          args = ["--clipboard", "--input"];
        } else {
          return false;
        }
      }
    }
  } else {
    return false;
  }

  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { stdio: ["pipe", "ignore", "ignore"] });
    proc.on("error", () => {
      resolve(false);
    });
    proc.on("close", (code) => {
      resolve(code === 0);
    });
    proc.stdin.write(text);
    proc.stdin.end();
  });
}
