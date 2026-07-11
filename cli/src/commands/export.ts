import * as fs from "fs";
import {
  storageService,
  logService,
  encryptWithPassword,
} from "@devswitch/core";
import type { ParsedArgs } from "../args.ts";
import { flagStr, flagBool } from "../args.ts";
import { error, success, info, c } from "../ui.ts";
import { askSecret } from "../prompt.ts";

export async function exportCommand(args: ParsedArgs): Promise<number> {
  const { positionals, flags } = args;
  let targetPath = positionals[0];

  if (!targetPath) {
    targetPath = "devswitch-export.json";
  }

  const withSSH = flagBool(flags, "with-ssh");
  const passwordProtected = flagBool(flags, "password-protected");
  let password = flagStr(flags, "password");
  const format = flagStr(flags, "format") || "json";

  if (format.toLowerCase() !== "json") {
    error(`Unsupported format: "${format}". Currently only "json" is supported.`);
    return 1;
  }

  const profiles = storageService.getAllProfiles();
  const logs = logService.getAllLogs();

  const exportProfiles = [];
  for (const profile of profiles) {
    const item: any = { profile };

    if (withSSH && profile.keyPath) {
      try {
        if (fs.existsSync(profile.keyPath)) {
          item.privateKey = fs.readFileSync(profile.keyPath, "utf8");
        }
        const pubPath = `${profile.keyPath}.pub`;
        if (fs.existsSync(pubPath)) {
          item.publicKey = fs.readFileSync(pubPath, "utf8");
        }
      } catch (err) {
        info(
          `Warning: could not read SSH key for profile "${profile.name}": ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }
    exportProfiles.push(item);
  }

  const payload = {
    version: "1.0.0",
    timestamp: Date.now(),
    profiles: exportProfiles,
    logs,
  };

  let outputContent = JSON.stringify(payload, null, 2);

  if (passwordProtected || password) {
    if (!password) {
      password = await askSecret("Enter password to encrypt the export");
      const confirmPass = await askSecret("Confirm password");
      if (password !== confirmPass) {
        error("Passwords do not match!");
        return 1;
      }
    }

    if (!password) {
      error("Password cannot be empty!");
      return 1;
    }

    const encryptedPayload = encryptWithPassword(outputContent, password);
    outputContent = JSON.stringify(encryptedPayload, null, 2);
  }

  try {
    fs.writeFileSync(targetPath, outputContent, { mode: 0o600 });
    logService.addLog("PROFILES_EXPORTED", `Exported ${profiles.length} profiles to ${targetPath}`, {
      filePath: targetPath,
      profileCount: profiles.length,
      withSSH,
      encrypted: !!password
    });
    success(`Successfully exported configurations to ${c.bold(targetPath)}`);
    return 0;
  } catch (err) {
    error(
      `Failed to write export file: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return 1;
  }
}
