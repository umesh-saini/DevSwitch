import { config } from "dotenv";
config();

import { app, BrowserWindow, ipcMain, dialog } from "electron";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import os from "os";
import { storageService } from "./services/storageService.ts";
import { logService } from "./services/logService.ts";
import type {
  CreateProfileInput,
  Profile,
  UpdateProfileInput,
} from "./type/profile.ts";
import { sshKeyService } from "./services/sshKeyService.ts";
import { sshConfigService } from "./services/sshConfigService.ts";
import { sshConfigParserService } from "./services/sshConfigParserService.ts";
import { getOAuthService, getApiService } from "./services/index.ts";
import { gitService } from "./services/gitService.ts";
import * as profileManager from "../core/services/profileManager.ts";
import { updaterService } from "./services/updaterService.ts";
import {
  checkSSHPermissions,
  openMacPermissionSettings,
} from "./utils/permissionCheck.ts";
import { isSSHAuthSuccess } from "./utils/providerUtils.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { isDev } from "./utils/environment.ts";
import { sshAgentService } from "./services/sshAgentService.ts";

let mainWindow: BrowserWindow | null = null;
let permissionWindow: BrowserWindow | null = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    title: "DevSwitch",
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, "./dist/icons/512x512.png"),
    frame: false,
    titleBarStyle: "hidden",
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.ts"),
      webSecurity: true,
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      devTools: isDev,
    },
  });

  updaterService.setWindow(mainWindow);

  // Remove menu bar
  mainWindow.setMenu(null);

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "dist/index.html"));
  }
};

/**
 * Small, fixed-size window shown when the app does not yet have the
 * required ~/.ssh permissions. Loads the /permission React route.
 * When it closes (for any reason), the main window is created automatically.
 */
const createPermissionWindow = () => {
  permissionWindow = new BrowserWindow({
    title: "DevSwitch – Permission Required",
    width: 560,
    height: 540,
    resizable: false,
    icon: path.join(__dirname, "./dist/icons/512x512.png"),
    center: true,
    frame: false,
    titleBarStyle: "hidden",
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.ts"),
      webSecurity: true,
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      devTools: isDev,
    },
  });

  permissionWindow.setMenu(null);

  if (isDev) {
    permissionWindow.loadURL("http://localhost:5173/#/permission");
    if (isDev) permissionWindow.webContents.openDevTools();
  } else {
    permissionWindow.loadFile(path.join(__dirname, "dist/index.html"), {
      hash: "/permission",
    });
  }

  // Regardless of how the permission window is closed, ensure the main
  // window is created (skip / close button / auto-continue all end up here).
  permissionWindow.on("closed", () => {
    permissionWindow = null;
    if (!mainWindow) {
      createWindow();
    }
  });
};

app.whenReady().then(async () => {
  const permResult = checkSSHPermissions();
  console.log(
    `[DevSwitch] SSH permission check → granted: ${permResult.granted}, ` +
      `status: ${permResult.status}, platform: ${permResult.platform}`,
  );

  if (!permResult.granted) {
    createPermissionWindow();
  } else {
    createWindow();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// IPC Handlers

// Log Management
ipcMain.handle("log:getAll", async () => {
  return logService.getAllLogs();
});

ipcMain.handle("log:clear", async () => {
  logService.clearLogs();
});

ipcMain.handle("log:clearBefore", async (_, timestamp: number) => {
  logService.clearLogsBefore(timestamp);
});

// Profile Management
// All profile orchestration now lives in the shared core `profileManager`,
// which is used identically by the desktop app (here) and the `devswitch` CLI.
// This guarantees both produce the same side effects and write to the same DB.
ipcMain.handle(
  "profile:create",
  async (_, input: CreateProfileInput): Promise<Profile> => {
    return profileManager.createProfile(input, "app");
  },
);

ipcMain.handle(
  "profile:update",
  async (_, input: UpdateProfileInput): Promise<Profile> => {
    return profileManager.updateProfile(input, "app");
  },
);

ipcMain.handle("profile:delete", async (_, id: string): Promise<boolean> => {
  return profileManager.deleteProfile(id, "app");
});

ipcMain.handle("profile:getAll", async (): Promise<Profile[]> => {
  return profileManager.getAllProfiles();
});

ipcMain.handle(
  "profile:getById",
  async (_, id: string): Promise<Profile | null> => {
    return profileManager.getProfileById(id);
  },
);

// SSH Operations
ipcMain.handle(
  "ssh:generateKey",
  async (
    _,
    params: {
      algorithm: "ed25519" | "rsa";
      name: string;
      passphrase?: string;
    },
  ) => {
    return await sshKeyService.generateKey({
      ...params,
      email: "generated@DevSwitch.app",
    });
  },
);

ipcMain.handle("ssh:selectExisting", async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: "Select SSH Private Key",
    defaultPath: path.join(os.homedir(), ".ssh"),
    properties: ["openFile"],
    filters: [
      { name: "SSH Keys", extensions: ["*"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return { filePath: result.filePaths[0] };
});

ipcMain.handle(
  "ssh:addToAgent",
  async (
    _,
    params: {
      keyPath: string;
      passphrase?: string;
    },
  ) => {
    return await sshAgentService.addKeyToAgent(params);
  },
);

ipcMain.handle("ssh:checkDefaultKeys", async () => {
  return await sshKeyService.checkDefaultKeys();
});

ipcMain.handle(
  "ssh:testConnection",
  async (
    _,
    params: {
      hostAlias: string;
      sshUser: string;
      keyPath?: string;
    },
  ): Promise<{ success: boolean; output: string; error?: string }> => {
    try {
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);

      const keyFlag = params.keyPath ? ` -i "${params.keyPath}"` : "";
      const command = `ssh -T${keyFlag} -o BatchMode=yes -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new ${params.sshUser}@${params.hostAlias}`;

      try {
        const { stdout, stderr } = await execAsync(command);
        const output = (stdout + "\n" + stderr).trim();
        return { success: true, output };
      } catch (err: unknown) {
        // Most git providers (GitHub, GitLab, Bitbucket) exit with code 1 even on
        // successful auth — the output contains a "authenticated" / welcome banner.
        const execErr = err as {
          stdout?: string;
          stderr?: string;
          message?: string;
        };
        const output = (
          (execErr.stdout || "") +
          "\n" +
          (execErr.stderr || "")
        ).trim();

        if (isSSHAuthSuccess(output)) {
          return { success: true, output };
        }

        return {
          success: false,
          output,
          error: execErr.message || "SSH connection failed",
        };
      }
    } catch (error) {
      return {
        success: false,
        output: "",
        error:
          error instanceof Error ? error.message : "Failed to run SSH test",
      };
    }
  },
);

ipcMain.handle("ssh:getPublicKey", async (_, privateKeyPath: string) => {
  try {
    const content = sshKeyService.getPublicKeyContent(privateKeyPath);
    return { content, error: content ? undefined : "Public key not found" };
  } catch (error) {
    return {
      content: null,
      error:
        error instanceof Error ? error.message : "Failed to read public key",
    };
  }
});

// SSH Config Operations
ipcMain.handle("sshConfig:update", async (_, profile: Profile) => {
  return await sshConfigService.updateConfig(profile);
});

ipcMain.handle("sshConfig:read", async () => {
  return await sshConfigService.readConfig();
});

ipcMain.handle("sshConfigEditor:read", async () => {
  return await sshConfigParserService.readParsedConfig();
});

ipcMain.handle("sshConfigEditor:save", async (_, entries) => {
  return await sshConfigParserService.saveParsedConfig(entries);
});

ipcMain.handle("sshConfig:getHostAlias", async (_, keyPath: string) => {
  try {
    const hostAlias = sshConfigService.getHostAliasForKeyPath(keyPath);
    return { hostAlias, error: hostAlias ? undefined : "Host alias not found" };
  } catch (error) {
    return {
      hostAlias: null,
      error:
        error instanceof Error ? error.message : "Failed to get host alias",
    };
  }
});

// Git Config Operations
ipcMain.handle("git:getGlobalConfig", async () => {
  try {
    const config = await sshConfigService.getGlobalGitConfig();
    return { config, error: undefined };
  } catch (error) {
    return {
      config: {},
      error:
        error instanceof Error ? error.message : "Failed to get git config",
    };
  }
});

// Sync Operations
ipcMain.handle("sync:scanAndSync", async () => {
  return profileManager.scanAndSync("app");
});

// Window Control Handlers
// Use BrowserWindow.fromWebContents so these work for both the permission
// window and the main window.
ipcMain.handle("window:minimize", (event) => {
  BrowserWindow.fromWebContents(event.sender)?.minimize();
});

ipcMain.handle("window:maximize", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win?.isMaximized()) {
    win.unmaximize();
  } else {
    win?.maximize();
  }
});

ipcMain.handle("window:close", (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close();
});

ipcMain.handle("window:isMaximized", (event) => {
  return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false;
});

// Permission Handlers
ipcMain.handle("permission:check", () => {
  return checkSSHPermissions();
});

ipcMain.handle("permission:openSettings", () => {
  // macOS: opens System Preferences → Privacy & Security → Full Disk Access.
  // No-op on Windows / Linux.
  openMacPermissionSettings();
});

ipcMain.handle("permission:continue", (event) => {
  // Close the permission window; its 'closed' handler will create the main window.
  BrowserWindow.fromWebContents(event.sender)?.close();
});

// ── Provider OAuth / API Handlers (dynamic dispatch) ─────────────────────────
// All provider-specific operations are dispatched through the service registry
// in services/index.ts. To add a new provider, create its service classes and
// register them there — no changes needed here.
const OAUTH_PROVIDERS = ["github", "gitlab", "bitbucket", "azure"] as const;
type OAuthProviderName = (typeof OAUTH_PROVIDERS)[number];

for (const provider of OAUTH_PROVIDERS) {
  ipcMain.handle(`${provider}:startOAuth`, async (_, profileId: string) =>
    getOAuthService(provider as OAuthProviderName).startOAuthFlow(profileId),
  );

  ipcMain.handle(
    `${provider}:disconnectAccount`,
    async (_, profileId: string) => {
      const result = await getOAuthService(
        provider as OAuthProviderName,
      ).disconnectAccount(profileId);
      if (result.success) {
        const profile = storageService.getProfile(profileId);
        logService.addLog(
          "PROVIDER_DISCONNECTED",
          `Disconnected ${provider} account from profile "${profile?.name || profileId}"`,
          { profileId, provider },
        );
      }
      return result;
    },
  );

  ipcMain.handle(`${provider}:uploadSSHKey`, async (_, profileId: string) => {
    const result = await getApiService(
      provider as OAuthProviderName,
    ).uploadSSHKey(profileId);
    if (result.success) {
      const profile = storageService.getProfile(profileId);
      logService.addLog(
        "PROVIDER_KEY_UPLOADED",
        `Uploaded SSH key to ${provider} for profile "${profile?.name || profileId}"`,
        { profileId, provider, keyTitle: result.keyTitle },
      );
    }
    return result;
  });

  ipcMain.handle(`${provider}:checkKeyExists`, async (_, profileId: string) =>
    getApiService(provider as OAuthProviderName).checkKeyExists(profileId),
  );
}

// Git Project Handlers
ipcMain.handle("git:selectFolder", async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: "Select Folder",
    properties: ["openDirectory", "createDirectory"],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return { folderPath: result.filePaths[0] };
});

ipcMain.handle(
  "git:cloneRepository",
  async (
    _,
    params: {
      repoUrl: string;
      destinationFolder: string;
      username: string;
      email: string;
      hostAlias: string;
    },
  ) => {
    return await gitService.cloneRepository(params);
  },
);

ipcMain.handle(
  "git:updateProjectConfig",
  async (
    _,
    params: {
      projectPath: string;
      username: string;
      email: string;
      repoUrl: string;
      hostAlias: string;
    },
  ) => {
    return await gitService.updateProjectConfig(params);
  },
);

ipcMain.handle("git:getProjectConfig", async (_, projectPath: string) => {
  return await gitService.getProjectConfig(projectPath);
});

ipcMain.handle("git:getProjectRemotes", async (_, projectPath: string) => {
  return await gitService.getProjectRemotes(projectPath);
});

// App Handlers
ipcMain.handle("app:getVersion", () => {
  return app.getVersion();
});

// Updater Handlers
ipcMain.handle("updater:check", async () => {
  await updaterService.checkForUpdates();
});

ipcMain.handle("updater:download", () => {
  updaterService.downloadUpdate();
});

ipcMain.handle("updater:install", () => {
  updaterService.installUpdate();
});
