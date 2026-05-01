import { config } from 'dotenv';
config();

import { app, BrowserWindow, ipcMain, dialog } from "electron";
import { v4 as uuidv4 } from 'uuid';
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import os from "os";
import { storageService } from "./services/storageService.ts";
import type { CreateProfileInput, Profile, UpdateProfileInput } from './type/profile.ts';
import { sshKeyService, } from "./services/sshKeyService.ts";
import { sshAgentService } from "./services/sshAgentService.ts";
import { sshConfigService,  } from "./services/sshConfigService.ts";
import { encryptPassphrase } from "./utils/encryption.ts";
import { getOAuthService, getApiService } from "./services/index.ts";
import { gitService } from "./services/gitService.ts";
import { checkSSHPermissions, openMacPermissionSettings } from "./utils/permissionCheck.ts";
import { getProviderSSHConfig, isSSHAuthSuccess } from "./utils/providerUtils.ts";


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper Variables
const isWindows = os.platform() === "win32";
const isMac = os.platform() === "darwin";
const isLinux = os.platform() === "linux";

const system = isLinux
  ? "Linux"
  : isMac
  ? "Mac"
  : isWindows
  ? "Windows"
  : "N/A";

console.log(`Running on ${system}`);

// TODO: Set to false for production
const isDev = true; // false

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
    titleBarStyle: 'hidden',
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
    titleBarStyle: 'hidden',
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
    `status: ${permResult.status}, platform: ${permResult.platform}`
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

// Profile Management
ipcMain.handle('profile:create', async (_, input: CreateProfileInput): Promise<Profile> => {
  const profile: Profile = {
    id: uuidv4(),
    name: input.name,
    email: input.email,
    username: input.username,
    sshKeyType: input.sshKeyType,
    keyPath: null,
    keyAlgorithm: null,
    hasPassphrase: false,
    passphraseEncrypted: null,
    hostConfigured: false,
    provider: input.provider,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // Handle SSH key based on type
  if (input.sshKeyType === 'default') {
    profile.keyPath = sshKeyService.getDefaultKeyPath();
  } else if (input.sshKeyType === 'generated' && input.keyAlgorithm && input.keyName) {
    const result = await sshKeyService.generateKey({
      algorithm: input.keyAlgorithm,
      name: input.keyName,
      passphrase: input.passphrase,
      email: input.email,
    });

    if (result.success && result.keyPath) {
      profile.keyPath = result.keyPath;
      profile.keyAlgorithm = input.keyAlgorithm;
      
      if (input.passphrase) {
        profile.hasPassphrase = true;
        profile.passphraseEncrypted = encryptPassphrase(input.passphrase);
      }

      // Add to ssh-agent
      await sshAgentService.addKeyToAgent({
        keyPath: result.keyPath,
        passphrase: input.passphrase,
      });
    } else {
      throw new Error(result.error || 'Failed to generate SSH key');
    }
  } else if (input.sshKeyType === 'existing' && input.existingKeyPath) {
    profile.keyPath = input.existingKeyPath;
  }

  // Update SSH config
  if (profile.keyPath) {
    const configResult = await sshConfigService.updateConfig(profile);
    profile.hostConfigured = configResult.success;
  }

  // Save profile
  storageService.saveProfile(profile);

  return profile;
});

ipcMain.handle('profile:update', async (_, input: UpdateProfileInput): Promise<Profile> => {
  const existingProfile = storageService.getProfile(input.id);
  
  if (!existingProfile) {
    throw new Error('Profile not found');
  }

  const updatedProfile: Profile = {
    ...existingProfile,
    name: input.name ?? existingProfile.name,
    email: input.email ?? existingProfile.email,
    username: input.username ?? existingProfile.username,
    avatar: input.avatar ?? existingProfile.avatar,
    color: input.color ?? existingProfile.color,
    tags: input.tags ?? existingProfile.tags,
    provider: input.provider ?? existingProfile.provider,
    updatedAt: Date.now(),
  };

  // Handle SSH key updates if provided
  if (input.sshKeyType) {
    updatedProfile.sshKeyType = input.sshKeyType;

    if (input.sshKeyType === 'default') {
      updatedProfile.keyPath = sshKeyService.getDefaultKeyPath();
      updatedProfile.keyAlgorithm = null;
      updatedProfile.hasPassphrase = false;
      updatedProfile.passphraseEncrypted = null;
    } else if (input.sshKeyType === 'generated' && input.keyAlgorithm && input.keyName) {
      const result = await sshKeyService.generateKey({
        algorithm: input.keyAlgorithm,
        name: input.keyName,
        passphrase: input.passphrase,
        email: updatedProfile.email,
      });

      if (result.success && result.keyPath) {
        updatedProfile.keyPath = result.keyPath;
        updatedProfile.keyAlgorithm = input.keyAlgorithm;
        
        if (input.passphrase) {
          updatedProfile.hasPassphrase = true;
          updatedProfile.passphraseEncrypted = encryptPassphrase(input.passphrase);
        }

        await sshAgentService.addKeyToAgent({
          keyPath: result.keyPath,
          passphrase: input.passphrase,
        });
      }
    } else if (input.sshKeyType === 'existing' && input.existingKeyPath) {
      updatedProfile.keyPath = input.existingKeyPath;
      updatedProfile.keyAlgorithm = null;
      updatedProfile.hasPassphrase = false;
      updatedProfile.passphraseEncrypted = null;
    }
  }

  // Update SSH config
  if (updatedProfile.keyPath) {
    const configResult = await sshConfigService.updateConfig(updatedProfile);
    updatedProfile.hostConfigured = configResult.success;
  }

  storageService.saveProfile(updatedProfile);

  return updatedProfile;
});

ipcMain.handle('profile:delete', async (_, id: string): Promise<boolean> => {
  const profile = storageService.getProfile(id);
  
  if (profile) {
    // Remove from SSH config
    await sshConfigService.removeProfileConfig(id);
    
    // Delete SSH key files if it was generated by DevSwitch
    if (profile.sshKeyType === 'generated' && profile.keyPath) {
      sshKeyService.deleteKey(profile.keyPath);
    }
  }

  return storageService.deleteProfile(id);
});

ipcMain.handle('profile:getAll', async (): Promise<Profile[]> => {
  return storageService.getAllProfiles();
});

ipcMain.handle('profile:getById', async (_, id: string): Promise<Profile | null> => {
  const profile = storageService.getProfile(id);
  return profile || null;
});

// SSH Operations
ipcMain.handle('ssh:generateKey', async (_, params: {
  algorithm: 'ed25519' | 'rsa';
  name: string;
  passphrase?: string;
}) => {
  return await sshKeyService.generateKey({
    ...params,
    email: 'generated@DevSwitch.app',
  });
});

ipcMain.handle('ssh:selectExisting', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: 'Select SSH Private Key',
    defaultPath: path.join(os.homedir(), '.ssh'),
    properties: ['openFile'],
    filters: [
      { name: 'SSH Keys', extensions: ['*'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return { filePath: result.filePaths[0] };
});

ipcMain.handle('ssh:addToAgent', async (_, params: {
  keyPath: string;
  passphrase?: string;
}) => {
  return await sshAgentService.addKeyToAgent(params);
});

ipcMain.handle('ssh:checkDefaultKeys', async () => {
  return await sshKeyService.checkDefaultKeys();
});

ipcMain.handle('ssh:testConnection', async (_, params: {
  hostAlias: string;
  sshUser: string;
  keyPath?: string;
}): Promise<{ success: boolean; output: string; error?: string }> => {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const keyFlag = params.keyPath ? ` -i "${params.keyPath}"` : '';
    const command = `ssh -T${keyFlag} -o BatchMode=yes -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new ${params.sshUser}@${params.hostAlias}`;

    try {
      const { stdout, stderr } = await execAsync(command);
      const output = (stdout + '\n' + stderr).trim();
      return { success: true, output };
    } catch (err: unknown) {
      // Most git providers (GitHub, GitLab, Bitbucket) exit with code 1 even on
      // successful auth — the output contains a "authenticated" / welcome banner.
      const execErr = err as { stdout?: string; stderr?: string; message?: string };
      const output = ((execErr.stdout || '') + '\n' + (execErr.stderr || '')).trim();

      if (isSSHAuthSuccess(output)) {
        return { success: true, output };
      }

      return {
        success: false,
        output,
        error: execErr.message || 'SSH connection failed',
      };
    }
  } catch (error) {
    return {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : 'Failed to run SSH test',
    };
  }
});

ipcMain.handle('ssh:getPublicKey', async (_, privateKeyPath: string) => {
  try {
    const content = sshKeyService.getPublicKeyContent(privateKeyPath);
    return { content, error: content ? undefined : 'Public key not found' };
  } catch (error) {
    return {
      content: null,
      error: error instanceof Error ? error.message : 'Failed to read public key',
    };
  }
});

// SSH Config Operations
ipcMain.handle('sshConfig:update', async (_, profile: Profile) => {
  return await sshConfigService.updateConfig(profile);
});

ipcMain.handle('sshConfig:read', async () => {
  return await sshConfigService.readConfig();
});

ipcMain.handle('sshConfig:getHostAlias', async (_, keyPath: string) => {
  try {
    const hostAlias = sshConfigService.getHostAliasForKeyPath(keyPath);
    return { hostAlias, error: hostAlias ? undefined : 'Host alias not found' };
  } catch (error) {
    return {
      hostAlias: null,
      error: error instanceof Error ? error.message : 'Failed to get host alias',
    };
  }
});

// Git Config Operations
ipcMain.handle('git:getGlobalConfig', async () => {
  try {
    const config = await sshConfigService.getGlobalGitConfig();
    return { config, error: undefined };
  } catch (error) {
    return {
      config: {},
      error: error instanceof Error ? error.message : 'Failed to get git config',
    };
  }
});

// Sync Operations
ipcMain.handle('sync:scanAndSync', async () => {
  try {
    // Get all SSH keys
    const allKeys = await sshKeyService.scanAllSSHKeys();
    
    // Get all host mappings from SSH config
    const hostMappings = sshConfigService.getAllHostKeyMappings();
    
    // Get existing profiles
    const existingProfiles = storageService.getAllProfiles();
    
    // Track created profiles
    const syncedProfiles: Profile[] = [];
    const skippedKeys: string[] = [];
    
    for (const keyInfo of allKeys) {
      // Check if profile already exists for this key
      const existingProfile = existingProfiles.find(
        p => p.keyPath === keyInfo.privatePath
      );
      
      if (existingProfile) {
        skippedKeys.push(keyInfo.privatePath);
        continue;
      }
      
      // Find matching host mapping for this key
      const hostMapping = hostMappings.find(
        m => path.normalize(m.identityFile) === path.normalize(keyInfo.privatePath)
      );
      
      // Determine username
      let username = hostMapping?.username || null;
      
      // If no username from host, try to extract from email
      if (!username && keyInfo.email) {
        username = keyInfo.email.split('@')[0];
      }
      
      // If still no username, use key filename
      if (!username) {
        username = path.basename(keyInfo.privatePath);
      }
      
      // Determine email
      const email = keyInfo.email || `${username}@local`;
      
      // Generate profile name
      const profileName = `${username} (Synced)`;
      
      // Create profile
      const profile: Profile = {
        id: uuidv4(),
        name: profileName,
        email: email,
        username: username,
        sshKeyType: 'existing',
        keyPath: keyInfo.privatePath,
        keyAlgorithm: keyInfo.algorithm === 'rsa' || keyInfo.algorithm === 'ed25519' 
          ? keyInfo.algorithm 
          : null,
        hasPassphrase: false,
        passphraseEncrypted: null,
        hostConfigured: hostMapping ? true : false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      // Update SSH config if no host mapping exists
      if (!hostMapping) {
        await sshConfigService.updateConfig(profile);
        profile.hostConfigured = true;
      }
      
      // Save profile
      storageService.saveProfile(profile);
      syncedProfiles.push(profile);
    }
    
    return {
      success: true,
      syncedCount: syncedProfiles.length,
      skippedCount: skippedKeys.length,
      profiles: syncedProfiles,
    };
  } catch (error) {
    return {
      success: false,
      syncedCount: 0,
      skippedCount: 0,
      profiles: [],
      error: error instanceof Error ? error.message : 'Failed to sync profiles',
    };
  }
});

// Window Control Handlers
// Use BrowserWindow.fromWebContents so these work for both the permission
// window and the main window.
ipcMain.handle('window:minimize', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.minimize();
});

ipcMain.handle('window:maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win?.isMaximized()) {
    win.unmaximize();
  } else {
    win?.maximize();
  }
});

ipcMain.handle('window:close', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close();
});

ipcMain.handle('window:isMaximized', (event) => {
  return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false;
});

// Permission Handlers
ipcMain.handle('permission:check', () => {
  return checkSSHPermissions();
});

ipcMain.handle('permission:openSettings', () => {
  // macOS: opens System Preferences → Privacy & Security → Full Disk Access.
  // No-op on Windows / Linux.
  openMacPermissionSettings();
});

ipcMain.handle('permission:continue', (event) => {
  // Close the permission window; its 'closed' handler will create the main window.
  BrowserWindow.fromWebContents(event.sender)?.close();
});

// ── Provider OAuth / API Handlers (dynamic dispatch) ─────────────────────────
// All provider-specific operations are dispatched through the service registry
// in services/index.ts. To add a new provider, create its service classes and
// register them there — no changes needed here.
const OAUTH_PROVIDERS = ['github', 'gitlab', 'bitbucket', 'azure'] as const;
type OAuthProviderName = typeof OAUTH_PROVIDERS[number];

for (const provider of OAUTH_PROVIDERS) {
  ipcMain.handle(`${provider}:startOAuth`, async (_, profileId: string) =>
    getOAuthService(provider as OAuthProviderName).startOAuthFlow(profileId),
  );

  ipcMain.handle(`${provider}:disconnectAccount`, async (_, profileId: string) =>
    getOAuthService(provider as OAuthProviderName).disconnectAccount(profileId),
  );

  ipcMain.handle(`${provider}:uploadSSHKey`, async (_, profileId: string) =>
    getApiService(provider as OAuthProviderName).uploadSSHKey(profileId),
  );

  ipcMain.handle(`${provider}:checkKeyExists`, async (_, profileId: string) =>
    getApiService(provider as OAuthProviderName).checkKeyExists(profileId),
  );
}

// Git Project Handlers
ipcMain.handle('git:selectFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: 'Select Folder',
    properties: ['openDirectory', 'createDirectory'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return { folderPath: result.filePaths[0] };
});

ipcMain.handle('git:cloneRepository', async (_, params: {
  repoUrl: string;
  destinationFolder: string;
  username: string;
  email: string;
  hostAlias: string;
}) => {
  return await gitService.cloneRepository(params);
});

ipcMain.handle('git:updateProjectConfig', async (_, params: {
  projectPath: string;
  username: string;
  email: string;
  repoUrl: string;
  hostAlias: string;
}) => {
  return await gitService.updateProjectConfig(params);
});

ipcMain.handle('git:getProjectConfig', async (_, projectPath: string) => {
  return await gitService.getProjectConfig(projectPath);
});

ipcMain.handle('git:getProjectRemotes', async (_, projectPath: string) => {
  return await gitService.getProjectRemotes(projectPath);
});