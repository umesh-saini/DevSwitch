import {
  storageService,
  testSSHConnection,
  getProviderSSHConfig,
  sshConfigService,
} from "@devswitch/core";
import type { ParsedArgs } from "../args.ts";
import { flagBool } from "../args.ts";
import { c, error, success, info } from "../ui.ts";

export async function testCommand(args: ParsedArgs): Promise<number> {
  const identifier = args.positionals[0];
  if (!identifier) {
    error("Usage: devswitch test <profile>");
    return 1;
  }

  const profile = storageService.findProfile(identifier);
  if (!profile) {
    error(`No profile found matching "${identifier}".`);
    return 1;
  }

  const { sshHost, sshUser } = getProviderSSHConfig(profile.provider);
  const hostAlias = `${sshHost}-${profile.username}`;

  // Make sure the host alias exists before testing.
  if (profile.keyPath) {
    await sshConfigService.updateConfig(profile);
  }

  const jsonOut = flagBool(args.flags, "json");
  if (!jsonOut)
    info(
      `Testing SSH connection for ${c.bold(profile.name)} via ${hostAlias}...`,
    );

  const result = await testSSHConnection({
    hostAlias,
    sshUser,
    keyPath: profile.keyPath || undefined,
  });

  if (jsonOut) {
    console.log(
      JSON.stringify({ profile: profile.name, hostAlias, ...result }, null, 2),
    );
    return result.success ? 0 : 1;
  }

  if (result.success) {
    success("Authentication succeeded.");
    if (result.output) console.log(c.gray(result.output));
    return 0;
  }

  error("Authentication failed.");
  if (result.output) console.log(c.gray(result.output));
  if (result.error) console.log(c.gray(result.error));
  return 1;
}
