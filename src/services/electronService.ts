import type { CreateProfileInput, UpdateProfileInput } from '../types/profile';

export const electronService = {
  // Profile operations
  async createProfile(input: CreateProfileInput) {
    return await window.electronAPI.profile.create(input);
  },

  async updateProfile(input: UpdateProfileInput) {
    return await window.electronAPI.profile.update(input);
  },

  async deleteProfile(id: string) {
    return await window.electronAPI.profile.delete(id);
  },

  async getAllProfiles() {
    return await window.electronAPI.profile.getAll();
  },

  async getProfileById(id: string) {
    return await window.electronAPI.profile.getById(id);
  },

  // SSH operations
  async generateSSHKey(params: {
    algorithm: 'ed25519' | 'rsa';
    name: string;
    passphrase?: string;
  }) {
    return await window.electronAPI.ssh.generateKey(params);
  },

  async selectExistingKey() {
    return await window.electronAPI.ssh.selectExisting();
  },

  async addKeyToAgent(params: { keyPath: string; passphrase?: string }) {
    return await window.electronAPI.ssh.addToAgent(params);
  },

  async checkDefaultSSHKeys() {
    return await window.electronAPI.ssh.checkDefaultKeys();
  },

  async getSSHPublicKey(privateKeyPath: string) {
    return await window.electronAPI.ssh.getPublicKey(privateKeyPath);
  },

  // SSH Config operations
  async readSSHConfig() {
    return await window.electronAPI.sshConfig.read();
  },

  async getHostAliasForKey(keyPath: string) {
    return await window.electronAPI.sshConfig.getHostAlias(keyPath);
  },

  // Git operations
  async getGlobalGitConfig() {
    return await window.electronAPI.git.getGlobalConfig();
  },

  async selectFolder() {
    return await window.electronAPI.git.selectFolder();
  },

  async cloneRepository(params: {
    repoUrl: string;
    destinationFolder: string;
    username: string;
    email: string;
    hostAlias: string;
  }) {
    return await window.electronAPI.git.cloneRepository(params);
  },

  async updateProjectConfig(params: {
    projectPath: string;
    username: string;
    email: string;
    repoUrl?: string;
    remoteName?: string;
    hostAlias: string;
  }) {
    return await window.electronAPI.git.updateProjectConfig(params);
  },

  async getProjectConfig(projectPath: string) {
    return await window.electronAPI.git.getProjectConfig(projectPath);
  },

  async getProjectRemotes(projectPath: string) {
    return await window.electronAPI.git.getProjectRemotes(projectPath);
  },

  // Sync operations
  async scanAndSyncProfiles() {
    return await window.electronAPI.sync.scanAndSync();
  },

  // GitHub OAuth operations
  async startGitHubOAuth(profileId: string) {
    return await window.electronAPI.github.startOAuth(profileId);
  },

  async disconnectGitHub(profileId: string) {
    return await window.electronAPI.github.disconnectAccount(profileId);
  },

  async uploadSSHKeyToGitHub(profileId: string) {
    return await window.electronAPI.github.uploadSSHKey(profileId);
  },

  async checkSSHKeyOnGitHub(profileId: string) {
    return await window.electronAPI.github.checkKeyExists(profileId);
  },
};
