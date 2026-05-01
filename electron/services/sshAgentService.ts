import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import * as fs from 'fs';

const execAsync = promisify(exec);

export class SSHAgentService {
  async addKeyToAgent(params: {
    keyPath: string;
    passphrase?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if key exists
      if (!fs.existsSync(params.keyPath)) {
        return {
          success: false,
          error: `SSH key not found at ${params.keyPath}`,
        };
      }

      const isWindows = os.platform() === 'win32';

      if (isWindows) {
        return await this.addKeyToAgentWindows(params);
      } else {
        return await this.addKeyToAgentUnix(params);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add key to agent',
      };
    }
  }

  private async addKeyToAgentUnix(params: {
    keyPath: string;
    passphrase?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if ssh-agent is running
      const agentCheck = await execAsync('pgrep ssh-agent').catch(() => null);

      if (!agentCheck) {
        // Try to start ssh-agent
        try {
          await execAsync('eval "$(ssh-agent -s)"');
        } catch (error) {
          console.error('Failed to start ssh-agent:', error);
          return {
            success: false,
            error: 'ssh-agent is not running and could not be started',
          };
        }
      }

      // Add key to agent
      let command: string;
      
      if (params.passphrase) {
        // Use expect or ssh-add with passphrase
        command = `echo "${params.passphrase}" | ssh-add "${params.keyPath}"`;
      } else {
        command = `ssh-add "${params.keyPath}"`;
      }

      await execAsync(command);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add key to agent',
      };
    }
  }

  private async addKeyToAgentWindows(params: {
    keyPath: string;
    passphrase?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // On Windows, check if ssh-agent service is running
      const serviceCheck = await execAsync('sc query ssh-agent').catch(() => null);

      if (!serviceCheck || !serviceCheck.stdout.includes('RUNNING')) {
        try {
          // Try to start the service
          await execAsync('Start-Service ssh-agent', { shell: 'powershell.exe' });
        } catch (error) {
          console.error('Failed to start ssh-agent service:', error);
          return {
            success: false,
            error: 'ssh-agent service is not running and could not be started',
          };
        }
      }

      // Add key
      const command = `ssh-add "${params.keyPath}"`;
      await execAsync(command);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add key to agent',
      };
    }
  }

  async listKeys(): Promise<{ success: boolean; keys?: string[]; error?: string }> {
    try {
      const { stdout } = await execAsync('ssh-add -l');
      const keys = stdout
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => line.trim());

      return { success: true, keys };
    } catch (error) {
      console.log('Error listing keys:', error);
      // ssh-add -l returns exit code 1 when no keys are loaded
      return { success: true, keys: [] };
    }
  }
}

export const sshAgentService = new SSHAgentService();
