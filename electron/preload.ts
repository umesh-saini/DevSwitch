import { contextBridge, ipcRenderer } from "electron";
import type { ElectronAPI, CreateProfileInput, UpdateProfileInput, Profile, PermissionCheckResult } from './type/profile.ts';

const electronAPI: ElectronAPI = {
  profile: {
    create: (input: CreateProfileInput) => ipcRenderer.invoke('profile:create', input),
    update: (input: UpdateProfileInput) => ipcRenderer.invoke('profile:update', input),
    delete: (id: string) => ipcRenderer.invoke('profile:delete', id),
    getAll: () => ipcRenderer.invoke('profile:getAll'),
    getById: (id: string) => ipcRenderer.invoke('profile:getById', id),
  },
  ssh: {
    generateKey: (params) => ipcRenderer.invoke('ssh:generateKey', params),
    selectExisting: () => ipcRenderer.invoke('ssh:selectExisting'),
    addToAgent: (params) => ipcRenderer.invoke('ssh:addToAgent', params),
    checkDefaultKeys: () => ipcRenderer.invoke('ssh:checkDefaultKeys'),
    getPublicKey: (privateKeyPath: string) => ipcRenderer.invoke('ssh:getPublicKey', privateKeyPath),
    testConnection: (params) => ipcRenderer.invoke('ssh:testConnection', params),
  },
  sshConfig: {
    update: (profile: Profile) => ipcRenderer.invoke('sshConfig:update', profile),
    read: () => ipcRenderer.invoke('sshConfig:read'),
    getHostAlias: (keyPath: string) => ipcRenderer.invoke('sshConfig:getHostAlias', keyPath),
  },
  git: {
    getGlobalConfig: () => ipcRenderer.invoke('git:getGlobalConfig'),
    cloneRepository: (params) => ipcRenderer.invoke('git:cloneRepository', params),
    selectFolder: () => ipcRenderer.invoke('git:selectFolder'),
    getProjectConfig: (path: string) => ipcRenderer.invoke('git:getProjectConfig', path),
    getProjectRemotes: (path: string) => ipcRenderer.invoke('git:getProjectRemotes', path),
    updateProjectConfig: (params) => ipcRenderer.invoke('git:updateProjectConfig', params),
  },
  sync: {
    scanAndSync: () => ipcRenderer.invoke('sync:scanAndSync'),
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  },
  github: {
    startOAuth: (profileId: string) => ipcRenderer.invoke('github:startOAuth', profileId),
    disconnectAccount: (profileId: string) => ipcRenderer.invoke('github:disconnectAccount', profileId),
    uploadSSHKey: (profileId: string) => ipcRenderer.invoke('github:uploadSSHKey', profileId),
    checkKeyExists: (profileId: string) => ipcRenderer.invoke('github:checkKeyExists', profileId),
  },
  gitlab: {
    startOAuth: (profileId: string) => ipcRenderer.invoke('gitlab:startOAuth', profileId),
    disconnectAccount: (profileId: string) => ipcRenderer.invoke('gitlab:disconnectAccount', profileId),
    uploadSSHKey: (profileId: string) => ipcRenderer.invoke('gitlab:uploadSSHKey', profileId),
    checkKeyExists: (profileId: string) => ipcRenderer.invoke('gitlab:checkKeyExists', profileId),
  },
  bitbucket: {
    startOAuth: (profileId: string) => ipcRenderer.invoke('bitbucket:startOAuth', profileId),
    disconnectAccount: (profileId: string) => ipcRenderer.invoke('bitbucket:disconnectAccount', profileId),
    uploadSSHKey: (profileId: string) => ipcRenderer.invoke('bitbucket:uploadSSHKey', profileId),
    checkKeyExists: (profileId: string) => ipcRenderer.invoke('bitbucket:checkKeyExists', profileId),
  },
  azure: {
    startOAuth: (profileId: string) => ipcRenderer.invoke('azure:startOAuth', profileId),
    disconnectAccount: (profileId: string) => ipcRenderer.invoke('azure:disconnectAccount', profileId),
    uploadSSHKey: (profileId: string) => ipcRenderer.invoke('azure:uploadSSHKey', profileId),
    checkKeyExists: (profileId: string) => ipcRenderer.invoke('azure:checkKeyExists', profileId),
  },
  permissions: {
    check: (): Promise<PermissionCheckResult> => ipcRenderer.invoke('permission:check'),
    openSettings: (): Promise<void> => ipcRenderer.invoke('permission:openSettings'),
    continue: (): Promise<void> => ipcRenderer.invoke('permission:continue'),
  },
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
