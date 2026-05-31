import { storageService, sshKeyService } from "@devswitch/core";
import type { ParsedArgs } from "../args.ts";
import { error } from "../ui.ts";

export async function pubkeyCommand(args: ParsedArgs): Promise<number> {
  const identifier = args.positionals[0];
  if (!identifier) {
    error("Usage: devswitch pubkey <profile>");
    return 1;
  }

  const profile = storageService.findProfile(identifier);
  if (!profile) {
    error(`No profile found matching "${identifier}".`);
    return 1;
  }

  if (!profile.keyPath) {
    error("This profile has no associated SSH key.");
    return 1;
  }

  const content = sshKeyService.getPublicKeyContent(profile.keyPath);
  if (!content) {
    error(`Public key not found for ${profile.keyPath}.pub`);
    return 1;
  }

  // Print only the key so it can be piped (e.g. `devswitch pubkey work | pbcopy`)
  console.log(content);
  return 0;
}
