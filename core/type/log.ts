export type LogActionType =
  | "APP_UPDATE"
  | "APP_UPDATE_ERROR"
  | "PROFILE_CREATED"
  | "PROFILE_UPDATED"
  | "PROFILE_DELETED"
  | "PROFILE_SWITCHED"
  | "SSH_KEY_GENERATED"
  | "SSH_KEY_IMPORTED"
  | "SSH_CONFIG_UPDATED"
  | "PROVIDER_KEY_UPLOADED"
  | "PROVIDER_DISCONNECTED";

/** Where a logged action originated. */
export type LogSource = "app" | "cli";

export interface ActivityLog {
  id: string;
  timestamp: number;
  action: LogActionType;
  message: string; // User friendly message
  source?: LogSource; // 'app' (desktop) or 'cli' (terminal)
  details?: Record<string, unknown>; // Extra details like provider, profile name, etc.
}
