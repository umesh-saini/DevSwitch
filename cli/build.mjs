// Bundles the DevSwitch CLI into a single self-contained CommonJS file that
// runs on any Node >= 18 (no TypeScript, no electron, no external deps).
//
// The bundle inlines @devswitch/core, so the CLI is fully standalone and shares
// only the on-disk JSON data store with the desktop app.
import * as esbuild from "esbuild";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const coreDir = path.join(repoRoot, "core");
const outFile = path.join(__dirname, "bin", "devswitch.cjs");

// Read the CLI version from package.json so it is the single source of truth.
const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, "package.json"), "utf8"),
);
const cliVersion = pkg.version;

/**
 * Resolve `@devswitch/core` (and subpaths) to the core/ source folder, and
 * allow TS-style `.ts` import specifiers to resolve on disk.
 */
const corePlugin = {
  name: "devswitch-core-alias",
  setup(build) {
    build.onResolve({ filter: /^@devswitch\/core$/ }, () => ({
      path: path.join(coreDir, "index.ts"),
    }));
    build.onResolve({ filter: /^@devswitch\/core\// }, (args) => {
      const sub = args.path.replace(/^@devswitch\/core\//, "");
      return { path: path.join(coreDir, sub) };
    });
  },
};

await esbuild.build({
  entryPoints: [path.join(__dirname, "src", "index.ts")],
  bundle: true,
  platform: "node",
  target: "node18",
  format: "cjs",
  outfile: outFile,
  plugins: [corePlugin],
  banner: { js: "#!/usr/bin/env node" },
  define: {
    __DEVSWITCH_CLI_VERSION__: JSON.stringify(cliVersion),
  },
  // electron-store is never imported by core anymore, but guard just in case.
  external: ["omelette"],
  logLevel: "info",
  sourcemap: false,
  minify: false,
});

// Make the output executable.
fs.chmodSync(outFile, 0o755);
console.log(
  `\n✓ Built CLI v${cliVersion} → ${path.relative(repoRoot, outFile)}`,
);
