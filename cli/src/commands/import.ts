import * as fs from "fs";
import * as path from "path";
import {
  storageService,
  logService,
  decryptWithPassword,
  sshKeyService,
  sshConfigService,
} from "@devswitch/core";
import type { ParsedArgs } from "../args.ts";
import { flagStr, flagBool } from "../args.ts";
import { error, success, info, c } from "../ui.ts";
import { askSecret } from "../prompt.ts";

export async function importCommand(args: ParsedArgs): Promise<number> {
  const { positionals, flags } = args;
  const filePath = positionals[0];

  if (!filePath) {
    error("Missing required argument: <file-path>");
    return 1;
  }

  if (!fs.existsSync(filePath)) {
    error(`File not found: ${filePath}`);
    return 1;
  }

  const newSSH = flagBool(flags, "new-ssh");
  let password = flagStr(flags, "password");

  let fileContent: string;
  try {
    fileContent = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    error(
      `Failed to read file: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return 1;
  }

  let parsed: any;
  try {
    parsed = JSON.parse(fileContent);
  } catch (err) {
    error("Invalid file format: Not a valid JSON file.");
    return 1;
  }

  if (parsed.encrypted && parsed.salt && parsed.iv && parsed.data) {
    if (!password) {
      password = await askSecret("Enter password to decrypt the import");
    }

    if (!password) {
      error("Password is required for encrypted files!");
      return 1;
    }

    try {
      const decrypted = decryptWithPassword(parsed, password);
      parsed = JSON.parse(decrypted);
    } catch (err) {
      error("Failed to decrypt the file. Invalid password or corrupted data.");
      return 1;
    }
  }

  if (!parsed.profiles || !Array.isArray(parsed.profiles)) {
    error("Invalid export payload: 'profiles' array is missing.");
    return 1;
  }

  const existingProfiles = storageService.getAllProfiles();
  let addedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const item of parsed.profiles) {
    const profile = item.profile;
    if (!profile || !profile.id || !profile.username || !profile.email) {
      skippedCount++;
      continue;
    }

    const existing = existingProfiles.find(p => p.id === profile.id);
    if (existing) {
      const isIdentical = JSON.stringify(existing) === JSON.stringify(profile) && !newSSH;
      if (isIdentical) {
        skippedCount++;
        continue;
      } else {
        updatedCount++;
      }
    } else {
      addedCount++;
    }

    if (newSSH) {
      const algorithm = profile.keyAlgorithm || "ed25519";
      const keyName = `id_${algorithm}_${profile.username}_devswitch_${Date.now()}`;
      info(`Generating new SSH key for profile "${profile.name}"...`);
      const result = await sshKeyService.generateKey({
        algorithm: algorithm as "ed25519" | "rsa",
        name: keyName,
        email: profile.email,
      });

      if (result.success && result.keyPath) {
        profile.keyPath = result.keyPath;
        profile.sshKeyType = "generated";
        profile.keyAlgorithm = algorithm;
      } else {
        info(
          `Warning: Failed to generate new key for "${profile.name}": ${result.error}. Reverting to original settings.`
        );
      }
    } else if (item.privateKey && profile.keyPath) {
      try {
        const keyDir = path.dirname(profile.keyPath);
        if (!fs.existsSync(keyDir)) {
          fs.mkdirSync(keyDir, { recursive: true, mode: 0o700 });
        }
        fs.writeFileSync(profile.keyPath, item.privateKey, { mode: 0o600 });
        if (item.publicKey) {
          fs.writeFileSync(`${profile.keyPath}.pub`, item.publicKey, {
            mode: 0o644,
          });
        }
        info(
          `Restored SSH key for profile "${profile.name}" to ${profile.keyPath}`
        );
      } catch (err) {
        info(
          `Warning: Failed to restore SSH key for "${profile.name}": ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }

    storageService.saveProfile(profile);

    if (profile.keyPath) {
      await sshConfigService.updateConfig(profile);
    }
  }

  if (parsed.logs && Array.isArray(parsed.logs)) {
    const existingLogs = logService.getAllLogs();
    const existingIds = new Set(existingLogs.map((l) => l.id));
    let logsAdded = 0;
    for (const log of parsed.logs) {
      if (log && log.id && !existingIds.has(log.id)) {
        existingLogs.push(log);
        logsAdded++;
      }
    }
    if (logsAdded > 0) {
      existingLogs.sort((a, b) => b.timestamp - a.timestamp);
      if (existingLogs.length > 500) {
        existingLogs.length = 500;
      }
      logService["store"].set("logs", existingLogs);
    }
  }

  logService.addLog("PROFILES_IMPORTED", `Imported profiles from ${filePath}: ${addedCount} added, ${updatedCount} updated, ${skippedCount} skipped`, {
    filePath,
    addedCount,
    updatedCount,
    skippedCount,
    totalInFile: parsed.profiles.length
  });

  success(`Successfully imported profiles: ${addedCount} added, ${updatedCount} updated, ${skippedCount} skipped.`);
  return 0;
}
