export interface SSHConfigEntry {
  id: string; // Unique identifier for UI state
  Host: string;
  HostName: string;
  User: string;
  Port: string;
  IdentityFile: string;
  customFields: { param: string; value: string }[];
}
