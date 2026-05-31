/**
 * CLI version — single source of truth is cli/package.json.
 *
 * The production bundle (built by cli/build.mjs) replaces the
 * __DEVSWITCH_CLI_VERSION__ token with the package.json version via esbuild's
 * `define`, so the shipped CLI always reports the published version.
 *
 * When running the TypeScript source directly during development, that token is
 * undefined and we fall back to reading cli/package.json from disk.
 */
declare const __DEVSWITCH_CLI_VERSION__: string | undefined;

function resolveVersion(): string {
  // In the built bundle this is a string literal.
  if (
    typeof __DEVSWITCH_CLI_VERSION__ !== "undefined" &&
    __DEVSWITCH_CLI_VERSION__
  ) {
    return __DEVSWITCH_CLI_VERSION__;
  }

  // Dev fallback: read package.json next to the CLI source (ESM-safe).
  try {
    const { readFileSync } = require("fs") as typeof import("fs");
    const path = new URL("../package.json", import.meta.url);
    const pkg = JSON.parse(readFileSync(path, "utf8"));
    return pkg.version || "0.0.0-dev";
  } catch {
    return "0.0.0-dev";
  }
}

export const CLI_VERSION = resolveVersion();
