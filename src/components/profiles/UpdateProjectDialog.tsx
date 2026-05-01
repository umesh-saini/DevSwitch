import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Select from '@radix-ui/react-select';
import { Button } from '@/components/animate-ui/components/buttons/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { electronService } from '@/services/electronService';
import { X, FolderOpen, Loader2, CheckCircle2, Info, ChevronDown, AlertTriangle } from 'lucide-react';
import { getProviderConfig, type GitProvider } from '@/lib/providerUtils';

interface UpdateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  email: string;
  hostAlias: string;
  provider?: GitProvider;
}

interface GitRemote {
  name: string;
  url: string;
  type: 'fetch' | 'push';
}

export function UpdateProjectDialog({
  open,
  onOpenChange,
  username,
  email,
  hostAlias,
  provider = 'github',
}: UpdateProjectDialogProps) {
  const providerCfg = getProviderConfig(provider);
  const [projectPath, setProjectPath] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [currentConfig, setCurrentConfig] = useState<{
    username?: string;
    email?: string;
    origin?: string;
  } | null>(null);
  const [remotes, setRemotes] = useState<GitRemote[]>([]);
  const [selectedRemote, setSelectedRemote] = useState<string>('origin');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSelectFolder = async () => {
    try {
      setError(null);
      const result = await electronService.selectFolder();
      if (result?.folderPath) {
        setProjectPath(result.folderPath);
        // Load current git config and remotes
        await loadProjectData(result.folderPath);
      }
      // If result is null, user cancelled - no error needed
    } catch (err) {
      console.error('Folder selection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to select folder');
    }
  };

  const loadProjectData = async (path: string) => {
    setIsLoadingConfig(true);
    setCurrentConfig(null);
    setRemotes([]);
    setError(null);
    setRepoUrl('');

    try {
      // Load config
      const configResult = await electronService.getProjectConfig(path);
      if (configResult.success && configResult.config) {
        setCurrentConfig(configResult.config);
      } else {
        setError(configResult.error || 'Failed to load project configuration');
      }

      // Load remotes
      const remotesResult = await electronService.getProjectRemotes(path);
      if (remotesResult.success && remotesResult.remotes) {
        setRemotes(remotesResult.remotes);
        
        // Get unique remote names (since fetch/push are separate entries)
        const uniqueRemotes = Array.from(new Set(remotesResult.remotes.map(r => r.name)));
        
        // Set default selected remote
        if (uniqueRemotes.includes('origin')) {
          setSelectedRemote('origin');
          // Pre-fill URL with origin's URL
          const originRemote = remotesResult.remotes.find(r => r.name === 'origin' && r.type === 'fetch');
          if (originRemote) {
            setRepoUrl(originRemote.url);
          }
        } else if (uniqueRemotes.length > 0) {
          setSelectedRemote(uniqueRemotes[0]);
          // Pre-fill URL with first remote's URL
          const firstRemote = remotesResult.remotes.find(r => r.name === uniqueRemotes[0] && r.type === 'fetch');
          if (firstRemote) {
            setRepoUrl(firstRemote.url);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project data');
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const handleRemoteChange = (remoteName: string) => {
    setSelectedRemote(remoteName);
    // Update repo URL with selected remote's URL
    const remote = remotes.find(r => r.name === remoteName && r.type === 'fetch');
    if (remote) {
      setRepoUrl(remote.url);
    } else {
      setRepoUrl('');
    }
  };

  const handleUpdate = async () => {
    if (!projectPath.trim()) {
      setError('Please select a project folder');
      return;
    }

    setIsUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await electronService.updateProjectConfig({
        projectPath,
        username,
        email,
        repoUrl: repoUrl.trim() || undefined,
        remoteName: selectedRemote,
        hostAlias,
      });

      if (result.success) {
        setSuccess(`Project configuration updated successfully!`);
        // Reload config to show updated values
        await loadProjectData(projectPath);
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        setError(result.error || 'Failed to update project configuration');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project configuration');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClose = () => {
    setProjectPath('');
    setRepoUrl('');
    setCurrentConfig(null);
    setRemotes([]);
    setSelectedRemote('origin');
    setError(null);
    setSuccess(null);
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
      setProjectPath('');
      setRepoUrl('');
      setCurrentConfig(null);
      setRemotes([]);
      setSelectedRemote('origin');
      setError(null);
      setSuccess(null);
    }
  }, [open]);

  // Get unique remote names for the dropdown
  const uniqueRemoteNames = Array.from(new Set(remotes.map(r => r.name)));

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background border border-border rounded-lg shadow-lg p-6 w-full max-w-lg z-50 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-xl font-bold">Update Project Configuration</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <X className="w-4 h-4" />
              </Button>
            </Dialog.Close>
          </div>

          <Dialog.Description className="text-sm text-muted-foreground mb-6">
            Update an existing project's git remote and configuration with this {providerCfg.name} profile
          </Dialog.Description>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="projectPath">Project Folder</Label>
              <div className="flex gap-2">
                <Input
                  id="projectPath"
                  placeholder="Select project folder..."
                  value={projectPath}
                  readOnly
                  disabled={isUpdating || isLoadingConfig}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSelectFolder}
                  disabled={isUpdating || isLoadingConfig}
                  className="shrink-0"
                >
                  {isLoadingConfig ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FolderOpen className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Select a Git repository folder to update
              </p>
            </div>

            {currentConfig && (
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-900 dark:text-blue-100">
                  <Info className="w-4 h-4" />
                  Current Configuration
                </div>
                <div className="text-xs space-y-1 text-blue-800 dark:text-blue-200">
                  <div>
                    <span className="font-medium">Username:</span> {currentConfig.username || 'Not set'}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span> {currentConfig.email || 'Not set'}
                  </div>
                  {remotes.length > 0 && (
                    <div className="mt-2">
                      <span className="font-medium">Remotes:</span>
                      <div className="mt-1 space-y-1">
                        {uniqueRemoteNames.map((name) => {
                          const remote = remotes.find(r => r.name === name && r.type === 'fetch');
                          return (
                            <div key={name} className="pl-2 text-xs">
                              • <span className="font-medium">{name}:</span> {remote?.url || 'N/A'}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {projectPath && remotes.length === 0 && !isLoadingConfig && (
              <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-yellow-900 dark:text-yellow-100">
                  <AlertTriangle className="w-4 h-4" />
                  No Git Remotes Found
                </div>
                <p className="text-xs text-yellow-800 dark:text-yellow-200 mt-1">
                  This project has no git remotes configured. You can add a remote by providing a repository URL below.
                </p>
              </div>
            )}

            {remotes.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="remoteName">Select Remote to Update</Label>
                <Select.Root value={selectedRemote} onValueChange={handleRemoteChange}>
                  <Select.Trigger
                    className="flex items-center justify-between w-full px-3 py-2 text-sm bg-background border border-border rounded-md hover:bg-muted disabled:opacity-50 disabled:pointer-events-none"
                    disabled={isUpdating || !projectPath}
                  >
                    <Select.Value />
                    <Select.Icon>
                      <ChevronDown className="w-4 h-4" />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content className="bg-background border border-border rounded-md shadow-lg z-50 overflow-hidden">
                      <Select.Viewport className="p-1">
                        {uniqueRemoteNames.map((name) => (
                          <Select.Item
                            key={name}
                            value={name}
                            className="relative flex items-center px-8 py-2 text-sm rounded cursor-pointer hover:bg-muted outline-none data-[highlighted]:bg-muted"
                          >
                            <Select.ItemText>{name}</Select.ItemText>
                          </Select.Item>
                        ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
                <p className="text-xs text-muted-foreground">
                  Choose which remote you want to update
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="repoUrl">
                Repository URL {remotes.length === 0 ? '' : '(Optional)'}
              </Label>
              <Input
                id="repoUrl"
                placeholder={remotes.length === 0 ? "git@github.com:username/repo.git or https://..." : "Leave empty to keep current URL"}
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                disabled={isUpdating || !projectPath}
              />
              <p className="text-xs text-muted-foreground">
                {remotes.length === 0 
                  ? "Enter a repository URL to add as a new remote"
                  : "Enter a new URL to update the selected remote, or leave empty to only update git config"}
              </p>
            </div>

            {error && (
              <div className="p-3 text-sm bg-destructive/10 border border-destructive text-destructive rounded-md">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 text-sm bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-900 dark:text-green-100 rounded-md flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {success}
              </div>
            )}

            <div className="bg-muted p-3 rounded-md text-xs space-y-1">
              <p className="font-medium">This will update:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                {repoUrl.trim() && (
                  <li>git remote {remotes.some(r => r.name === selectedRemote) ? 'set-url' : 'add'} {selectedRemote} (SSH host: {hostAlias} → {providerCfg.sshHost})</li>
                )}
                <li>git config user.name "{username}"</li>
                <li>git config user.email "{email}"</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={handleClose} disabled={isUpdating}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={isUpdating || !projectPath.trim() || isLoadingConfig}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Project'
              )}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
