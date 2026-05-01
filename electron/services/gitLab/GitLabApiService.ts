import { storageService } from '../storageService.ts';
import { sshKeyService } from '../sshKeyService.ts';
import { BaseApiService } from '../base/BaseApiService.ts';
import { gitLabOAuthService } from './GitLabOAuthService.ts';

interface GitLabSSHKey {
  id: number;
  key: string;
  title: string;
  created_at: string;
}

export class GitLabApiService extends BaseApiService {
  /**
   * Upload SSH public key to GitLab.
   * Uses the GitLab REST API v4: POST /user/keys
   */
  async uploadSSHKey(
    profileId: string,
  ): Promise<{ success: boolean; keyTitle?: string; error?: string }> {
    try {
      const profile = storageService.getProfile(profileId);
      if (!profile) return { success: false, error: 'Profile not found' };

      if (!profile.providerMeta?.connected) {
        return { success: false, error: 'GitLab account not connected' };
      }

      if (!profile.keyPath) return { success: false, error: 'No SSH key found for this profile' };

      const accessToken = gitLabOAuthService.getAccessToken(profileId);
      if (!accessToken) return { success: false, error: 'No valid access token' };

      const publicKeyContent = sshKeyService.getPublicKeyContent(profile.keyPath);
      if (!publicKeyContent) return { success: false, error: 'Failed to read SSH public key' };

      const keyTitle = `DevSwitch - ${profile.name} (${new Date().toLocaleDateString()})`;

      // Check if key already exists on GitLab
      const existingKeys = await this.listSSHKeys(accessToken);
      const parts = publicKeyContent.trim().split(/\s+/);
      const sshWithoutEmail = parts.slice(0, 2).join(' ');
      const keyExists = existingKeys.find((k) => k.key.trim() === sshWithoutEmail.trim());

      if (keyExists) {
        profile.providerMeta.sshKeyAdded = true;
        profile.updatedAt = Date.now();
        storageService.saveProfile(profile);
        return { success: true, keyTitle: 'Key already exists on GitLab' };
      }

      // Upload key to GitLab REST API
      const response = await fetch('https://gitlab.com/api/v4/user/keys', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ title: keyTitle, key: publicKeyContent }),
      });

      if (!response.ok) {
        const error = await response.json();
        const errorMessage =
          (Array.isArray(error?.message)
            ? error.message[0]
            : error?.message) ?? 'Failed to upload SSH key to GitLab';
        return { success: false, error: errorMessage };
      }

      profile.providerMeta.sshKeyAdded = true;
      profile.updatedAt = Date.now();
      storageService.saveProfile(profile);

      return { success: true, keyTitle };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload SSH key',
      };
    }
  }

  /**
   * Check whether the profile's SSH key is present on GitLab.
   * Uses the GitLab REST API v4: GET /user/keys
   */
  async checkKeyExists(profileId: string): Promise<{ exists: boolean; error?: string }> {
    try {
      const profile = storageService.getProfile(profileId);
      if (!profile) return { exists: false, error: 'Profile not found' };

      if (!profile.providerMeta?.connected) return { exists: false };

      if (!profile.keyPath) return { exists: false, error: 'No SSH key found' };

      const accessToken = gitLabOAuthService.getAccessToken(profileId);
      if (!accessToken) return { exists: false, error: 'No valid access token' };

      const publicKeyContent = sshKeyService.getPublicKeyContent(profile.keyPath);
      if (!publicKeyContent) return { exists: false, error: 'Failed to read SSH public key' };

      const parts = publicKeyContent.trim().split(/\s+/);
      const sshWithoutEmail = parts.slice(0, 2).join(' ');

      const existingKeys = await this.listSSHKeys(accessToken);
      const exists = existingKeys.some((k) => k.key.trim() === sshWithoutEmail.trim());

      // Sync providerMeta if status changed
      if (exists !== (profile.providerMeta?.sshKeyAdded ?? false)) {
        profile.providerMeta!.sshKeyAdded = exists;
        profile.updatedAt = Date.now();
        storageService.saveProfile(profile);
      }

      return { exists };
    } catch (error) {
      return {
        exists: false,
        error: error instanceof Error ? error.message : 'Failed to check key',
      };
    }
  }

  private async listSSHKeys(accessToken: string): Promise<GitLabSSHKey[]> {
    try {
      const response = await fetch('https://gitlab.com/api/v4/user/keys', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });
      if (!response.ok) return [];
      return await response.json() as GitLabSSHKey[];
    } catch {
      return [];
    }
  }
}

export const gitLabApiService = new GitLabApiService();
