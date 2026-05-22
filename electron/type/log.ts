export type LogActionType = 
  | 'PROFILE_CREATED' 
  | 'PROFILE_UPDATED' 
  | 'PROFILE_DELETED'
  | 'SSH_KEY_GENERATED'
  | 'SSH_KEY_IMPORTED'
  | 'SSH_CONFIG_UPDATED'
  | 'PROVIDER_KEY_UPLOADED'
  | 'PROVIDER_DISCONNECTED';

export interface ActivityLog {
  id: string;
  timestamp: number;
  action: LogActionType;
  message: string; // User friendly message
  details?: Record<string, any>; // Extra details like provider, profile name, etc.
}
