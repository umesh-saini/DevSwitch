export type GitProvider = 'github' | 'gitlab' | 'bitbucket' | 'azure' | 'other';

export interface ProviderConfig {
  id: GitProvider;
  name: string;
  sshHost: string;       // canonical SSH hostname, e.g. "github.com"
  sshUser: string;       // SSH user (almost always "git")
  color: string;         // brand hex color for UI indicators
  buildSshUrl: (hostAlias: string, owner: string, repo: string) => string;
  buildProfileUrl: (username: string) => string;
}

export const PROVIDER_CONFIGS: Record<GitProvider, ProviderConfig> = {
  github: {
    id: 'github',
    name: 'GitHub',
    sshHost: 'github.com',
    sshUser: 'git',
    color: '#24292e',
    buildSshUrl: (alias, owner, repo) => `git@${alias}:${owner}/${repo}.git`,
    buildProfileUrl: (username) => `https://github.com/${username}`,
  },
  gitlab: {
    id: 'gitlab',
    name: 'GitLab',
    sshHost: 'gitlab.com',
    sshUser: 'git',
    color: '#e24329',
    buildSshUrl: (alias, owner, repo) => `git@${alias}:${owner}/${repo}.git`,
    buildProfileUrl: (username) => `https://gitlab.com/${username}`,
  },
  bitbucket: {
    id: 'bitbucket',
    name: 'Bitbucket',
    sshHost: 'bitbucket.org',
    sshUser: 'git',
    color: '#0052cc',
    buildSshUrl: (alias, owner, repo) => `git@${alias}:${owner}/${repo}.git`,
    buildProfileUrl: (username) => `https://bitbucket.org/${username}`,
  },
  azure: {
    id: 'azure',
    name: 'Azure DevOps',
    sshHost: 'ssh.dev.azure.com',
    sshUser: 'git',
    color: '#0078d4',
    // Azure format: git@ssh.dev.azure.com:v3/<org>/<project>/<repo>
    buildSshUrl: (alias, owner, repo) => `git@${alias}:v3/${owner}/${repo}/${repo}`,
    buildProfileUrl: (username) => `https://dev.azure.com/${username}`,
  },
  other: {
    id: 'other',
    name: 'Other',
    sshHost: 'git.example.com',
    sshUser: 'git',
    color: '#6b7280',
    buildSshUrl: (alias, owner, repo) => `git@${alias}:${owner}/${repo}.git`,
    buildProfileUrl: () => '',
  },
};

/** Returns the provider config, defaulting to GitHub for backward-compat. */
export function getProviderConfig(provider?: GitProvider | null): ProviderConfig {
  return PROVIDER_CONFIGS[provider || 'github'];
}

/** Parses an SSH or HTTPS repo URL, returns { owner, repo } or null. */
export function parseGitUrl(url: string): { owner: string; repo: string } | null {
  // SSH format: git@<host>:<owner>/<repo>.git  (also Azure v3 format handled below)
  const sshMatch = url.match(/git@[^:]+:(?:v3\/)?([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/);
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2] };
  }
  // HTTPS format: https://<host>/<owner>/<repo>.git
  const httpsMatch = url.match(/https?:\/\/[^/]+\/([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] };
  }
  return null;
}
