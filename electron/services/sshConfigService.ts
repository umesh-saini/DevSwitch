import * as fs from 'fs';
import * as path from 'path';
import os from 'os';
import { type Profile } from '../type/profile.ts';
import { getProviderSSHConfig } from '../utils/providerUtils.ts';

export interface HostKeyMapping {
  host: string;
  hostname: string;
  identityFile: string;
  username: string | null;
}

export class SSHConfigService {
  private getConfigPath(): string {
    return path.join(os.homedir(), '.ssh', 'config');
  }

  async readConfig(): Promise<{ content: string; error?: string }> {
    try {
      const configPath = this.getConfigPath();
      
      if (!fs.existsSync(configPath)) {
        return { content: '' };
      }

      const content = fs.readFileSync(configPath, 'utf8');
      return { content };
    } catch (error) {
      return {
        content: '',
        error: error instanceof Error ? error.message : 'Failed to read config',
      };
    }
  }

  async updateConfig(profile: Profile): Promise<{ success: boolean; error?: string }> {
    try {
      const configPath = this.getConfigPath();
      const sshDir = path.dirname(configPath);

      // Ensure .ssh directory exists
      if (!fs.existsSync(sshDir)) {
        fs.mkdirSync(sshDir, { mode: 0o700 });
      }

      let content = '';
      
      // Read existing config
      if (fs.existsSync(configPath)) {
        content = fs.readFileSync(configPath, 'utf8');
      }

      // Remove old entry for this profile if exists
      content = this.removeProfileEntry(content, profile.id);

      // Add new entry if key path is available
      if (profile.keyPath && profile.sshKeyType !== 'default') {
        const hostAlias = this.getHostAlias(profile);
        const entry = this.generateConfigEntry(profile, hostAlias);
        content = content.trim() + '\n\n' + entry + '\n';
      }

      // Write config
      fs.writeFileSync(configPath, content, { mode: 0o600 });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update config',
      };
    }
  }

  async removeProfileConfig(profileId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const configPath = this.getConfigPath();

      if (!fs.existsSync(configPath)) {
        return { success: true };
      }

      let content = fs.readFileSync(configPath, 'utf8');
      content = this.removeProfileEntry(content, profileId);
      
      fs.writeFileSync(configPath, content, { mode: 0o600 });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove config',
      };
    }
  }

  private getHostAlias(profile: Profile): string {
    // Create a unique host alias based on provider SSH host and username
    const { sshHost } = getProviderSSHConfig(profile.provider);
    return `${sshHost}-${profile.username}`;
  }

  private generateConfigEntry(profile: Profile, hostAlias: string): string {
    const { sshHost, sshUser } = getProviderSSHConfig(profile.provider);
    return `# DevSwitch Profile: ${profile.email} (${profile.id})
Host ${hostAlias}
  HostName ${sshHost}
  User ${sshUser}
  IdentityFile ${profile.keyPath}
  IdentitiesOnly yes
# DevSwitch Profile End: (${profile.id})`;
  }

  private removeProfileEntry(content: string, profileId: string): string {
    const lines = content.split('\n');
    const result: string[] = [];
    let inProfileBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Start of DevSwitch profile block
      if (line.includes('# DevSwitch Profile:') && line.includes(`(${profileId})`)) {
        inProfileBlock = true;
        continue;
      }

      // End of DevSwitch profile block
      if (inProfileBlock && line.includes('# DevSwitch Profile End:') && line.includes(`(${profileId})`)) {
        inProfileBlock = false;
        // Skip trailing blank line if exists
        if (i + 1 < lines.length && lines[i + 1].trim() === '') {
          i++;
        }
        continue;
      }

      // Skip lines inside profile block
      if (inProfileBlock) {
        continue;
      }

      result.push(line);
    }

    const cleaned = result.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    return cleaned + '\n';
  }

  // getHostAlias(profile: Profile): string {
  //   return `github.com-${profile.username}`;
  // }

  checkProfileConfigured(profile: Profile): boolean {
    try {
      const configPath = this.getConfigPath();
      
      if (!fs.existsSync(configPath)) {
        return false;
      }

      const content = fs.readFileSync(configPath, 'utf8');
      return content.includes(`(${profile.id})`);
    } catch {
      return false;
    }
  }

  /**
   * Find the Host alias for a given SSH key path by parsing the SSH config file
   * Returns the Host alias if found, otherwise null
   */
  getHostAliasForKeyPath(keyPath: string): string | null {
    try {
      const configPath = this.getConfigPath();
      
      if (!fs.existsSync(configPath)) {
        return null;
      }

      const content = fs.readFileSync(configPath, 'utf8');
      const lines = content.split('\n');
      
      let currentHost: string | null = null;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Match Host directive (e.g., "Host github.com" or "Host github.com-username")
        const hostMatch = line.match(/^Host\s+(.+)$/i);
        if (hostMatch) {
          currentHost = hostMatch[1];
          continue;
        }
        
        // Match IdentityFile directive
        const identityMatch = line.match(/^IdentityFile\s+(.+)$/i);
        if (identityMatch && currentHost) {
          const configKeyPath = identityMatch[1].replace(/^~/, os.homedir());
          
          // Normalize paths for comparison
          const normalizedConfigPath = path.normalize(configKeyPath);
          const normalizedKeyPath = path.normalize(keyPath);
          
          if (normalizedConfigPath === normalizedKeyPath) {
            return currentHost;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error finding host alias:', error);
      return null;
    }
  }

  /**
   * Get global git config as key-value pairs
   */
  async getGlobalGitConfig(): Promise<{ [key: string]: string }> {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      const { stdout } = await execAsync('git config --global --list');
      const config: { [key: string]: string } = {};
      
      const lines = stdout.trim().split('\n');
      for (const line of lines) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          config[key] = valueParts.join('=');
        }
      }
      
      return config;
    } catch (error) {
      console.error('Error getting global git config:', error);
      return {};
    }
  }

  /**
   * Parse SSH config and extract all Host entries with their IdentityFile mappings
   * Also extracts username from Host alias (e.g., "github-username" → "username")
   */
  getAllHostKeyMappings(): HostKeyMapping[] {
    try {
      const configPath = this.getConfigPath();
      
      if (!fs.existsSync(configPath)) {
        return [];
      }

      const content = fs.readFileSync(configPath, 'utf8');
      const lines = content.split('\n');
      const mappings: HostKeyMapping[] = [];
      
      let currentHost: string | null = null;
      let currentHostname: string | null = null;
      let currentIdentityFile: string | null = null;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip comments and empty lines
        if (line.startsWith('#') || !line) {
          continue;
        }
        
        // Match Host directive
        const hostMatch = line.match(/^Host\s+(.+)$/i);
        if (hostMatch) {
          // Save previous host if complete
          if (currentHost && currentIdentityFile) {
          mappings.push({
              host: currentHost,
              hostname: currentHostname || '',
              identityFile: currentIdentityFile.replace(/^~/, os.homedir()),
              username: this.extractUsernameFromHost(currentHost),
            });
          }
          
          // Start new host
          currentHost = hostMatch[1];
          currentHostname = null;
          currentIdentityFile = null;
          continue;
        }
        
        // Match HostName directive
        const hostnameMatch = line.match(/^HostName\s+(.+)$/i);
        if (hostnameMatch && currentHost) {
          currentHostname = hostnameMatch[1];
          continue;
        }
        
        // Match IdentityFile directive
        const identityMatch = line.match(/^IdentityFile\s+(.+)$/i);
        if (identityMatch && currentHost) {
          currentIdentityFile = identityMatch[1];
          continue;
        }
      }
      
      // Don't forget the last host
      if (currentHost && currentIdentityFile) {
        mappings.push({
          host: currentHost,
          hostname: currentHostname || '',
          identityFile: currentIdentityFile.replace(/^~/, os.homedir()),
          username: this.extractUsernameFromHost(currentHost),
        });
      }
      
      return mappings;
    } catch (error) {
      console.error('Error parsing SSH config:', error);
      return [];
    }
  }

  /**
   * Extract username from Host alias
   * Examples:
   * - "github-username" → "username"
   * - "github.com-username" → "username"
   * - "github_username" → "username"
   * - "github-user-name" → "user-name"
   * - "github.com" → null (no username)
   */
  private extractUsernameFromHost(host: string): string | null {
    try {
      // First, try to split by common separators: - or _
      const separators = ['-', '_'];
      
      for (const separator of separators) {
        if (host.includes(separator)) {
          const parts = host.split(separator);
          
          // Skip the first part (usually "github" or "github.com")
          if (parts.length > 1) {
            // Join the rest back (in case username has separators)
            const username = parts.slice(1).join(separator);
            return username || null;
          }
        }
      }
      
      // If no separator found, return null (likely a default host like "github.com")
      return null;
    } catch (error) {
      console.error(`Error getting current remote URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }
}

export const sshConfigService = new SSHConfigService();
