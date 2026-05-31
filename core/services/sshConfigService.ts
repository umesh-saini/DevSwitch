import * as fs from "fs";
import * as path from "path";
import os from "os";
import { type Profile } from "../types.ts";
import { getProviderSSHConfig } from "../utils/providerUtils.ts";
import { logService } from "./logService.ts";

export interface HostKeyMapping {
  host: string;
  hostname: string;
  identityFile: string;
  username: string | null;
}

export class SSHConfigService {
  private getConfigPath(): string {
    return path.join(os.homedir(), ".ssh", "config");
  }

  async readConfig(): Promise<{ content: string; error?: string }> {
    try {
      const configPath = this.getConfigPath();
      if (!fs.existsSync(configPath)) {
        return { content: "" };
      }
      const content = fs.readFileSync(configPath, "utf8");
      return { content };
    } catch (error) {
      return {
        content: "",
        error: error instanceof Error ? error.message : "Failed to read config",
      };
    }
  }

  async updateConfig(
    profile: Profile,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const configPath = this.getConfigPath();
      const sshDir = path.dirname(configPath);

      if (!fs.existsSync(sshDir)) {
        fs.mkdirSync(sshDir, { mode: 0o700 });
      }

      let content = "";
      if (fs.existsSync(configPath)) {
        content = fs.readFileSync(configPath, "utf8");
      }

      content = this.removeProfileEntry(content, profile.id);

      if (profile.keyPath && profile.sshKeyType !== "default") {
        const hostAlias = this.getHostAlias(profile);
        const entry = this.generateConfigEntry(profile, hostAlias);
        content = content.trim() + "\n\n" + entry + "\n";
      }

      fs.writeFileSync(configPath, content, { mode: 0o600 });

      logService.addLog(
        "SSH_CONFIG_UPDATED",
        `SSH config updated for profile "${profile.name}"`,
        {
          profileId: profile.id,
          provider: profile.provider,
        },
      );

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update config",
      };
    }
  }

  async removeProfileConfig(
    profileId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const configPath = this.getConfigPath();
      if (!fs.existsSync(configPath)) {
        return { success: true };
      }
      let content = fs.readFileSync(configPath, "utf8");
      content = this.removeProfileEntry(content, profileId);
      fs.writeFileSync(configPath, content, { mode: 0o600 });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to remove config",
      };
    }
  }

  getHostAlias(profile: Profile): string {
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
    const lines = content.split("\n");
    const result: string[] = [];
    let inProfileBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (
        line.includes("# DevSwitch Profile:") &&
        line.includes(`(${profileId})`)
      ) {
        inProfileBlock = true;
        continue;
      }

      if (
        inProfileBlock &&
        line.includes("# DevSwitch Profile End:") &&
        line.includes(`(${profileId})`)
      ) {
        inProfileBlock = false;
        if (i + 1 < lines.length && lines[i + 1].trim() === "") {
          i++;
        }
        continue;
      }

      if (inProfileBlock) {
        continue;
      }

      result.push(line);
    }

    const cleaned = result
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return cleaned + "\n";
  }

  checkProfileConfigured(profile: Profile): boolean {
    try {
      const configPath = this.getConfigPath();
      if (!fs.existsSync(configPath)) {
        return false;
      }
      const content = fs.readFileSync(configPath, "utf8");
      return content.includes(`(${profile.id})`);
    } catch {
      return false;
    }
  }

  getHostAliasForKeyPath(keyPath: string): string | null {
    try {
      const configPath = this.getConfigPath();
      if (!fs.existsSync(configPath)) {
        return null;
      }

      const content = fs.readFileSync(configPath, "utf8");
      const lines = content.split("\n");
      let currentHost: string | null = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        const hostMatch = line.match(/^Host\s+(.+)$/i);
        if (hostMatch) {
          currentHost = hostMatch[1];
          continue;
        }

        const identityMatch = line.match(/^IdentityFile\s+(.+)$/i);
        if (identityMatch && currentHost) {
          const configKeyPath = identityMatch[1].replace(/^~/, os.homedir());
          const normalizedConfigPath = path.normalize(configKeyPath);
          const normalizedKeyPath = path.normalize(keyPath);
          if (normalizedConfigPath === normalizedKeyPath) {
            return currentHost;
          }
        }
      }

      return null;
    } catch (error) {
      console.error("Error finding host alias:", error);
      return null;
    }
  }

  async getGlobalGitConfig(): Promise<{ [key: string]: string }> {
    try {
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);

      const { stdout } = await execAsync("git config --global --list");
      const config: { [key: string]: string } = {};

      const lines = stdout.trim().split("\n");
      for (const line of lines) {
        const [key, ...valueParts] = line.split("=");
        if (key && valueParts.length > 0) {
          config[key] = valueParts.join("=");
        }
      }

      return config;
    } catch (error) {
      console.error("Error getting global git config:", error);
      return {};
    }
  }

  getAllHostKeyMappings(): HostKeyMapping[] {
    try {
      const configPath = this.getConfigPath();
      if (!fs.existsSync(configPath)) {
        return [];
      }

      const content = fs.readFileSync(configPath, "utf8");
      const lines = content.split("\n");
      const mappings: HostKeyMapping[] = [];

      let currentHost: string | null = null;
      let currentHostname: string | null = null;
      let currentIdentityFile: string | null = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.startsWith("#") || !line) {
          continue;
        }

        const hostMatch = line.match(/^Host\s+(.+)$/i);
        if (hostMatch) {
          if (currentHost && currentIdentityFile) {
            mappings.push({
              host: currentHost,
              hostname: currentHostname || "",
              identityFile: currentIdentityFile.replace(/^~/, os.homedir()),
              username: this.extractUsernameFromHost(currentHost),
            });
          }
          currentHost = hostMatch[1];
          currentHostname = null;
          currentIdentityFile = null;
          continue;
        }

        const hostnameMatch = line.match(/^HostName\s+(.+)$/i);
        if (hostnameMatch && currentHost) {
          currentHostname = hostnameMatch[1];
          continue;
        }

        const identityMatch = line.match(/^IdentityFile\s+(.+)$/i);
        if (identityMatch && currentHost) {
          currentIdentityFile = identityMatch[1];
          continue;
        }
      }

      if (currentHost && currentIdentityFile) {
        mappings.push({
          host: currentHost,
          hostname: currentHostname || "",
          identityFile: currentIdentityFile.replace(/^~/, os.homedir()),
          username: this.extractUsernameFromHost(currentHost),
        });
      }

      return mappings;
    } catch (error) {
      console.error("Error parsing SSH config:", error);
      return [];
    }
  }

  private extractUsernameFromHost(host: string): string | null {
    try {
      const separators = ["-", "_"];
      for (const separator of separators) {
        if (host.includes(separator)) {
          const parts = host.split(separator);
          if (parts.length > 1) {
            const username = parts.slice(1).join(separator);
            return username || null;
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const sshConfigService = new SSHConfigService();
