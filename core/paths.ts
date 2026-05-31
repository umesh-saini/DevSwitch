import * as os from "os";
import * as path from "path";
import * as fs from "fs";

/**
 * Cross-platform, Electron-independent data directory resolution.
 *
 * Both the desktop app and the standalone `devswitch` CLI resolve to the SAME
 * directory here, which is what lets them share one database with no conflicts.
 *
 * Resolution order:
 *   1. $DEVSWITCH_DATA_DIR             (explicit override — useful for tests / portable installs)
 *   2. Platform-conventional app-data location:
 *        - Linux:   $XDG_CONFIG_HOME/devswitch  (default ~/.config/devswitch)
 *        - macOS:   ~/Library/Application Support/devswitch
 *        - Windows: %APPDATA%\devswitch
 *
 * NOTE: This intentionally uses the folder name "devswitch" (not the Electron
 * default of "dev-switch" / "Electron"). A one-time migration (see store.ts)
 * copies any pre-existing electron-store data into this location.
 */

const APP_DIR_NAME = "devswitch";

export function getDataDir(): string {
  const override = process.env.DEVSWITCH_DATA_DIR;
  if (override && override.trim()) {
    return override.trim();
  }

  const platform = os.platform();
  const home = os.homedir();

  if (platform === "win32") {
    const appData =
      process.env.APPDATA || path.join(home, "AppData", "Roaming");
    return path.join(appData, APP_DIR_NAME);
  }

  if (platform === "darwin") {
    return path.join(home, "Library", "Application Support", APP_DIR_NAME);
  }

  // Linux / others
  const xdg = process.env.XDG_CONFIG_HOME;
  const base = xdg && xdg.trim() ? xdg.trim() : path.join(home, ".config");
  return path.join(base, APP_DIR_NAME);
}

/** Ensure the data directory exists (created with private 0700 perms). */
export function ensureDataDir(): string {
  const dir = getDataDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  return dir;
}

export function getProfilesFilePath(): string {
  return path.join(getDataDir(), "profiles.json");
}

export function getLogsFilePath(): string {
  return path.join(getDataDir(), "logs.json");
}

/**
 * Legacy electron-store locations that may contain pre-migration data.
 * Used once by the store to import existing profiles/logs.
 */
export function getLegacyStoreCandidates(): {
  profiles: string[];
  logs: string[];
} {
  const platform = os.platform();
  const home = os.homedir();

  let configBases: string[] = [];
  if (platform === "win32") {
    const appData =
      process.env.APPDATA || path.join(home, "AppData", "Roaming");
    configBases = [appData];
  } else if (platform === "darwin") {
    configBases = [path.join(home, "Library", "Application Support")];
  } else {
    const xdg = process.env.XDG_CONFIG_HOME;
    const base = xdg && xdg.trim() ? xdg.trim() : path.join(home, ".config");
    configBases = [base];
  }

  // electron-store wrote to <config>/<productName or "Electron">/<name>.json
  const legacyAppFolders = ["dev-switch", "DevSwitch", "Electron"];

  const profiles: string[] = [];
  const logs: string[] = [];
  for (const cfg of configBases) {
    for (const folder of legacyAppFolders) {
      profiles.push(path.join(cfg, folder, "dev-switch-data.json"));
      logs.push(path.join(cfg, folder, "dev-switch-logs.json"));
    }
  }
  return { profiles, logs };
}
