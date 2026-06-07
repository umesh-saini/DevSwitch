# DevSwitch — TODO

## App / build (original list)

- [x] Electron auto app updater.
- [x] Multiple OS build support (Linux/macOS/Windows via electron-builder matrix).
- [x] Auto build and publish to GitHub Releases (tag `v*` → installers + `latest*.yml`).
- [ ] macOS: ask for permission on launch using `node-mac-permissions`.
- [x] package.json build configs.
- [x] App icons settings.

## CLI (devswitch) — DONE ✅ (issue #2)

- [x] Standalone `devswitch` command-line tool (Node >= 18).
- [x] Shared `core/` library so the app and CLI use the SAME database.
- [x] Migrate desktop store off electron-store to the shared JSON store.
- [x] Auto-migrate existing profiles/logs from old electron-store locations.
- [x] Commands: help, version, list, use, current, add, remove, show, sync,
      test, pubkey, clone, logs, path, doctor.
- [x] Linux .deb auto-installs the CLI (afterInstall/afterRemove hooks).
- [x] PATH handled natively via npm (`install -g` / `npm link`) — no custom PATH code.
- [x] Standalone curl installer `/init/cli.sh` (for machines without npm).
- [x] CLI docs (cli/README.md) + main README section.
- [x] Publish `devswitch-cli` to npm (live: v1.0.1).
- [x] CI: auto-publish CLI to npm from the `cli-release` branch (skips if version unchanged).

### CLI — nice-to-haves (later)

- [ ] Windows installer (NSIS): register `devswitch` on PATH for app-bundled CLI.
- [ ] macOS pkg/postinstall: symlink `devswitch` for app-bundled CLI.
- [ ] Bundle a Node runtime with the CLI so it works without system Node.
- [ ] Shell completions (bash/zsh/fish).

## Release / distribution follow-ups (next up)

- [ ] Re-tag `v1.0.1` on the fixed commit (the old tag predates the renderer +
      GitHub-publish fixes) and verify the GitHub Release has .deb/.exe/.dmg + yml.
- [ ] Decide the app update feed source: GitHub Releases vs the Next.js site
      (`/git-switch/<os>/`). Then point `updaterService.ts` accordingly.
- [ ] Site (git-phantom-manager): docs CLI section, npm install on all OS tabs,
      refresh `public/git-switch/cli/devswitch.cjs`, replace mock mac/windows
      `latest*.yml` with real 1.0.1. (See HANDOFF_FOR_SITE.md in that repo.)
- [ ] Close GitHub issue #2 (CLI) with the prepared comment.

## Security / hardening (from earlier review — separate decisions)

- [ ] OAuth in packaged builds doesn't work (no `.env` baked in). Decide:
      PKCE (no client secret) or server-side token exchange — do NOT bake
      `GITHUB_CLIENT_SECRET` into the distributed app.
- [ ] Site repo: `JWT_SECRET` falls back to a hardcoded default; require it via
      env and add to `.env.example`. Rotate the seeded admin password.
