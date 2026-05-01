import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import os from 'os';
import type { DefaultSSHKey } from '../type/profile.ts';

const execAsync = promisify(exec);

export interface SSHKeyInfo {
  privatePath: string;
  publicPath: string;
  email: string | null;
  algorithm: 'rsa' | 'ed25519' | 'ecdsa' | 'dsa';
}

export interface GenerateKeyParams {
  algorithm: 'ed25519' | 'rsa';
  name: string;
  passphrase?: string;
  email: string;
}

export interface GenerateKeyResult {
  success: boolean;
  keyPath?: string;
  error?: string;
}

export class SSHKeyService {
  private getSshDir(): string {
    return path.join(os.homedir(), '.ssh');
  }

  async generateKey(params: GenerateKeyParams): Promise<GenerateKeyResult> {
    try {
      const sshDir = this.getSshDir();
      
      // Ensure .ssh directory exists
      if (!fs.existsSync(sshDir)) {
        fs.mkdirSync(sshDir, { mode: 0o700 });
      }

      const keyPath = path.join(sshDir, params.name);
      
      // Check if key already exists
      if (fs.existsSync(keyPath)) {
        return {
          success: false,
          error: `SSH key '${params.name}' already exists`,
        };
      }

      let command: string;
      
      if (params.algorithm === 'ed25519') {
        command = `ssh-keygen -t ed25519 -C "${params.email}" -f "${keyPath}" -N "${params.passphrase || ''}"`;
      } else {
        command = `ssh-keygen -t rsa -b 4096 -C "${params.email}" -f "${keyPath}" -N "${params.passphrase || ''}"`;
      }

      await execAsync(command);

      // Verify key was created
      if (fs.existsSync(keyPath)) {
        // Set proper permissions
        fs.chmodSync(keyPath, 0o600);
        if (fs.existsSync(`${keyPath}.pub`)) {
          fs.chmodSync(`${keyPath}.pub`, 0o644);
        }

        return {
          success: true,
          keyPath,
        };
      }

      return {
        success: false,
        error: 'Key generation failed - file not created',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getDefaultKeyPath(): string {
    return path.join(this.getSshDir(), 'id_rsa');
  }

  keyExists(keyPath: string): boolean {
    return fs.existsSync(keyPath);
  }

  getPublicKeyContent(privateKeyPath: string): string | null {
    const publicKeyPath = `${privateKeyPath}.pub`;
    
    if (fs.existsSync(publicKeyPath)) {
      return fs.readFileSync(publicKeyPath, 'utf8').trim();
    }
    
    return null;
  }

  deleteKey(keyPath: string): { success: boolean; error?: string } {
    try {
      if (fs.existsSync(keyPath)) {
        fs.unlinkSync(keyPath);
      }
      
      const publicKeyPath = `${keyPath}.pub`;
      if (fs.existsSync(publicKeyPath)) {
        fs.unlinkSync(publicKeyPath);
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete key',
      };
    }
  }

  async checkDefaultKeys(): Promise<DefaultSSHKey[]> {
    const sshDir = this.getSshDir();
    const defaultKeys: DefaultSSHKey[] = [];

    // Check for id_rsa
    const rsaPrivatePath = path.join(sshDir, 'id_rsa');
    const rsaPublicPath = `${rsaPrivatePath}.pub`;
    
    if (fs.existsSync(rsaPrivatePath) && fs.existsSync(rsaPublicPath)) {
      defaultKeys.push({
        algorithm: 'rsa',
        privatePath: rsaPrivatePath,
        publicPath: rsaPublicPath,
      });
    }

    // Check for id_ed25519
    const ed25519PrivatePath = path.join(sshDir, 'id_ed25519');
    const ed25519PublicPath = `${ed25519PrivatePath}.pub`;
    
    if (fs.existsSync(ed25519PrivatePath) && fs.existsSync(ed25519PublicPath)) {
      defaultKeys.push({
        algorithm: 'ed25519',
        privatePath: ed25519PrivatePath,
        publicPath: ed25519PublicPath,
      });
    }

    return defaultKeys;
  }

  /**
   * Scan the .ssh directory and find all SSH key pairs
   * Returns information about each key including the email extracted from public key
   */
  async scanAllSSHKeys(): Promise<SSHKeyInfo[]> {
    const sshDir = this.getSshDir();
    const keys: SSHKeyInfo[] = [];

    try {
      if (!fs.existsSync(sshDir)) {
        return keys;
      }

      const files = fs.readdirSync(sshDir);
      
      // Look for public key files (*.pub)
      const pubFiles = files.filter(f => f.endsWith('.pub'));

      for (const pubFile of pubFiles) {
        const publicPath = path.join(sshDir, pubFile);
        const privateFileName = pubFile.replace('.pub', '');
        const privatePath = path.join(sshDir, privateFileName);

        // Check if private key exists
        if (!fs.existsSync(privatePath)) {
          continue;
        }

        // Read public key and extract email
        const publicKeyContent = fs.readFileSync(publicPath, 'utf8').trim();
        const email = this.extractEmailFromPublicKey(publicKeyContent);

        // Determine algorithm from public key content
        let algorithm: 'rsa' | 'ed25519' | 'ecdsa' | 'dsa' = 'rsa';
        if (publicKeyContent.startsWith('ssh-ed25519')) {
          algorithm = 'ed25519';
        } else if (publicKeyContent.startsWith('ssh-rsa')) {
          algorithm = 'rsa';
        } else if (publicKeyContent.startsWith('ecdsa-sha2')) {
          algorithm = 'ecdsa';
        } else if (publicKeyContent.startsWith('ssh-dss')) {
          algorithm = 'dsa';
        }

        keys.push({
          privatePath,
          publicPath,
          email,
          algorithm,
        });
      }

      return keys;
    } catch (error) {
      console.error('Error scanning SSH keys:', error);
      return keys;
    }
  }

  /**
   * Extract email from SSH public key content
   * Public keys typically end with the email: "ssh-rsa AAAA... email@example.com"
   */
  private extractEmailFromPublicKey(publicKeyContent: string): string | null {
    try {
      const parts = publicKeyContent.trim().split(/\s+/);
      
      // Public key format: <algorithm> <key-data> [comment/email]
      if (parts.length >= 3) {
        const lastPart = parts[parts.length - 1];
        
        // Check if it looks like an email
        if (lastPart.includes('@')) {
          return lastPart;
        }
      }

      return null;
    } catch (error) {
      console.error(`Error getting current remote URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }
}

export const sshKeyService = new SSHKeyService();
