import * as fs from "fs";
import * as path from "path";
import { storageService } from "./storageService.ts";
import { logService } from "./logService.ts";
import { getDataDir } from "../paths.ts";

export interface BackupPayload {
  version: string;
  timestamp: number;
  profiles: any[];
  logs: any[];
}

export class BackupService {
  private getBackupsDir(): string {
    const dir = path.join(getDataDir(), "backups");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
    return dir;
  }

  isAutoBackupEnabled(): boolean {
    // Read from the shared store
    return !!storageService["store"].get("autoBackup", false);
  }

  setAutoBackupEnabled(enabled: boolean): void {
    storageService["store"].set("autoBackup", enabled);
  }

  async createBackup(outputPath?: string): Promise<string> {
    const payload: BackupPayload = {
      version: "1.0.0",
      timestamp: Date.now(),
      profiles: storageService.getAllProfiles(),
      logs: logService.getAllLogs(),
    };

    const content = JSON.stringify(payload, null, 2);

    if (outputPath) {
      fs.writeFileSync(outputPath, content, { mode: 0o600 });
      logService.addLog("BACKUP_CREATED", `Manual backup created at custom location: ${outputPath}`, { outputPath });
      return outputPath;
    }

    // Default rolling backup
    const filename = `backup-${Date.now()}.json`;
    const targetPath = path.join(this.getBackupsDir(), filename);
    fs.writeFileSync(targetPath, content, { mode: 0o600 });

    this.pruneOldBackups();

    logService.addLog("BACKUP_CREATED", `Automated backup created: ${filename}`, { filename, targetPath });

    return targetPath;
  }

  private pruneOldBackups(): void {
    try {
      const dir = this.getBackupsDir();
      const files = fs.readdirSync(dir)
        .filter((f) => f.startsWith("backup-") && f.endsWith(".json"))
        .map((f) => ({
          name: f,
          path: path.join(dir, f),
          time: fs.statSync(path.join(dir, f)).mtimeMs,
        }))
        .sort((a, b) => b.time - a.time); // newest first

      // Keep only 5 backups
      if (files.length > 5) {
        const toDelete = files.slice(5);
        for (const file of toDelete) {
          fs.unlinkSync(file.path);
        }
      }
    } catch (e) {
      console.error("Failed to prune backups:", e);
    }
  }

  async listBackups(): Promise<Array<{ filename: string; filePath: string; timestamp: number; size: number }>> {
    try {
      const dir = this.getBackupsDir();
      if (!fs.existsSync(dir)) {
        return [];
      }
      return fs.readdirSync(dir)
        .filter((f) => f.startsWith("backup-") && f.endsWith(".json"))
        .map((f) => {
          const filePath = path.join(dir, f);
          const stat = fs.statSync(filePath);
          const match = f.match(/backup-(\d+)\.json/);
          const timestamp = match ? parseInt(match[1], 10) : stat.mtimeMs;
          return {
            filename: f,
            filePath,
            timestamp,
            size: stat.size,
          };
        })
        .sort((a, b) => b.timestamp - a.timestamp);
    } catch (e) {
      console.error("Failed to list backups:", e);
      return [];
    }
  }

  listBackupsSync(): Array<{ filename: string; filePath: string }> {
    try {
      const dir = this.getBackupsDir();
      if (!fs.existsSync(dir)) {
        return [];
      }
      return fs.readdirSync(dir)
        .filter((f) => f.startsWith("backup-") && f.endsWith(".json"))
        .map((f) => ({
          filename: f,
          filePath: path.join(dir, f),
        }));
    } catch {
      return [];
    }
  }

  async restoreBackup(filePath: string): Promise<void> {
    const content = fs.readFileSync(filePath, "utf8");
    const payload = JSON.parse(content) as BackupPayload;

    if (!payload.profiles || !Array.isArray(payload.profiles)) {
      throw new Error("Invalid backup file: profiles array missing");
    }

    for (const profile of payload.profiles) {
      const p = profile.profile || profile;
      if (p && p.id && p.username && p.email) {
        storageService.saveProfile(p);
      }
    }

    if (payload.logs && Array.isArray(payload.logs)) {
      const existingLogs = logService.getAllLogs();
      const existingIds = new Set(existingLogs.map((l) => l.id));
      let logsAdded = 0;
      for (const log of payload.logs) {
        if (log && log.id && !existingIds.has(log.id)) {
          existingLogs.push(log);
          logsAdded++;
        }
      }
      if (logsAdded > 0) {
        existingLogs.sort((a, b) => b.timestamp - a.timestamp);
        if (existingLogs.length > 500) {
          existingLogs.length = 500;
        }
        logService["store"].set("logs", existingLogs);
      }
    }

    const filename = path.basename(filePath);
    logService.addLog("BACKUP_RESTORED", `Restored profiles database from backup snapshot: ${filename}`, { filename, filePath });
  }

  async deleteBackup(filename: string): Promise<boolean> {
    try {
      const dir = this.getBackupsDir();
      const filePath = path.join(dir, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logService.addLog("BACKUP_DELETED", `Backup snapshot deleted: ${filename}`, { filename });
        return true;
      }
      return false;
    } catch (e) {
      console.error(`Failed to delete backup ${filename}:`, e);
      throw e;
    }
  }

  async triggerAutoBackup(): Promise<void> {
    if (this.isAutoBackupEnabled()) {
      try {
        await this.createBackup();
      } catch (err) {
        console.error("Auto backup failed:", err);
      }
    }
  }
}

export const backupService = new BackupService();
