import fs from 'fs';
import path from 'path';
import os from 'os';
import { createRequire } from 'module';

// Use createRequire to load native CommonJS modules (like node-mac-permissions) in ESM context
const _require = createRequire(import.meta.url);

export type PermissionStatus = 'authorized' | 'denied' | 'not-determined' | 'restricted';
export type AppPlatform = 'mac' | 'windows' | 'linux';

export interface PermissionCheckResult {
  granted: boolean;
  status: PermissionStatus;
  platform: AppPlatform;
  details?: string;
}

const sshDir = path.join(os.homedir(), '.ssh');

/**
 * Check if the app has the necessary permissions to read, create, and edit
 * files in the ~/.ssh directory.
 *
 * macOS  → uses node-mac-permissions to check Full Disk Access status.
 *          Falls back to file-system check if the native module is unavailable.
 * Windows/Linux → directly probes file-system read/write access on ~/.ssh.
 */
export function checkSSHPermissions(): PermissionCheckResult {
  const platform = os.platform();

  if (platform === 'darwin') {
    return checkMacPermissions();
  } else if (platform === 'win32') {
    return checkFileSystemPermissions('windows');
  } else {
    return checkFileSystemPermissions('linux');
  }
}

function checkMacPermissions(): PermissionCheckResult {
  try {
    // node-mac-permissions is an optional macOS-only native module.
    // It will only be present when the app is built/run on macOS.
    const nodeMacPermissions = _require('node-mac-permissions');
    const status = nodeMacPermissions.getAuthStatus('full-disk-access') as string;

    console.log(`[DevSwitch] macOS Full Disk Access status: ${status}`);

    return {
      granted: status === 'authorized',
      status: mapMacStatus(status),
      platform: 'mac',
    };
  } catch {
    // Native module not compiled for this Electron version, or not on macOS –
    // fall back to a direct file-system probe of ~/.ssh.
    console.warn(
      '[DevSwitch] node-mac-permissions unavailable – using file-system fallback'
    );
    return checkFileSystemPermissions('mac');
  }
}

function mapMacStatus(status: string): PermissionStatus {
  switch (status) {
    case 'authorized':    return 'authorized';
    case 'denied':        return 'denied';
    case 'restricted':    return 'restricted';
    default:              return 'not-determined';
  }
}

/**
 * Verifies read + write access to ~/.ssh on Windows and Linux (and macOS fallback).
 * Creates the directory if it does not yet exist.
 */
function checkFileSystemPermissions(platform: AppPlatform): PermissionCheckResult {
  try {
    // Create ~/.ssh if it doesn't exist
    if (!fs.existsSync(sshDir)) {
      fs.mkdirSync(sshDir, { mode: 0o700, recursive: true });
    }

    // Assert read + write permission
    fs.accessSync(sshDir, fs.constants.R_OK | fs.constants.W_OK);

    // Confirm write access with a disposable test file
    const testFile = path.join(sshDir, '.dev-switch-check');
    fs.writeFileSync(testFile, '');
    fs.unlinkSync(testFile);

    return { granted: true, status: 'authorized', platform };
  } catch (err) {
    return {
      granted: false,
      status: 'denied',
      platform,
      details: err instanceof Error ? err.message : 'Permission denied',
    };
  }
}

/**
 * Opens the macOS System Preferences pane for Full Disk Access so the user
 * can manually add DevSwitch. No-op on Windows / Linux.
 */
export function openMacPermissionSettings(): void {
  if (os.platform() !== 'darwin') return;

  try {
    const nodeMacPermissions = _require('node-mac-permissions');
    nodeMacPermissions.askForFullDiskAccess();
    console.log('[DevSwitch] Opened macOS Full Disk Access settings');
  } catch (err) {
    console.error('[DevSwitch] Failed to open macOS permission settings:', err);
  }
}
