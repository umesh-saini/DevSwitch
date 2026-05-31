# Build & Test Notes (personal cheat-sheet)

Quick reference for testing the `devswitch` CLI and building the app + CLI.
Run everything from the repo root: `~/Documents/projects/gitPhantom`.

---

## 0. One-time: where data lives

The app AND the CLI share the same files:

- Linux: `~/.config/devswitch/`
- macOS: `~/Library/Application Support/devswitch/`
- Windows: `%APPDATA%\devswitch\`

Files: `profiles.json`, `logs.json`.
First run auto-imports old profiles from `~/.config/Electron` / `~/.config/dev-switch`.

To test WITHOUT touching real data, point it at a throwaway folder:

```bash
DEVSWITCH_DATA_DIR=/tmp/ds-test devswitch list
```

---

## 1. Test the CLI (fast loop)

### Option A — run the TypeScript source directly (no build)

```bash
# from repo root
DEVSWITCH_DATA_DIR=/tmp/ds-test node --experimental-strip-types cli/src/index.ts help
DEVSWITCH_DATA_DIR=/tmp/ds-test node --experimental-strip-types cli/src/index.ts list
```

### Option B — build the bundle, then run it

```bash
npm run cli:build                  # makes cli/bin/devswitch.cjs
DEVSWITCH_DATA_DIR=/tmp/ds-test node cli/bin/devswitch.cjs list
```

### Option C — install it on your PATH and use the real `devswitch` command

```bash
npm run cli:link                   # builds + `npm link`; `devswitch` runs latest build

devswitch help
devswitch doctor                   # checks node, git, ssh-agent, data store
```

> No manual PATH setup. `npm link` puts `devswitch` in npm's global bin (already
> on PATH) on every OS. To undo it: `npm unlink -g devswitch-cli`.

### Smoke-test checklist (safe to run against a temp dir)

```bash
export DEVSWITCH_DATA_DIR=/tmp/ds-test
node cli/bin/devswitch.cjs add --name "Test" --email t@t.com --username t --existing ~/.ssh/id_ed25519
node cli/bin/devswitch.cjs list
node cli/bin/devswitch.cjs show t
node cli/bin/devswitch.cjs use t --no-global-git
node cli/bin/devswitch.cjs logs --limit 5
node cli/bin/devswitch.cjs remove t --yes
unset DEVSWITCH_DATA_DIR
```

`remove` also cleans the SSH config entry it created. Using a temp `DEVSWITCH_DATA_DIR`
keeps your real profiles untouched (but note: SSH key gen / ssh-agent / ~/.ssh/config
are real system actions — use `--existing` with a key you already have for safe testing).

---

## 2. Build the desktop app (your old flow still works)

Your old steps are unchanged — React first (Vite outputs into `electron/dist/`),
then Electron. The only difference: the CLI now builds automatically too.

### The important pre-build checklist (same as before)

1. Check `.env` exists and has the right values:
   - `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
   - `GITLAB_CLIENT_ID`, `GITLAB_CLIENT_SECRET`
   - `VITE_UPDATE_SERVER_URL` (points at your downloads server)
   - `NODE_ENV=production` for a real build
2. Make sure deps are installed: `npm install` (and once: `npm install` inside `cli/`).

### Build commands

```bash
# Step 1 — build the React app into electron/dist/  (same as your old flow)
npm run build

# Step 2 — build the Electron installer
#   This now ALSO builds the CLI bundle automatically before packaging.
npm run electron:build
```

`npm run electron:build` runs, in order:

1. `tsc` – type-check
2. `npm run cli:build` – bundle the CLI → `cli/bin/devswitch.cjs`
3. `electron-builder` – package the app (`.deb` on Linux)

The CLI bundle is shipped inside the app as a resource, and on Linux the `.deb`
auto-installs the `devswitch` command (via `build/linux/after-install.sh`).

> If you prefer to be explicit, you can still do it in two clear steps:
>
> ```bash
> npm run build          # React -> electron/dist
> npm run cli:build      # CLI   -> cli/bin/devswitch.cjs
> npm run electron:build # package everything
> ```
>
> (Running `cli:build` twice is harmless — `electron:build` just rebuilds it.)

---

## 3. Build the STANDALONE CLI (to publish / distribute by itself)

The standalone CLI is the same single file: `cli/bin/devswitch.cjs`.
It runs on any machine with Node.js 18+ and needs nothing else.

```bash
# Build just the CLI
npm run cli:build
# Output: cli/bin/devswitch.cjs   (self-contained, ~75 KB)
```

### Ways to distribute it

1. **Copy the file to the downloads site** (so `curl … /init/cli.sh | bash` works):

   ```bash
   cp cli/bin/devswitch.cjs \
      ~/Documents/projects/git-phantom-manager/public/git-switch/cli/devswitch.cjs
   ```

   Then the site serves it and the install script `app/init/cli.sh` downloads it.

2. **npm publish** — automatic via GitHub Actions (see section 6 below). You
   normally never run `npm publish` by hand; you just bump the version and push
   to the `cli-release` branch.

3. **Hand someone the file** — they run `node devswitch.cjs help` directly, or
   put it on their PATH themselves. (The `curl … /init/cli.sh` script does this
   automatically for machines without npm.)

---

## 4. TL;DR — the commands I'll actually use

```bash
# test CLI quickly
npm run cli:build && DEVSWITCH_DATA_DIR=/tmp/ds node cli/bin/devswitch.cjs list

# install CLI for daily use
npm run cli:link

# full app release build (checks env first!)
#   1) confirm .env is correct
npm run build            # React -> electron/dist
npm run electron:build   # builds CLI + packages app (.deb)

# standalone CLI only
npm run cli:build        # -> cli/bin/devswitch.cjs
```

---

## 5. Gotchas to remember

- **`.env` first.** A build with missing OAuth keys compiles fine but GitHub/GitLab
  connect won't work. Check it before every release build.
- **React build output** goes to `electron/dist/` (set in `vite.config.ts`), same as before.
- **CLI deps:** the `cli/` folder has its own `node_modules` (just esbuild). If
  `cli:build` ever fails with "esbuild not found", run `npm install` inside `cli/`.
- **`cli/bin/` is gitignored** — it's a build artifact. Always rebuild it before
  packaging or publishing (the build scripts do this for you).
- **Don't hand-edit `cli/bin/devswitch.cjs`** — it's generated. Edit `cli/src/**`.
- **Node version:** Vite wants Node 20.19+/22.12+. Builds work on 20.18 but you'll
  see a warning. Upgrade Node when convenient.
- **Testing safely:** always set `DEVSWITCH_DATA_DIR=/tmp/...` when experimenting so
  you don't pollute your real profiles. SSH key generation and `~/.ssh/config`
  edits are still real — prefer `--existing` keys when testing.

```

```

---

## 6. Auto-publishing the CLI to npm (open-source flow)

The `devswitch` CLI publishes to npm **automatically** from GitHub Actions.
You don't run `npm publish` yourself.

### How it works

- Workflow: `.github/workflows/publish-cli.yml`
- Trigger: a push to the **`cli-release`** branch (this is the stable CLI branch —
  named `cli-release`, not `release`, because the app owns the `release/v*`
  namespace and git can't have both `release` and `release/v*`).
- It reads the version from `cli/package.json` and **only publishes if that
  exact version is not already on npm.** So merging contributor fixes that don't
  bump the version is safe — it just skips publishing.
- The published package contains only `bin/devswitch.cjs` + `README.md` +
  `package.json` (core is inlined into the bundle at build time).

### One-time setup (do this once)

1. Create an npm **Automation** access token:
   - npmjs.com → your avatar → Access Tokens → Generate New Token → **Automation**.
   - (Automation tokens bypass 2FA, which is required for CI publishing.)
2. Add it to GitHub as a repo secret named **`NPM_TOKEN`**:
   - GitHub repo → Settings → Secrets and variables → Actions → New repository secret
   - Name: `NPM_TOKEN`, Value: the token.
   - NOTE: the `NPM_TOKEN` in your local `.env` is for local testing only — CI
     uses the GitHub **secret**, not the `.env` file. Never commit `.env`.
3. Make sure the npm package name is yours:
   - Current name: `devswitch-cli` (unscoped, currently free on npm).
   - If you'd rather use your org scope, rename in `cli/package.json` to
     `@your-org/devswitch` — `publishConfig.access: "public"` is already set.

### Releasing a new CLI version (your normal flow)

```bash
# 1. Bump the version (single source of truth = cli/package.json)
cd cli
npm version patch        # or: minor / major   → updates cli/package.json
cd ..

# 2. Get it onto the `cli-release` branch.
#    Contributors open PRs against `cli-release`; you review and merge.
#    For your own release, merge develop/main -> cli-release, or push there.
git push origin cli-release

# 3. GitHub Actions builds and publishes devswitch-cli@<new-version> to npm.
#    Watch progress in the repo's Actions tab.
```

`npm version` also bumps the number the CLI reports (`devswitch version`) and
the published bundle, because the build injects the version from package.json.

### Test the publish locally before pushing (optional)

```bash
cd cli
npm pack --dry-run       # shows exactly what would be published (no upload)
```

### Manual publish (only if you ever need it)

```bash
cd cli
npm login                # or set NODE_AUTH_TOKEN / ~/.npmrc with your token
npm publish              # prepublishOnly rebuilds the bundle first
```

### Gotchas

- **Version must increase.** npm refuses to republish an existing version. The
  workflow detects this and skips instead of failing — so always run
  `npm version` before you expect a publish.
- **Token type matters.** Use an **Automation** token (not a "Publish" token
  that prompts for 2FA) so CI can publish unattended.
- **Scoped name?** If you switch to `@your-org/devswitch`, the org must exist and
  the token must have publish rights to that scope. `access: public` is already
  configured so the scoped package is published publicly.
