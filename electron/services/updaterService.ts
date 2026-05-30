import pkg from 'electron-updater';
import type { UpdateInfo, ProgressInfo } from 'electron-updater';
import { BrowserWindow } from 'electron';
import { platformFolder } from '../utils/environment.ts';
import { logService } from './logService.ts';
const { autoUpdater } = pkg;

class UpdaterService {
  private window: BrowserWindow | null = null;
  private isChecking = false;

  constructor() {
    // Disable auto downloading, we want user interaction
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;

    // Determine feed URL based on OS and user config
    const baseUrl = process.env.VITE_UPDATE_SERVER_URL || 'http://localhost:3000';

    if (platformFolder) {
      autoUpdater.setFeedURL({
        provider: 'generic',
        url: `${baseUrl}/git-switch/${platformFolder}`
      });
    }

    this.registerEvents();
  }

  public setWindow(window: BrowserWindow) {
    this.window = window;
  }

  private sendStatusToWindow(status: string, data?: any) {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send('updater:status', status, data);
    }
  }

  private registerEvents() {
    autoUpdater.on('checking-for-update', () => {
      logService.addLog('APP_UPDATE', 'Checking for update...');
      this.sendStatusToWindow('checking');
    });

    autoUpdater.on('update-available', (info: UpdateInfo) => {
      logService.addLog('APP_UPDATE', `Update available: ${info.version}`);
      this.isChecking = false;
      this.sendStatusToWindow('available', info);
    });

    autoUpdater.on('update-not-available', (info: UpdateInfo) => {
      logService.addLog('APP_UPDATE', 'No update available.');
      this.isChecking = false;
      this.sendStatusToWindow('not-available', info);
    });

    autoUpdater.on('error', (err) => {
      logService.addLog('APP_UPDATE_ERROR', `Error in auto-updater: ${err?.message}`);
      this.isChecking = false;
      this.sendStatusToWindow('error', err?.message);
    });

    autoUpdater.on('download-progress', (progressObj: ProgressInfo) => {
      this.sendStatusToWindow('progress', progressObj);
    });

    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      logService.addLog('APP_UPDATE', `Update downloaded: ${info.version}`);
      this.sendStatusToWindow('downloaded', info);
    });
  }

  public async checkForUpdates() {
    if (this.isChecking) return;
    this.isChecking = true;

    try {
      await autoUpdater.checkForUpdates();
    } catch (err: any) {
      this.isChecking = false;
      this.sendStatusToWindow('error', err?.message);
      logService.addLog('APP_UPDATE_ERROR', `Error checking for updates: ${err?.message}`);
    }
  }

  public downloadUpdate() {
    autoUpdater.downloadUpdate();
  }

  public installUpdate() {
    autoUpdater.quitAndInstall();
  }
}

export const updaterService = new UpdaterService();
