import * as fs from "fs";
import { execSync } from "child_process";
import {
  getDataDir,
  getProfilesFilePath,
  storageService,
  sshConfigService,
} from "@devswitch/core";
import type { ParsedArgs } from "../args.ts";
import { flagBool } from "../args.ts";
import { c, sym, heading } from "../ui.ts";
import { CLI_VERSION } from "../version.ts";

function checkCmd(cmd: string): string | null {
  try {
    return execSync(cmd, {
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf-8",
    })
      .trim()
      .split("\n")[0];
  } catch {
    return null;
  }
}

export async function doctorCommand(args: ParsedArgs): Promise<number> {
  const dataDir = getDataDir();
  const profilesPath = getProfilesFilePath();
  const profiles = storageService.getAllProfiles();
  const git = checkCmd("git --version");
  const sshKeygen =
    checkCmd("ssh-keygen --help 2>&1 | head -1") ||
    checkCmd("which ssh-keygen");
  const sshAdd = checkCmd("ssh-add -l");

  const checks = {
    cliVersion: CLI_VERSION,
    node: process.version,
    dataDir,
    dataDirExists: fs.existsSync(dataDir),
    profilesFile: profilesPath,
    profilesFileExists: fs.existsSync(profilesPath),
    profileCount: profiles.length,
    git: git || null,
    sshKeygenAvailable: !!sshKeygen,
    sshAgentRunning: sshAdd !== null,
  };

  if (flagBool(args.flags, "json")) {
    console.log(JSON.stringify(checks, null, 2));
    return 0;
  }

  heading("DevSwitch CLI — doctor");

  const row = (ok: boolean, label: string, detail: string) =>
    console.log(
      `  ${ok ? sym.ok : sym.warn} ${label.padEnd(22)} ${c.gray(detail)}`,
    );

  row(true, "CLI version", CLI_VERSION);
  row(true, "Node", process.version);
  row(
    checks.dataDirExists,
    "Shared data dir",
    dataDir + (checks.dataDirExists ? "" : " (will be created)"),
  );
  row(
    checks.profilesFileExists,
    "Profiles file",
    checks.profilesFileExists ? profilesPath : "not created yet",
  );
  row(true, "Profiles stored", String(checks.profileCount));
  row(!!git, "git", git || "not found in PATH");
  row(!!sshKeygen, "ssh-keygen", sshKeygen ? "available" : "not found");
  row(
    checks.sshAgentRunning,
    "ssh-agent",
    checks.sshAgentRunning ? "reachable" : "not running / unreachable",
  );

  // Surface mismatches between stored profiles and SSH config.
  const notConfigured = profiles.filter(
    (p) =>
      p.keyPath &&
      !sshConfigService.checkProfileConfigured(p) &&
      p.sshKeyType !== "default",
  );
  if (notConfigured.length > 0) {
    console.log("");
    console.log(
      `  ${sym.warn} ${notConfigured.length} profile(s) missing SSH config entries:`,
    );
    for (const p of notConfigured)
      console.log(
        `      ${c.gray("•")} ${p.name} — run 'devswitch use ${p.username}'`,
      );
  }

  console.log("");
  return 0;
}
