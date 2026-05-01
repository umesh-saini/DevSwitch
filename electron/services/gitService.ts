import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface CloneRepoParams {
  repoUrl: string;
  destinationFolder: string;
  username: string;
  email: string;
  hostAlias: string;
}

export interface UpdateProjectParams {
  projectPath: string;
  username: string;
  email: string;
  repoUrl?: string;
  remoteName?: string;
  hostAlias: string;
}

export class GitService {
  /**
   * Clone a repository and configure git settings
   */
  async cloneRepository(params: CloneRepoParams): Promise<{ success: boolean; error?: string; clonedPath?: string }> {
    try {
      const { repoUrl, destinationFolder, username, email, hostAlias } = params;

      // Validate destination folder exists
      if (!fs.existsSync(destinationFolder)) {
        return { success: false, error: 'Destination folder does not exist' };
      }

      // Convert URL to SSH format with host alias
      const sshUrl = this.convertToSSHUrl(repoUrl, hostAlias);
      if (!sshUrl) {
        return { success: false, error: 'Invalid repository URL format' };
      }

      // Extract repo name for folder
      const repoName = this.extractRepoName(sshUrl);
      const clonePath = path.join(destinationFolder, repoName);

      // Check if directory already exists
      if (fs.existsSync(clonePath)) {
        return { success: false, error: `Directory ${repoName} already exists in the destination folder` };
      }

      // Clone repository
      try {
        execSync(`git clone ${sshUrl}`, {
          cwd: destinationFolder,
          stdio: 'pipe',
          encoding: 'utf-8'
        });
      } catch (error) {
        return {
          success: false,
          error: `Failed to clone repository: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }

      // Configure git user settings for this repository
      try {
        execSync(`git config user.name "${username}"`, {
          cwd: clonePath,
          stdio: 'pipe'
        });

        execSync(`git config user.email "${email}"`, {
          cwd: clonePath,
          stdio: 'pipe'
        });
      } catch (error) {
        return {
          success: false,
          error: `Repository cloned but failed to configure git settings: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }

      return { success: true, clonedPath: clonePath };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clone repository'
      };
    }
  }

  /**
   * Update git remote and configuration in an existing project
   */
  async updateProjectConfig(params: UpdateProjectParams): Promise<{ success: boolean; error?: string; oldOrigin?: string }> {
    try {
      const { projectPath, username, email, repoUrl, remoteName = 'origin', hostAlias } = params;

      // Validate project path exists and is a git repository
      if (!fs.existsSync(projectPath)) {
        return { success: false, error: 'Project path does not exist' };
      }

      const gitDir = path.join(projectPath, '.git');
      if (!fs.existsSync(gitDir)) {
        return { success: false, error: 'Not a git repository' };
      }

      let oldOrigin = '';
      
      // Update remote only if repoUrl is provided
      if (repoUrl && repoUrl.trim()) {
        // Get current remote URL
        try {
          oldOrigin = execSync(`git remote get-url ${remoteName}`, {
            cwd: projectPath,
            encoding: 'utf-8'
          }).trim();
        } catch (error) {
          // No remote configured with this name
          console.error(`Error getting current remote URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
          oldOrigin = 'none';
        }

        // Convert URL to SSH format with host alias
        const sshUrl = this.convertToSSHUrl(repoUrl, hostAlias);
        if (!sshUrl) {
          return { success: false, error: 'Invalid repository URL format' };
        }

        // Update remote
        try {
          if (oldOrigin === 'none') {
            execSync(`git remote add ${remoteName} ${sshUrl}`, {
              cwd: projectPath,
              stdio: 'pipe'
            });
          } else {
            execSync(`git remote set-url ${remoteName} ${sshUrl}`, {
              cwd: projectPath,
              stdio: 'pipe'
            });
          }
        } catch (error) {
          return {
            success: false,
            error: `Failed to update remote ${remoteName}: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
        }
      }

      // Update git config
      try {
        execSync(`git config user.name "${username}"`, {
          cwd: projectPath,
          stdio: 'pipe'
        });

        execSync(`git config user.email "${email}"`, {
          cwd: projectPath,
          stdio: 'pipe'
        });
      } catch (error) {
        return {
          success: false,
          error: `${repoUrl ? 'Remote updated but ' : ''}Failed to configure git settings: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }

      return { success: true, oldOrigin };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update project configuration'
      };
    }
  }

  /**
   * Get all git remotes from a project
   */
  async getProjectRemotes(projectPath: string): Promise<{
    success: boolean;
    remotes?: Array<{ name: string; url: string; type: 'fetch' | 'push' }>;
    error?: string;
  }> {
    try {
      if (!fs.existsSync(projectPath)) {
        return { success: false, error: 'Project path does not exist' };
      }

      const gitDir = path.join(projectPath, '.git');
      if (!fs.existsSync(gitDir)) {
        return { success: false, error: 'Not a git repository' };
      }

      let remoteOutput = '';
      try {
        remoteOutput = execSync('git remote -v', {
          cwd: projectPath,
          encoding: 'utf-8'
        }).trim();
      } catch (error) {
        // No remotes configured
        console.error(`Error getting current remote URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return { success: true, remotes: [] };
      }

      if (!remoteOutput) {
        return { success: true, remotes: [] };
      }

      // Parse remote output
      // Format: "origin  git@github.com:username/repo.git (fetch)"
      const remotes: Array<{ name: string; url: string; type: 'fetch' | 'push' }> = [];
      const lines = remoteOutput.split('\n');
      
      for (const line of lines) {
        const match = line.match(/^(\S+)\s+(\S+)\s+\((fetch|push)\)$/);
        if (match) {
          const [, name, url, type] = match;
          remotes.push({ name, url, type: type as 'fetch' | 'push' });
        }
      }

      return { success: true, remotes };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get project remotes'
      };
    }
  }

  /**
   * Get current git configuration from a project
   */
  async getProjectConfig(projectPath: string): Promise<{
    success: boolean;
    config?: { username?: string; email?: string; origin?: string };
    error?: string;
  }> {
    try {
      if (!fs.existsSync(projectPath)) {
        return { success: false, error: 'Project path does not exist' };
      }

      const gitDir = path.join(projectPath, '.git');
      if (!fs.existsSync(gitDir)) {
        return { success: false, error: 'Not a git repository' };
      }

      const config: { username?: string; email?: string; origin?: string } = {};

      try {
        config.username = execSync('git config user.name', {
          cwd: projectPath,
          encoding: 'utf-8'
        }).trim();
      } catch (error) {
        // No username configured
        console.error(`Error getting current remote URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      try {
        config.email = execSync('git config user.email', {
          cwd: projectPath,
          encoding: 'utf-8'
        }).trim();
      } catch (error) {
        // No email configured
        console.error(`Error getting current remote URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      try {
        config.origin = execSync('git remote get-url origin', {
          cwd: projectPath,
          encoding: 'utf-8'
        }).trim();
      } catch (error) {
        // No origin configured
        console.error(`Error getting current remote URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      return { success: true, config };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get project configuration'
      };
    }
  }

  /**
   * Convert any Git URL format to SSH format with custom host alias
   */
  private convertToSSHUrl(url: string, hostAlias: string): string | null {
    // SSH format: git@github.com:username/repo.git
    const sshMatch = url.match(/git@[^:]+:([^/]+)\/(.+?)(?:\.git)?$/);
    if (sshMatch) {
      const [, username, repo] = sshMatch;
      return `git@${hostAlias}:${username}/${repo}.git`;
    }

    // HTTPS format: https://github.com/username/repo.git
    const httpsMatch = url.match(/https?:\/\/[^/]+\/([^/]+)\/(.+?)(?:\.git)?$/);
    if (httpsMatch) {
      const [, username, repo] = httpsMatch;
      return `git@${hostAlias}:${username}/${repo}.git`;
    }

    return null;
  }

  /**
   * Extract repository name from SSH URL
   */
  private extractRepoName(sshUrl: string): string {
    const match = sshUrl.match(/\/([^/]+?)(?:\.git)?$/);
    return match ? match[1] : 'repository';
  }
}

export const gitService = new GitService();
