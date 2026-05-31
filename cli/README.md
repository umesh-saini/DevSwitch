# devswitch — CLI

The `devswitch` command-line tool manages multiple Git profiles and SSH keys
from your terminal. It is part of [DevSwitch](../README.md) and **shares its
database with the DevSwitch desktop app** — profiles you create in one show up
in the other automatically, with no conflicts.

The CLI is fully standalone: it runs on any machine with **Node.js ≥ 18** and
does not require the desktop app to be installed.

---

## Supported platforms

The CLI is a Node.js program, so it runs on **Windows, macOS, and Linux** — any
system with **Node.js ≥ 18**. It is not Linux-only.

## Installation

You can install the CLI **with the app** or **separately** — in any order. Both
share the same data store, so they always stay in sync.

> **You never edit PATH manually.** All the recommended methods below put the
> `devswitch` command on your PATH for you:
>
> - **npm** (`install -g` / `link`) creates the correct entry per OS inside npm's
>   global bin dir, which is already on PATH — a symlink on macOS/Linux and a
>   `.cmd`/`.ps1` shim on Windows.
> - The **desktop app** installers place the command for you on each OS.

### Option A — npm (recommended, all OSes)

```bash
npm install -g devswitch-cli
devswitch help
```

### Option B — Bundled with the desktop app

When you install DevSwitch, the app makes `devswitch` available system-wide:

- **Linux (.deb):** a post-install hook places the command in `/usr/local/bin`.
- **macOS / Windows:** the installer registers the command on PATH.

```bash
devswitch help
```

If you had already installed the CLI via npm, the app won't overwrite it.

### Option C — Standalone, one-line install (no npm)

For machines without npm. Requires Node.js ≥ 18.

```bash
curl -sSL https://<your-app-host>/init/cli.sh | bash
```

This downloads the bundled CLI and places a `devswitch` launcher into the first
writable directory on your PATH; it prints what to add to your shell profile if
none is writable.

### Option D — From the repository (developers)

```bash
# from the repo root
npm run cli:build      # bundle the CLI → cli/bin/devswitch.cjs
npm run cli:link       # builds + `npm link` so `devswitch` runs your local build
```

`npm link` puts `devswitch` on your PATH automatically (same mechanism as a
global install), so there's no manual PATH setup on any OS.

---

## Commands

| Command                       | Aliases         | Description                                           |
| ----------------------------- | --------------- | ----------------------------------------------------- |
| `devswitch help [command]`    |                 | Show help, optionally for one command                 |
| `devswitch version`           | `-v`            | Print the CLI version                                 |
| `devswitch list`              | `ls`            | List all profiles                                     |
| `devswitch use <profile>`     | `switch`        | Switch to a profile (SSH config + agent + global git) |
| `devswitch current`           | `whoami`        | Show the active profile                               |
| `devswitch add`               | `create`, `new` | Create a new profile (interactive or flags)           |
| `devswitch remove <profile>`  | `rm`, `delete`  | Delete a profile                                      |
| `devswitch show <profile>`    | `view`, `info`  | Show full profile details                             |
| `devswitch sync`              |                 | Import unmanaged SSH keys as profiles                 |
| `devswitch test <profile>`    |                 | Test the SSH connection for a profile                 |
| `devswitch pubkey <profile>`  |                 | Print a profile's public key (pipe-friendly)          |
| `devswitch clone <url> [dir]` |                 | Clone a repo using a profile's identity               |
| `devswitch logs`              | `log`           | Show recent activity (app + CLI)                      |
| `devswitch path`              |                 | Show the shared data directory                        |
| `devswitch doctor`            |                 | Diagnose environment & data store                     |

The `<profile>` argument accepts a profile **name**, **username**, **email**,
or **id** — partial, case-insensitive matches are allowed.

Most commands accept `--json` for scriptable output.

---

## Examples

```bash
# List everything
devswitch list

# Switch to your work identity (updates ~/.ssh/config, ssh-agent, global git)
devswitch use work

# Switch without changing your global git user.name/email
devswitch use work --no-global-git

# Create a profile that generates a fresh ed25519 key
devswitch add \
  --name "Work" --email me@work.com --username me-work \
  --provider github --generate --algorithm ed25519 --key-name id_work

# Create a profile from an existing key
devswitch add --name "OSS" --email me@oss.dev --username me --existing ~/.ssh/id_oss

# Import any SSH keys not yet managed by DevSwitch
devswitch sync

# Verify a profile can authenticate
devswitch test work

# Copy a public key to the clipboard (Linux/Wayland example)
devswitch pubkey work | wl-copy

# Clone a repo using a specific profile's identity
devswitch clone git@github.com:acme/app.git ~/code --profile work
```

---

## How the shared database works

Both the CLI and the desktop app read and write the same files:

| Platform | Location                                                     |
| -------- | ------------------------------------------------------------ |
| Linux    | `$XDG_CONFIG_HOME/devswitch` (default `~/.config/devswitch`) |
| macOS    | `~/Library/Application Support/devswitch`                    |
| Windows  | `%APPDATA%\devswitch`                                        |

- `profiles.json` — your profiles
- `logs.json` — activity log (each entry tagged `app` or `cli`)

Writes are atomic (write-temp-then-rename), and every read is fresh from disk,
so running the app and CLI at the same time is safe.

Override the location with the `DEVSWITCH_DATA_DIR` environment variable (handy
for testing or portable setups):

```bash
DEVSWITCH_DATA_DIR=/tmp/ds-test devswitch list
```

### Migration from older versions

On first run, the CLI/app imports any existing profiles from the previous
electron-store locations (`~/.config/dev-switch`, `~/.config/Electron`, etc.)
into the shared directory. This runs once and never overwrites existing data.

---

## Environment variables

| Variable             | Purpose                            |
| -------------------- | ---------------------------------- |
| `DEVSWITCH_DATA_DIR` | Override the shared data directory |
| `NO_COLOR`           | Disable colored output             |
| `DEVSWITCH_DEBUG`    | Print full stack traces on error   |

---

## Exit codes

`0` on success, `1` on error (profile not found, failed operation, invalid
arguments). Combine with `--json` for scripting.
