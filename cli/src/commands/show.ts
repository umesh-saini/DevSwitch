import {
  storageService,
  sshConfigService,
  getProviderSSHConfig,
} from "@devswitch/core";
import type { ParsedArgs } from "../args.ts";
import { flagBool } from "../args.ts";
import { c, error, heading } from "../ui.ts";

export async function showCommand(args: ParsedArgs): Promise<number> {
  const identifier = args.positionals[0];
  if (!identifier) {
    error("Usage: devswitch show <profile>");
    return 1;
  }

  const profile = storageService.findProfile(identifier);
  if (!profile) {
    error(`No profile found matching "${identifier}".`);
    return 1;
  }

  if (flagBool(args.flags, "json")) {
    console.log(JSON.stringify(profile, null, 2));
    return 0;
  }

  const { sshHost } = getProviderSSHConfig(profile.provider);
  const hostAlias = `${sshHost}-${profile.username}`;
  const configured = sshConfigService.checkProfileConfigured(profile);

  heading(`${profile.avatar ? profile.avatar + " " : ""}${profile.name}`);
  const line = (label: string, value: string) =>
    console.log(`  ${c.gray(label.padEnd(14))} ${value}`);

  line("Username", profile.username);
  line("Email", profile.email);
  line("Provider", profile.provider || "github");
  line("SSH key type", profile.sshKeyType);
  line("Algorithm", profile.keyAlgorithm || "—");
  line("Key path", profile.keyPath || "—");
  line("Passphrase", profile.hasPassphrase ? "yes (encrypted)" : "no");
  line("Host alias", hostAlias);
  line(
    "SSH config",
    configured ? c.green("configured") : c.yellow("not configured"),
  );
  if (profile.providerMeta?.connected || profile.githubConnected) {
    line(
      "OAuth",
      c.green(
        `connected (${profile.providerMeta?.username || profile.githubUsername || "?"})`,
      ),
    );
  }
  line("Created", new Date(profile.createdAt).toLocaleString());
  line("Updated", new Date(profile.updatedAt).toLocaleString());

  console.log("");
  console.log(
    `  ${c.gray("Clone with:")} git clone git@${hostAlias}:<owner>/<repo>.git`,
  );
  return 0;
}
