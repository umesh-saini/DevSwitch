import type { GitProvider } from '../type/profile.ts';

export interface ProviderSSHConfig {
  sshHost: string;
  sshUser: string;
}

export const PROVIDER_SSH_CONFIGS: Record<GitProvider, ProviderSSHConfig> = {
  github:    { sshHost: 'github.com',        sshUser: 'git' },
  gitlab:    { sshHost: 'gitlab.com',        sshUser: 'git' },
  bitbucket: { sshHost: 'bitbucket.org',     sshUser: 'git' },
  azure:     { sshHost: 'ssh.dev.azure.com', sshUser: 'git' },
  other:     { sshHost: 'git.example.com',   sshUser: 'git' },
};

/** Returns the SSH config for the given provider, defaulting to GitHub. */
export function getProviderSSHConfig(provider?: GitProvider | null): ProviderSSHConfig {
  return PROVIDER_SSH_CONFIGS[provider || 'github'];
}

/**
 * Returns true if the SSH test output from a provider indicates a successful
 * authentication, even when the process exits with a non-zero code (which is
 * normal for GitHub/GitLab/Bitbucket "banner-only" SSH handshakes).
 */
export function isSSHAuthSuccess(output: string): boolean {
  const lower = output.toLowerCase();
  return (
    lower.includes('authenticated') ||  // GitHub: "You've successfully authenticated"
    lower.includes('welcome to gitlab') ||
    lower.includes('logged in as') ||   // Bitbucket
    lower.includes('shell access is not permitted') // Some providers say this on success
  );
}
