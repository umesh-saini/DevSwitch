import * as fs from "fs";
import { profileManager } from "@devswitch/core";
import type {
  CreateProfileInput,
  SSHKeyType,
  KeyAlgorithm,
  GitProvider,
} from "@devswitch/core";
import type { ParsedArgs } from "../args.ts";
import { flagStr, flagBool } from "../args.ts";
import { c, error, success, info } from "../ui.ts";
import { ask, askSecret, select, confirm } from "../prompt.ts";

const PROVIDERS: GitProvider[] = [
  "github",
  "gitlab",
  "bitbucket",
  "azure",
  "other",
];

export async function addCommand(args: ParsedArgs): Promise<number> {
  const { flags } = args;
  const jsonOut = flagBool(flags, "json");
  const interactive = process.stdin.isTTY && !jsonOut;

  // ── Gather basic fields ────────────────────────────────────────────────
  let name = flagStr(flags, "name");
  let email = flagStr(flags, "email");
  let username = flagStr(flags, "username");
  let provider = flagStr(flags, "provider") as GitProvider | undefined;

  if (provider && !PROVIDERS.includes(provider)) {
    error(
      `Invalid provider "${provider}". Choose one of: ${PROVIDERS.join(", ")}`,
    );
    return 1;
  }

  if (interactive) {
    if (!name) name = await ask("Profile name");
    if (!email) email = await ask("Email");
    if (!username) username = await ask("Username");
    if (!provider) {
      const idx = await select("Git provider:", PROVIDERS);
      provider = idx >= 0 ? PROVIDERS[idx] : "github";
    }
  }

  provider = provider || "github";

  if (!name || !email || !username) {
    error(
      "Missing required fields. Provide --name, --email and --username (or run interactively).",
    );
    return 1;
  }

  // ── Determine SSH key strategy ─────────────────────────────────────────
  let sshKeyType: SSHKeyType = "default";
  let keyAlgorithm: KeyAlgorithm | undefined;
  let keyName: string | undefined;
  let passphrase: string | undefined;
  let existingKeyPath: string | undefined;

  const wantsDefault = flagBool(flags, "default");
  const wantsGenerate = flagBool(flags, "generate");
  const existingFlag = flagStr(flags, "existing");

  if (existingFlag) {
    sshKeyType = "existing";
    existingKeyPath = existingFlag;
  } else if (wantsGenerate) {
    sshKeyType = "generated";
  } else if (wantsDefault) {
    sshKeyType = "default";
  } else if (interactive) {
    const idx = await select("SSH key:", [
      "Use default key (~/.ssh/id_ed25519 or id_rsa)",
      "Generate a new key",
      "Use an existing key file",
    ]);
    sshKeyType = idx === 1 ? "generated" : idx === 2 ? "existing" : "default";
  }

  if (sshKeyType === "generated") {
    keyAlgorithm = (flagStr(flags, "algorithm") as KeyAlgorithm) || "ed25519";
    if (keyAlgorithm !== "ed25519" && keyAlgorithm !== "rsa") {
      error('Invalid --algorithm. Use "ed25519" or "rsa".');
      return 1;
    }
    keyName = flagStr(flags, "key-name");
    if (!keyName && interactive) {
      keyName = await ask("Key filename", `id_${username}`);
    }
    if (!keyName) {
      error("Generating a key requires --key-name.");
      return 1;
    }
    passphrase = flagStr(flags, "passphrase");
    if (passphrase === undefined && interactive) {
      const usePass = await confirm(
        "Protect the key with a passphrase?",
        false,
      );
      if (usePass) passphrase = await askSecret("Passphrase");
    }
  }

  if (sshKeyType === "existing") {
    if (!existingKeyPath && interactive) {
      existingKeyPath = await ask("Path to existing private key");
    }
    if (!existingKeyPath) {
      error("Using an existing key requires --existing <path>.");
      return 1;
    }
    if (!fs.existsSync(existingKeyPath)) {
      error(`Key file not found: ${existingKeyPath}`);
      return 1;
    }
  }

  const input: CreateProfileInput = {
    name,
    email,
    username,
    provider,
    sshKeyType,
    keyAlgorithm,
    keyName,
    passphrase: passphrase || undefined,
    existingKeyPath,
    avatar: flagStr(flags, "avatar") || "👤",
    color: flagStr(flags, "color") || "#3b82f6",
  };

  try {
    const profile = await profileManager.createProfile(input, "cli");

    if (jsonOut) {
      console.log(JSON.stringify(profile, null, 2));
      return 0;
    }

    success(
      `Created profile ${c.bold(profile.name)} ${c.gray(`(${profile.username})`)}`,
    );
    if (profile.keyPath) info(`SSH key: ${profile.keyPath}`);
    if (profile.hostConfigured) info("SSH config entry added.");
    console.log("");
    info(`Activate it with: ${c.cyan(`devswitch use ${profile.username}`)}`);
    return 0;
  } catch (err) {
    error(err instanceof Error ? err.message : "Failed to create profile.");
    return 1;
  }
}
