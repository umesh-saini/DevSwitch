import { randomUUID } from "crypto";
import {
  storageService,
  sshKeyService,
  sshConfigService,
} from "@devswitch/core";
import type { ParsedArgs } from "../args.ts";
import { error, success, info, c } from "../ui.ts";
import { askSecret, confirm } from "../prompt.ts";

export async function duplicateCommand(args: ParsedArgs): Promise<number> {
  const { positionals } = args;
  const sourceName = positionals[0];
  const destName = positionals[1];

  if (!sourceName || !destName) {
    error("Missing arguments: Usage: devswitch duplicate <source> <dest>");
    return 1;
  }

  const sourceProfile = storageService.findProfile(sourceName);
  if (!sourceProfile) {
    error(`Source profile "${sourceName}" not found.`);
    return 1;
  }

  const existingDest = storageService.findProfile(destName);
  if (
    existingDest &&
    existingDest.name.toLowerCase() === destName.toLowerCase()
  ) {
    error(`A profile named "${destName}" already exists.`);
    return 1;
  }

  const duplicated = {
    ...sourceProfile,
    id: randomUUID(),
    name: destName,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  if (sourceProfile.sshKeyType === "generated") {
    const algorithm = sourceProfile.keyAlgorithm || "ed25519";
    const keyName = `id_${algorithm}_${destName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")}_devswitch`;

    let passphrase = "";
    if (process.stdin.isTTY) {
      const usePassphrase = await confirm(
        `Protect the new duplicate SSH key with a passphrase?`,
        false
      );
      if (usePassphrase) {
        passphrase = await askSecret("Passphrase");
      }
    }

    info(`Generating a new SSH key for the duplicated profile...`);
    const result = await sshKeyService.generateKey({
      algorithm: algorithm as "ed25519" | "rsa",
      name: keyName,
      email: sourceProfile.email,
      passphrase: passphrase || undefined,
    });

    if (result.success && result.keyPath) {
      duplicated.keyPath = result.keyPath;
    } else {
      error(`Failed to generate SSH key: ${result.error}`);
      return 1;
    }
  }

  try {
    storageService.saveProfile(duplicated);
    if (duplicated.keyPath) {
      await sshConfigService.updateConfig(duplicated);
    }
    success(
      `Successfully duplicated "${c.bold(sourceProfile.name)}" to "${c.bold(
        destName
      )}".`
    );
    return 0;
  } catch (err) {
    error(
      `Failed to duplicate profile: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return 1;
  }
}
