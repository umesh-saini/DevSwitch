import * as fs from "fs";
import { randomUUID } from "crypto";
import { JsonStore } from "../jsonStore.ts";
import { getLogsFilePath, getLegacyStoreCandidates } from "../paths.ts";
import type { ActivityLog, LogActionType, LogSource } from "../type/log.ts";

interface LogStoreSchema {
  logs: ActivityLog[];
  _migratedFromElectronStore?: boolean;
  [key: string]: unknown;
}

/**
 * Shared activity log used by BOTH the desktop app and the CLI.
 * Each entry records its `source` so the UI can show whether an action was
 * performed from the desktop app or the terminal.
 */
class LogService {
  private store: JsonStore<LogStoreSchema>;
  private maxLogs = 500;
  /** Default source tag for logs created in this process. */
  private defaultSource: LogSource = "app";

  constructor() {
    this.store = new JsonStore<LogStoreSchema>(getLogsFilePath(), {
      logs: [],
    });
    this.migrateFromElectronStoreIfNeeded();
  }

  /** Set the origin tag (the CLI entrypoint calls this with 'cli'). */
  setDefaultSource(source: LogSource): void {
    this.defaultSource = source;
  }

  private migrateFromElectronStoreIfNeeded(): void {
    try {
      const current = this.store.read();
      if (current._migratedFromElectronStore) return;
      if (current.logs && current.logs.length > 0) {
        current._migratedFromElectronStore = true;
        this.store.write(current);
        return;
      }

      const { logs: candidates } = getLegacyStoreCandidates();
      for (const candidate of candidates) {
        if (!fs.existsSync(candidate)) continue;
        try {
          const raw = fs.readFileSync(candidate, "utf8");
          if (!raw.trim()) continue;
          const parsed = JSON.parse(raw) as { logs?: ActivityLog[] };
          if (parsed.logs && parsed.logs.length > 0) {
            current.logs = parsed.logs;
            current._migratedFromElectronStore = true;
            this.store.write(current);
            return;
          }
        } catch {
          // ignore malformed legacy file
        }
      }

      current._migratedFromElectronStore = true;
      this.store.write(current);
    } catch {
      // best-effort
    }
  }

  getAllLogs(): ActivityLog[] {
    return this.store.get("logs", []);
  }

  addLog(
    action: LogActionType,
    message: string,
    details?: Record<string, unknown>,
    source?: LogSource,
  ): ActivityLog {
    const log: ActivityLog = {
      id: randomUUID(),
      timestamp: Date.now(),
      action,
      message,
      source: source ?? this.defaultSource,
      details,
    };

    const logs = this.getAllLogs();
    logs.unshift(log); // newest first

    if (logs.length > this.maxLogs) {
      logs.length = this.maxLogs;
    }

    this.store.set("logs", logs);
    return log;
  }

  clearLogs(): void {
    this.store.set("logs", []);
  }

  clearLogsBefore(timestamp: number): void {
    if (
      typeof timestamp !== "number" ||
      Number.isNaN(timestamp) ||
      !Number.isFinite(timestamp)
    ) {
      return;
    }
    const logs = this.getAllLogs();
    const filtered = logs.filter((log) => log.timestamp >= timestamp);
    this.store.set("logs", filtered);
  }
}

export const logService = new LogService();
