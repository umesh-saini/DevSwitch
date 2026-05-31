- electron AUTO APP updater.
- multiple os build support.
- auto build and publish to github release.
- mac on app lunch ask for permission using node-mac-permission
- package json build configs.
- app icons settings.

## CLI (devswitch)

- [x] Standalone `devswitch` command-line tool (Node >= 18).
- [x] Shared `core/` library so the app and CLI use the SAME database.
- [x] Migrate desktop store off electron-store to the shared JSON store.
- [x] Auto-migrate existing profiles/logs from old electron-store locations.
- [x] Commands: help, list, use, current, add, remove, show, sync, test,
      pubkey, clone, logs, path, doctor.
- [x] Linux .deb auto-installs the CLI (afterInstall/afterRemove hooks).
- [x] PATH handled natively via npm (`install -g` / `npm link`) — no custom PATH code.
- [x] Standalone curl installer `/init/cli.sh` (for machines without npm).
- [x] CLI docs (cli/README.md) + main README section.
- [ ] Publish `devswitch-cli` to npm.
- [ ] Windows installer (NSIS): register `devswitch` on PATH for app-bundled CLI.
- [ ] macOS pkg/postinstall: symlink `devswitch` for app-bundled CLI.
- [ ] Bundle a Node runtime with the CLI so it works without system Node.
- [ ] Shell completions (bash/zsh/fish).
