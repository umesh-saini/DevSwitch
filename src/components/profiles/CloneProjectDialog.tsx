import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/animate-ui/components/buttons/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { electronService } from '@/services/electronService';
import { X, FolderOpen, Loader2, CheckCircle2 } from 'lucide-react';
import { getProviderConfig, type GitProvider } from '@/lib/providerUtils';

interface CloneProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  email: string;
  hostAlias: string;
  provider?: GitProvider;
}

export function CloneProjectDialog({
  open,
  onOpenChange,
  username,
  email,
  hostAlias,
  provider = 'github',
}: CloneProjectDialogProps) {
  const providerCfg = getProviderConfig(provider);
  const [repoUrl, setRepoUrl] = useState('');
  const [destinationFolder, setDestinationFolder] = useState('');
  const [isCloning, setIsCloning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSelectFolder = async () => {
    try {
      setError(null);
      const result = await electronService.selectFolder();
      if (result?.folderPath) {
        setDestinationFolder(result.folderPath);
      }
      // If result is null, user cancelled - no error needed
    } catch (err) {
      console.error('Folder selection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to select folder');
    }
  };

  const handleClone = async () => {
    if (!repoUrl.trim() || !destinationFolder.trim()) {
      setError('Please provide both repository URL and destination folder');
      return;
    }

    setIsCloning(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await electronService.cloneRepository({
        repoUrl: repoUrl.trim(),
        destinationFolder,
        username,
        email,
        hostAlias,
      });

      if (result.success) {
        setSuccess(`Repository cloned successfully to ${result.clonedPath}`);
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        setError(result.error || 'Failed to clone repository');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clone repository');
    } finally {
      setIsCloning(false);
    }
  };

  const handleClose = () => {
    setRepoUrl('');
    setDestinationFolder('');
    setError(null);
    setSuccess(null);
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background border border-border rounded-lg shadow-lg p-6 w-full max-w-lg z-50">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-xl font-bold">Clone Repository</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <X className="w-4 h-4" />
              </Button>
            </Dialog.Close>
          </div>

          <Dialog.Description className="text-sm text-muted-foreground mb-6">
            Clone a {providerCfg.name} repository with this profile's git configuration
          </Dialog.Description>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="repoUrl">Repository URL</Label>
              <Input
                id="repoUrl"
                placeholder="git@github.com:username/repo.git or https://..."
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                disabled={isCloning}
              />
              <p className="text-xs text-muted-foreground">
                Enter SSH or HTTPS {providerCfg.name} repository URL (host: <span className="font-mono">{providerCfg.sshHost}</span>)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="destinationFolder">Destination Folder</Label>
              <div className="flex gap-2">
                <Input
                  id="destinationFolder"
                  placeholder="Select destination folder..."
                  value={destinationFolder}
                  readOnly
                  disabled={isCloning}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSelectFolder}
                  disabled={isCloning}
                  className="flex-shrink-0"
                >
                  <FolderOpen className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                The repository will be cloned into this folder
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
              <p className="font-medium">This will configure:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>git config user.name "{username}"</li>
                <li>git config user.email "{email}"</li>
                <li>Remote origin with SSH host alias: {hostAlias}</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={handleClose} disabled={isCloning}>
              Cancel
            </Button>
            <Button onClick={handleClone} disabled={isCloning || !repoUrl.trim() || !destinationFolder.trim()}>
              {isCloning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cloning...
                </>
              ) : (
                'Clone Repository'
              )}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
