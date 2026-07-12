# devswitch — CLI

The `devswitch` command-line tool manages multiple Git profiles and SSH keys directly from your terminal. It is part of the [DevSwitch](https://devswitch.in) suite and **shares its database with the DevSwitch desktop application** — profiles you create in the terminal show up in the app instantly, and vice versa.

* **Official Website & Downloads:** [https://devswitch.in](https://devswitch.in)
* **Changelog & Releases:** [https://devswitch.in/changelog](https://devswitch.in/changelog)
* **npm Package:** [https://www.npmjs.com/package/devswitch-cli](https://www.npmjs.com/package/devswitch-cli)

The CLI is fully standalone: it runs on any machine with **Node.js ≥ 18** and does not require the desktop app to be installed.

---

## Supported platforms

The CLI runs on **Windows, macOS, and Linux** — any system with **Node.js ≥ 18**.

## Installation

You can install the CLI **with the app** or **separately** — in any order. Both share the same data store, so they always stay in sync.

### Option A — npm (recommended, all OSes)

npm puts the `devswitch` command on your PATH automatically; no manual PATH editing is required.

```bash
npm install -g devswitch-cli
devswitch help
```

### Option B — Bundled with the desktop app

When you install DevSwitch, the app makes `devswitch` available system-wide:
* **Linux (.deb):** a post-install hook places the command in `/usr/local/bin`.
* **macOS / Windows:** the installer registers the command on PATH.

```bash
devswitch help
```

If you had already installed the CLI via npm, the app won't overwrite it.

### Option C — Standalone Install (no npm)

For machines without npm. Requires Node.js ≥ 18.

```bash
curl -sSL https://devswitch.in/init/cli.sh | bash
```

---

## Commands

| Command | Aliases | Description |
| --- | --- | --- |
| `devswitch help [command]` | | Show help, optionally for one command |
| `devswitch version` | `-v` | Print the CLI version |
| `devswitch list` | `ls` | List all profiles |
| `devswitch use <profile>` | `switch` | Switch to a profile (SSH config + agent + global git) |
| `devswitch current` | `whoami` | Show the active profile |
| `devswitch add` | `create`, `new` | Create a new profile (interactive or flags) |
| `devswitch remove <profile>` | `rm`, `delete` | Delete a profile |
| `devswitch edit <profile>` | | Edit profile properties |
| `devswitch duplicate <src> <dst>`| | Duplicate a profile under a new name with a new key |
| `devswitch rename <old> <new>` | | Rename a profile |
| `devswitch show <profile>` | `view`, `info` | Show full profile details |
| `devswitch stats <profile>` | | Show profile usage statistics |
| `devswitch sync` | | Import unmanaged SSH keys as profiles |
| `devswitch test <profile>` | | Test the SSH connection for a profile |
| `devswitch pubkey <profile>` | | Print a profile's public key (pipe-friendly) |
| `devswitch clone <url> [dir]` | | Clone a repo using a profile's identity |
| `devswitch logs` | `log` | Show recent activity logs (app + CLI) |
| `devswitch path` | | Show the shared data directory |
| `devswitch doctor` | | Diagnose environment & data store |
| `devswitch autobackup [on\|off]` | | Turn automatic backups on or off |
| `devswitch backup [--output path]`| | Create a manual database backup |
| `devswitch backup list` | | List all backup snapshots |
| `devswitch backup delete <file>` | | Delete a backup snapshot |
| `devswitch export [file]` | | Export profiles (supports `--with-ssh` and `--password`) |
| `devswitch import <file>` | | Import profiles (supports `--new-ssh` and `--password`) |
| `devswitch update` | | Update the CLI and desktop application |
| `devswitch install-app` | | Download and install the desktop application |

The `<profile>` argument accepts a profile **name**, **username**, **email**, or **id** — partial, case-insensitive matches are allowed.

Most commands accept `--json` for scriptable output.

---

## Examples

```bash
# List everything
devswitch list

# Switch to your work identity
devswitch use work

# Switch without changing your global git user.name/email
devswitch use work --no-global-git

# Create a profile that generates a fresh ed25519 key
devswitch add \
  --name "Work" --email me@work.com --username me-work \
  --provider github --generate --algorithm ed25519 --key-name id_work

# Create a profile from an existing key
devswitch add --name "OSS" --email me@oss.dev --username me --existing ~/.ssh/id_oss

# Duplicate a profile under a new name with a fresh key
devswitch duplicate work work-backup

# Rename a profile
devswitch rename work work-main

# Show usage statistics for a profile
devswitch stats work-main

# Toggle automated rolling backups
devswitch autobackup on

# Create a manual database backup
devswitch backup --output ~/backup.json

# List existing rolling database snapshots
devswitch backup list

# Delete an old snapshot
devswitch backup delete backup-1720689400.json

# Export profiles and private keys with password encryption
devswitch export devswitch-export.json --with-ssh --password "mypassword"

# Import profiles from an encrypted file and generate new SSH keys
devswitch import devswitch-export.json --new-ssh --password "mypassword"

# Update the CLI and application
devswitch update
```

---

## How the shared database works

Both the CLI and the desktop app read and write the same files:

| Platform | Location |
| --- | --- |
| Linux | `$XDG_CONFIG_HOME/devswitch` (default `~/.config/devswitch`) |
| macOS | `~/Library/Application Support/devswitch` |
| Windows | `%APPDATA%\devswitch` |

* `profiles.json` — your profiles
* `logs.json` — activity log (each entry tagged `app` or `cli`)

Writes are atomic (write-temp-then-rename), and every read is fresh from disk, so running the app and CLI at the same time is safe.

Override the location with the `DEVSWITCH_DATA_DIR` environment variable (handy for testing or portable setups):

```bash
DEVSWITCH_DATA_DIR=/tmp/ds-test devswitch list
```

---

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DEVSWITCH_DATA_DIR` | Override the shared data directory |
| `NO_COLOR` | Disable colored output |
| `DEVSWITCH_DEBUG` | Print full stack traces on error |

---

## Exit codes

`0` on success, `1` on error. Combine with `--json` for scripting.
