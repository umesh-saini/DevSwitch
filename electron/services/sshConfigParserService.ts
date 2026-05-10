import * as fs from 'fs';
import * as path from 'path';
import os from 'os';
import SSHConfig from 'ssh-config';
import { v4 as uuidv4 } from 'uuid';
import type { SSHConfigEntry } from '../../src/types/sshConfig.ts';

export class SSHConfigParserService {
  private getConfigPath(): string {
    return path.join(os.homedir(), '.ssh', 'config');
  }

  async readParsedConfig(): Promise<{ entries: SSHConfigEntry[]; error?: string }> {
    try {
      const configPath = this.getConfigPath();
      if (!fs.existsSync(configPath)) {
        return { entries: [] };
      }

      const content = fs.readFileSync(configPath, 'utf8');
      const parsed = SSHConfig.parse(content);
      
      const entries: SSHConfigEntry[] = [];

      // @ts-ignore
      for (const section of parsed) {
        if (section.type === SSHConfig.DIRECTIVE && section.param.toLowerCase() === 'host') {
          const entry: SSHConfigEntry = {
            id: uuidv4(),
            Host: section.value,
            HostName: '',
            User: '',
            Port: '',
            IdentityFile: '',
            customFields: [],
          };

          for (const line of section.config || []) {
            if (line.type === SSHConfig.DIRECTIVE) {
              const param = line.param.toLowerCase();
              if (param === 'hostname') entry.HostName = line.value;
              else if (param === 'user') entry.User = line.value;
              else if (param === 'port') entry.Port = line.value;
              else if (param === 'identityfile') entry.IdentityFile = line.value;
              else entry.customFields.push({ param: line.param, value: line.value });
            }
          }
          entries.push(entry);
        }
      }

      return { entries };
    } catch (error) {
      return { entries: [], error: error instanceof Error ? error.message : 'Failed to read config' };
    }
  }

  async saveParsedConfig(entries: SSHConfigEntry[]): Promise<{ success: boolean; error?: string }> {
    try {
      const configPath = this.getConfigPath();
      const sshDir = path.dirname(configPath);
      if (!fs.existsSync(sshDir)) {
        fs.mkdirSync(sshDir, { mode: 0o700 });
      }

      let content = '';
      if (fs.existsSync(configPath)) {
        content = fs.readFileSync(configPath, 'utf8');
      }

      const parsed = SSHConfig.parse(content);
      
      // To preserve comments (including DevSwitch markers), we will update existing Hosts
      // and append new ones. 
      // We will identify existing Hosts by their "Host" value. If a user changes a Host value, 
      // we might treat it as a new Host and keep the old one, unless we track IDs. But since IDs
      // are generated on the fly, we can only match by the old 'Host' name.
      // For simplicity, we completely replace the 'Host' blocks that we know about, and remove missing ones.

      // Actually, removing missing ones might delete DevSwitch markers if they surround the Host block.
      // So we just clear all Host blocks and append the new ones? 
      // No, let's just wipe and rewrite if we are providing a full config editor, but keep comments!
      
      // Let's create a fresh config, copying over COMMENTS from the old config to the top, 
      // and then appending all the entries.
      const newConfig = new SSHConfig();
      
      // @ts-ignore
      for (const line of parsed) {
        if (line.type === SSHConfig.COMMENT) {
          newConfig.push(line);
        }
      }

      for (const entry of entries) {
        const hostBlock = newConfig.append({
          Host: entry.Host
        });
        
        if (entry.HostName) hostBlock.append({ HostName: entry.HostName });
        if (entry.User) hostBlock.append({ User: entry.User });
        if (entry.Port) hostBlock.append({ Port: entry.Port });
        if (entry.IdentityFile) hostBlock.append({ IdentityFile: entry.IdentityFile });
        
        for (const field of entry.customFields) {
          if (field.param && field.value) {
            hostBlock.append({ [field.param]: field.value });
          }
        }
      }

      fs.writeFileSync(configPath, SSHConfig.stringify(newConfig), { mode: 0o600 });

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to save config' };
    }
  }
}

export const sshConfigParserService = new SSHConfigParserService();
