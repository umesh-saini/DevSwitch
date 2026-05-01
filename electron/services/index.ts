/**
 * Provider Service Registry
 *
 * This is the single place where provider implementations are registered.
 *
 * ── How to add a new provider ─────────────────────────────────────────────────
 * 1. Create `services/<provider>/NewProviderOAuthService.ts`
 *    extending BaseOAuthService and exporting a singleton.
 * 2. Create `services/<provider>/NewProviderApiService.ts`
 *    extending BaseApiService and exporting a singleton.
 * 3. Import the singletons below and add them to the two registry objects.
 * 4. No changes to main.ts are needed — the IPC loop picks them up automatically.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { GitProvider } from '../type/profile.ts';
import { BaseOAuthService, StubOAuthService } from './base/BaseOAuthService.ts';
import { BaseApiService, StubApiService } from './base/BaseApiService.ts';

// ── GitHub ────────────────────────────────────────────────────────────────────
import { githubOAuthService } from './github/GitHubOAuthService.ts';
import { githubApiService }   from './github/GitHubApiService.ts';

// ── GitLab ────────────────────────────────────────────────────────────────────
import { gitLabOAuthService } from './gitLab/GitLabOAuthService.ts';
import { gitLabApiService }   from './gitLab/GitLabApiService.ts';

// ── OAuth Service Registry ────────────────────────────────────────────────────
const oauthRegistry: Partial<Record<GitProvider, BaseOAuthService>> = {
  github: githubOAuthService,
  gitlab: gitLabOAuthService,
  // bitbucket: bitbucketOAuthService,  ← add here when implemented
  // azure:     azureOAuthService,      ← add here when implemented
};

// ── API Service Registry ──────────────────────────────────────────────────────
const apiRegistry: Partial<Record<GitProvider, BaseApiService>> = {
  github: githubApiService,
  gitlab: gitLabApiService,
  // bitbucket: bitbucketApiService,    ← add here when implemented
  // azure:     azureApiService,        ← add here when implemented
};

// ── Stub fallback messages ────────────────────────────────────────────────────
const STUB_OAUTH_MSG: Partial<Record<GitProvider, string>> = {
  bitbucket: 'Bitbucket OAuth coming soon. Add your SSH key manually at https://bitbucket.org/account/settings/ssh-keys/',
  azure:     'Azure DevOps OAuth coming soon. Add your SSH key manually at https://dev.azure.com/_usersSettings/keys',
  other:     'OAuth is not supported for custom providers.',
};

const STUB_API_MSG: Partial<Record<GitProvider, string>> = {
  bitbucket: 'Bitbucket SSH key upload coming soon. Add your key manually at https://bitbucket.org/account/settings/ssh-keys/',
  azure:     'Azure DevOps SSH key upload coming soon. Add your key manually at https://dev.azure.com/_usersSettings/keys',
  other:     'SSH key upload is not supported for custom providers.',
};

/**
 * Returns the OAuth service for the given provider.
 * Falls back to a StubOAuthService for unregistered providers.
 */
export function getOAuthService(provider: GitProvider): BaseOAuthService {
  return (
    oauthRegistry[provider] ??
    new StubOAuthService(
      STUB_OAUTH_MSG[provider] ?? `OAuth not supported for provider: ${provider}`,
    )
  );
}

/**
 * Returns the API service for the given provider.
 * Falls back to a StubApiService for unregistered providers.
 */
export function getApiService(provider: GitProvider): BaseApiService {
  return (
    apiRegistry[provider] ??
    new StubApiService(
      STUB_API_MSG[provider] ?? `API not supported for provider: ${provider}`,
    )
  );
}

export type { BaseOAuthService, BaseApiService };
export { StubOAuthService, StubApiService };
