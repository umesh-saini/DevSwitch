import * as fs from "fs";
import * as path from "path";
import { ensureDataDir } from "./paths.ts";

/**
 * Minimal, dependency-free JSON store shared by the desktop app and the CLI.
 *
 * Design goals:
 *  - No native deps / no electron-store, so it runs in plain Node (CLI) and
 *    inside Electron's main process identically.
 *  - Atomic writes (write temp file + rename) so a crash never corrupts data
 *    and concurrent app/CLI usage can't leave a half-written file.
 *  - Always reads fresh from disk so the app and CLI see each other's changes
 *    without needing an in-memory cache to be invalidated.
 */
export class JsonStore<T extends Record<string, unknown>> {
  private readonly filePath: string;
  private readonly defaults: T;

  constructor(filePath: string, defaults: T) {
    this.filePath = filePath;
    this.defaults = defaults;
  }

  getFilePath(): string {
    return this.filePath;
  }

  /** Read the entire document fresh from disk, falling back to defaults. */
  read(): T {
    try {
      if (!fs.existsSync(this.filePath)) {
        return structuredClone(this.defaults);
      }
      const raw = fs.readFileSync(this.filePath, "utf8");
      if (!raw.trim()) {
        return structuredClone(this.defaults);
      }
      const parsed = JSON.parse(raw) as Partial<T>;
      return { ...structuredClone(this.defaults), ...parsed };
    } catch {
      // Corrupt file — fall back to defaults rather than throwing.
      return structuredClone(this.defaults);
    }
  }

  /** Atomically write the entire document to disk. */
  write(data: T): void {
    ensureDataDir();
    const dir = path.dirname(this.filePath);
    const tmp = path.join(
      dir,
      `.${path.basename(this.filePath)}.${process.pid}.tmp`,
    );
    const json = JSON.stringify(data, null, 2);
    fs.writeFileSync(tmp, json, { mode: 0o600 });
    fs.renameSync(tmp, this.filePath);
  }

  get<K extends keyof T>(key: K, fallback?: T[K]): T[K] {
    const data = this.read();
    const value = data[key];
    return value === undefined ? (fallback as T[K]) : value;
  }

  set<K extends keyof T>(key: K, value: T[K]): void {
    const data = this.read();
    data[key] = value;
    this.write(data);
  }
}
