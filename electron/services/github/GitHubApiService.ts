import { storageService } from '../storageService.ts';
import { sshKeyService } from '../sshKeyService.ts';
import { BaseApiService } from '../base/BaseApiService.ts';
import { githubOAuthService } from './GitHubOAuthService.ts';

interface GitHubSSHKey {
  id: number;
  key: string;
  title: string;
  created_at: string;
}

export class GitHubApiService extends BaseApiService {
  /**
   * Upload SSH public key to GitHub.
   */
  async uploadSSHKey(
    profileId: string,
  ): Promise<{ success: boolean; keyTitle?: string; error?: string }> {
    try {
      const profile = storageService.getProfile(profileId);
      if (!profile) return { success: false, error: 'Profile not found' };

      // Check connected (new field first, then legacy)
      const isConnected = profile.providerMeta?.connected ?? profile.githubConnected ?? false;
      if (!isConnected) return { success: false, error: 'GitHub account not connected' };

      if (!profile.keyPath) return { success: false, error: 'No SSH key found for this profile' };

      const accessToken = githubOAuthService.getAccessToken(profileId);
      if (!accessToken) return { success: false, error: 'No valid access token' };

      const publicKeyContent = sshKeyService.getPublicKeyContent(profile.keyPath);
      if (!publicKeyContent) return { success: false, error: 'Failed to read SSH public key' };

      const keyTitle = `DevSwitch - ${profile.name} (${new Date().toLocaleDateString()})`;

      // Check if key already exists
      const existingKeys = await this.listSSHKeys(accessToken);
      const parts = publicKeyContent.trim().split(/\s+/);
      const sshWithoutEmail = parts.slice(0, 2).join(' ');
      const keyExists = existingKeys.find((k) => k.key.trim() === sshWithoutEmail.trim());

      if (keyExists) {
        this.markKeyAdded(profileId, true);
        return { success: true, keyTitle: 'Key already exists on GitHub' };
      }

      // Upload key to GitHub
      const response = await fetch('https://api.github.com/user/keys', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: keyTitle, key: publicKeyContent }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.log({ error: error.errors });
        const errorMessage =
          error?.errors?.[0]?.message ??
          error?.message ??
          'Failed to upload SSH key to GitHub';
        return { success: false, error: errorMessage };
      }

      this.markKeyAdded(profileId, true);
      return { success: true, keyTitle };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload SSH key',
      };
    }
  }

  /**
   * Check if SSH key exists on GitHub.
   */
  async checkKeyExists(profileId: string): Promise<{ exists: boolean; error?: string }> {
    try {
      const profile = storageService.getProfile(profileId);
      if (!profile) return { exists: false, error: 'Profile not found' };

      const isConnected = profile.providerMeta?.connected ?? profile.githubConnected ?? false;
      if (!isConnected) return { exists: false };

      if (!profile.keyPath) return { exists: false, error: 'No SSH key found' };

      const accessToken = githubOAuthService.getAccessToken(profileId);
      if (!accessToken) return { exists: false, error: 'No valid access token' };

      const publicKeyContent = sshKeyService.getPublicKeyContent(profile.keyPath);
      if (!publicKeyContent) return { exists: false, error: 'Failed to read SSH public key' };

      const parts = publicKeyContent.trim().split(/\s+/);
      const sshWithoutEmail = parts.slice(0, 2).join(' ');

      const existingKeys = await this.listSSHKeys(accessToken);
      const exists = existingKeys.some((k) => k.key.trim() === sshWithoutEmail.trim());

      // Sync status if changed
      const currentStatus = profile.providerMeta?.sshKeyAdded ?? profile.sshKeyAddedToGithub ?? false;
      if (exists !== currentStatus) {
        this.markKeyAdded(profileId, exists);
      }

      return { exists };
    } catch (error) {
      return {
        exists: false,
        error: error instanceof Error ? error.message : 'Failed to check key',
      };
    }
  }

  private async listSSHKeys(accessToken: string): Promise<GitHubSSHKey[]> {
    try {
      const response = await fetch('https://api.github.com/user/keys', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });
      if (!response.ok) return [];
      return await response.json() as GitHubSSHKey[];
    } catch {
      return [];
    }
  }

  /**
   * Helper: persist sshKeyAdded status in both the new providerMeta and
   * the legacy field so the frontend works correctly during the migration period.
   */
  private markKeyAdded(profileId: string, added: boolean): void {
    const profile = storageService.getProfile(profileId);
    if (!profile) return;

    if (profile.providerMeta) {
      profile.providerMeta.sshKeyAdded = added;
    } else {
      // Build providerMeta from legacy fields if not yet created
      profile.providerMeta = {
        connected: profile.githubConnected ?? false,
        accessTokenEncrypted: profile.githubAccessTokenEncrypted ?? null,
        username: profile.githubUsername ?? null,
        sshKeyAdded: added,
      };
    }
    // Keep legacy field in sync for backward compat
    profile.sshKeyAddedToGithub = added;
    profile.updatedAt = Date.now();
    storageService.saveProfile(profile);
  }
}

export const githubApiService = new GitHubApiService();
