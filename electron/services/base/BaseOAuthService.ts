import { storageService } from '../storageService.ts';

export interface OAuthFlowResult {
  success: boolean;
  error?: string;
}

export interface OAuthDisconnectResult {
  success: boolean;
  error?: string;
}

/**
 * Abstract base class for all provider OAuth services.
 * To add a new provider: extend this class, implement the three methods,
 * and register the instance in services/index.ts.
 */
export abstract class BaseOAuthService {
  abstract startOAuthFlow(profileId: string): Promise<OAuthFlowResult>;
  abstract disconnectAccount(profileId: string): Promise<OAuthDisconnectResult>;
  abstract getAccessToken(profileId: string): string | null;
}

/**
 * Stub used for providers whose OAuth integration is not yet implemented.
 * The `disconnectAccount` still clears any lingering providerMeta data.
 */
export class StubOAuthService extends BaseOAuthService {
  private readonly pendingMessage: string;

  constructor(pendingMessage: string) {
    super();
    this.pendingMessage = pendingMessage;
  }

  async startOAuthFlow(_profileId: string): Promise<OAuthFlowResult> {
    return { success: false, error: this.pendingMessage };
  }

  async disconnectAccount(profileId: string): Promise<OAuthDisconnectResult> {
    try {
      const profile = storageService.getProfile(profileId);
      if (!profile) return { success: false, error: 'Profile not found' };

      profile.providerMeta = {
        connected: false,
        accessTokenEncrypted: null,
        username: null,
        sshKeyAdded: false,
      };
      // Clear legacy GitHub fields for a clean migration
      profile.githubConnected = false;
      profile.githubAccessTokenEncrypted = null;
      profile.githubUsername = null;
      profile.sshKeyAddedToGithub = false;
      profile.updatedAt = Date.now();
      storageService.saveProfile(profile);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to disconnect',
      };
    }
  }

  getAccessToken(_profileId: string): string | null {
    return null;
  }
}
