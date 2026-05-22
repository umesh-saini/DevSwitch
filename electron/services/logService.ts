import Store from 'electron-store';
import { v4 as uuidv4 } from 'uuid';
import type { ActivityLog, LogActionType } from '../type/log.ts';

interface LogStoreSchema {
  logs: ActivityLog[];
}

class LogService {
  private store: Store<LogStoreSchema>;
  private maxLogs = 500;

  constructor() {
    this.store = new Store<LogStoreSchema>({
      name: 'dev-switch-logs',
      defaults: {
        logs: [],
      },
    });
  }

  getAllLogs(): ActivityLog[] {
    return this.store.get('logs', []);
  }

  addLog(action: LogActionType, message: string, details?: Record<string, any>): ActivityLog {
    const log: ActivityLog = {
      id: uuidv4(),
      timestamp: Date.now(),
      action,
      message,
      details,
    };

    const logs = this.getAllLogs();
    logs.unshift(log); // Add to the beginning

    // Cap at maxLogs
    if (logs.length > this.maxLogs) {
      logs.length = this.maxLogs;
    }

    this.store.set('logs', logs);
    return log;
  }

  clearLogs(): void {
    this.store.set('logs', []);
  }

  clearLogsBefore(timestamp: number): void {
    const logs = this.getAllLogs();
    const filtered = logs.filter(log => log.timestamp >= timestamp);
    this.store.set('logs', filtered);
  }
}

export const logService = new LogService();
