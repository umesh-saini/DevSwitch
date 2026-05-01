import { shell } from 'electron';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { storageService } from '../storageService.ts';
import { encryptPassphrase, decryptPassphrase } from '../../utils/encryption.ts';
import { BaseOAuthService } from '../base/BaseOAuthService.ts';

import { config } from 'dotenv';
config();

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';

const BASE_PORT = 54876;
const MAX_PORT_ATTEMPTS = 10;

interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

interface GitHubUser {
  login: string;
  id: number;
  email: string;
  name: string;
}

export class GitHubOAuthService extends BaseOAuthService {
  private httpServer: ReturnType<typeof createServer> | null = null;
  private currentPort: number = BASE_PORT;

  private async findAvailablePort(): Promise<number> {
    for (let i = 0; i < MAX_PORT_ATTEMPTS; i++) {
      const port = BASE_PORT + i;
      if (await this.isPortAvailable(port)) return port;
    }
    throw new Error('No available ports found');
  }

  private isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => { server.close(); resolve(true); });
      server.listen(port);
    });
  }

  /**
   * Start GitHub OAuth flow using system browser.
   */
  async startOAuthFlow(profileId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const port = await this.findAvailablePort();
      this.currentPort = port;
      const redirectUri = `http://localhost:${port}/oauth/callback`;

      const scopes = ['user', 'admin:public_key'];
      const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes.join(' ')}&state=${profileId}`;

      return new Promise((resolve) => {
        this.httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
          const url = new URL(req.url || '', `http://localhost:${port}`);

          if (url.pathname === '/oauth/callback') {
            const code = url.searchParams.get('code');
            const state = url.searchParams.get('state');

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="UTF-8">
                  <title>DevSwitch OAuth</title>
                  <style>
                    body {
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                      display: flex; align-items: center; justify-content: center;
                      height: 100vh; margin: 0;
                      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    }
                    .container {
                      background: white; padding: 3rem; border-radius: 1rem;
                      box-shadow: 0 10px 40px rgba(0,0,0,0.2); text-align: center; max-width: 400px;
                    }
                    h1 { color: #333; margin-bottom: 1rem; }
                    p  { color: #666; margin-bottom: 1.5rem; }
                    .success { color: #10b981; font-size: 3rem; margin-bottom: 1rem; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="success">✓</div>
                    <h1>Authentication Successful!</h1>
                    <p>You can close this window and return to DevSwitch.</p>
                  </div>
                </body>
              </html>
            `);

            if (this.httpServer) { this.httpServer.close(); this.httpServer = null; }

            if (!code || state !== profileId) {
              resolve({ success: false, error: 'Invalid OAuth response' });
              return;
            }

            const result = await this.processCallback(code, profileId);
            resolve(result);
          } else {
            res.writeHead(404);
            res.end('Not Found');
          }
        });

        this.httpServer.listen(port, () => {
          console.log(`GitHub OAuth callback server started on http://localhost:${port}`);
          shell.openExternal(authUrl).catch((error) => {
            console.error('Failed to open browser:', error);
            if (this.httpServer) { this.httpServer.close(); this.httpServer = null; }
            resolve({ success: false, error: 'Failed to open browser. Please try again.' });
          });
        });

        this.httpServer.on('error', (error) => {
          console.error('HTTP server error:', error);
          if (this.httpServer) { this.httpServer.close(); this.httpServer = null; }
          resolve({ success: false, error: `Server error: ${error.message}` });
        });

        // 5-minute timeout
        setTimeout(() => {
          if (this.httpServer) {
            this.httpServer.close();
            this.httpServer = null;
            resolve({ success: false, error: 'Authentication timeout. Please try again.' });
          }
        }, 5 * 60 * 1000);
      });
    } catch (error) {
      if (this.httpServer) { this.httpServer.close(); this.httpServer = null; }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start OAuth flow',
      };
    }
  }

  /**
   * Process OAuth callback after receiving authorization code.
   */
  private async processCallback(
    code: string,
    profileId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const tokenResult = await this.exchangeCodeForToken(code);
      if (!tokenResult.success || !tokenResult.accessToken) {
        return { success: false, error: tokenResult.error || 'Failed to get access token' };
      }

      const userResult = await this.getGitHubUser(tokenResult.accessToken);
      if (!userResult.success || !userResult.user) {
        return { success: false, error: userResult.error || 'Failed to get user info' };
      }

      const profile = storageService.getProfile(profileId);
      if (!profile) return { success: false, error: 'Profile not found' };

      // Write to the new provider-agnostic field
      profile.providerMeta = {
        connected: true,
        accessTokenEncrypted: encryptPassphrase(tokenResult.accessToken),
        username: userResult.user.login,
        // Preserve existing sshKeyAdded status (new field first, then legacy)
        sshKeyAdded: profile.providerMeta?.sshKeyAdded ?? profile.sshKeyAddedToGithub ?? false,
      };
      profile.updatedAt = Date.now();
      storageService.saveProfile(profile);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process OAuth callback',
      };
    }
  }

  private async exchangeCodeForToken(
    code: string,
  ): Promise<{ success: boolean; accessToken?: string; error?: string }> {
    try {
      const redirectUri = `http://localhost:${this.currentPort}/oauth/callback`;
      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!response.ok) return { success: false, error: 'Failed to exchange code for token' };

      const data = await response.json() as OAuthTokenResponse;
      if (!data.access_token) return { success: false, error: 'No access token in response' };

      return { success: true, accessToken: data.access_token };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token exchange failed',
      };
    }
  }

  private async getGitHubUser(
    accessToken: string,
  ): Promise<{ success: boolean; user?: GitHubUser; error?: string }> {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });
      if (!response.ok) return { success: false, error: 'Failed to get user info' };
      const user = await response.json() as GitHubUser;
      return { success: true, user };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user',
      };
    }
  }

  /**
   * Disconnect GitHub account and clear stored credentials.
   */
  async disconnectAccount(profileId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const profile = storageService.getProfile(profileId);
      if (!profile) return { success: false, error: 'Profile not found' };

      profile.providerMeta = {
        connected: false,
        accessTokenEncrypted: null,
        username: null,
        sshKeyAdded: false,
      };
      // Also clear legacy fields for a clean migration
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

  /**
   * Returns the decrypted access token.
   * Falls back to the legacy githubAccessTokenEncrypted field for backward compat.
   */
  getAccessToken(profileId: string): string | null {
    const profile = storageService.getProfile(profileId);
    if (!profile) return null;

    // New field first, then legacy fallback
    const encrypted =
      profile.providerMeta?.accessTokenEncrypted ??
      profile.githubAccessTokenEncrypted ??
      null;

    if (!encrypted) return null;
    try {
      return decryptPassphrase(encrypted);
    } catch {
      return null;
    }
  }
}

export const githubOAuthService = new GitHubOAuthService();
