import { useState } from 'react';
import { Button } from '@/components/animate-ui/components/buttons/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Github,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Upload,
  Link as LinkIcon,
  Unlink,
  ExternalLink,
} from 'lucide-react';
import { getProviderConfig, type GitProvider } from '@/lib/providerUtils';

// Map provider → the electronAPI namespace key
type OAuthProvider = Exclude<GitProvider, 'other'>;

const PROVIDER_API_KEY: Record<OAuthProvider, 'github' | 'gitlab' | 'bitbucket' | 'azure'> = {
  github:    'github',
  gitlab:    'gitlab',
  bitbucket: 'bitbucket',
  azure:     'azure',
};

/** URL where the user can manually add their SSH key for each provider */
const MANUAL_KEY_URL: Record<OAuthProvider, string> = {
  github:    'https://github.com/settings/ssh/new',
  gitlab:    'https://gitlab.com/-/profile/keys',
  bitbucket: 'https://bitbucket.org/account/settings/ssh-keys/',
  azure:     'https://dev.azure.com/_usersSettings/keys',
};

interface GitHubConnectionProps {
  profileId: string;
  provider?: GitProvider;
  isConnected: boolean;
  /** The authenticated username from the provider (e.g. @johndoe). */
  providerUsername?: string | null;
  sshKeyAdded: boolean;
  onStatusChange: () => void;
}

export function GitHubConnection({
  profileId,
  provider = 'github',
  isConnected,
  providerUsername,
  sshKeyAdded,
  onStatusChange,
}: GitHubConnectionProps) {
  const [isConnecting, setIsConnecting]     = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isUploadingKey, setIsUploadingKey] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const providerCfg  = getProviderConfig(provider);
  const isGitHub     = provider === 'github';
  // OAuth is enabled for all providers that have a service implementation
  const hasOAuth     = provider === 'github' || provider === 'gitlab';
  const apiKey       = (provider !== 'other' ? PROVIDER_API_KEY[provider as OAuthProvider] : null);
  const manualKeyUrl = provider !== 'other' ? MANUAL_KEY_URL[provider as OAuthProvider] : null;

  // ── Helpers ────────────────────────────────────────────────────────────────

  const getProviderAPI = () => {
    if (!apiKey) return null;
    return window.electronAPI[apiKey];
  };

  const handleConnect = async () => {
    const api = getProviderAPI();
    if (!api) return;

    setIsConnecting(true);
    setMessage(null);
    try {
      const result = await api.startOAuth(profileId);
      if (result.success) {
        setMessage({ type: 'success', text: `Successfully connected to ${providerCfg.name}!` });
        onStatusChange();
      } else {
        setMessage({ type: 'error', text: result.error || `Failed to connect to ${providerCfg.name}` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'An error occurred' });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    const api = getProviderAPI();
    if (!api) return;
    if (!confirm(`Are you sure you want to disconnect your ${providerCfg.name} account?`)) return;

    setIsDisconnecting(true);
    setMessage(null);
    try {
      const result = await api.disconnectAccount(profileId);
      if (result.success) {
        setMessage({ type: 'success', text: `Disconnected from ${providerCfg.name}` });
        onStatusChange();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to disconnect' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'An error occurred' });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleUploadKey = async () => {
    const api = getProviderAPI();
    if (!api) return;

    setIsUploadingKey(true);
    setMessage(null);
    try {
      const result = await api.uploadSSHKey(profileId);
      if (result.success) {
        setMessage({ type: 'success', text: `SSH key uploaded: ${result.keyTitle || 'Success'}` });
        onStatusChange();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to upload SSH key' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'An error occurred' });
    } finally {
      setIsUploadingKey(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {/* Provider colour dot + icon */}
          {isGitHub ? (
            <Github className="w-5 h-5" />
          ) : (
            <span
              className="inline-block w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: providerCfg.color }}
            />
          )}
          {providerCfg.name} Integration
        </CardTitle>
        <CardDescription>
          {hasOAuth
            ? `Connect your ${providerCfg.name} account to automatically upload SSH keys`
            : `Add your SSH key to ${providerCfg.name} to enable push/pull for this profile`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">

        {/* ── OAuth not yet available banner ─────────────────────────────── */}
        {!hasOAuth && (
          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg border border-border">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-muted-foreground" />
            <div className="space-y-1 flex-1 min-w-0">
              <p className="font-medium text-sm">
                OAuth integration for {providerCfg.name} is coming soon
              </p>
              <p className="text-xs text-muted-foreground">
                Add your SSH key manually from your {providerCfg.name} account settings.
              </p>
            </div>
            {manualKeyUrl && (
              <Button
                variant="outline"
                size="sm"
                className="flex-shrink-0"
                onClick={() => window.open(manualKeyUrl, '_blank')}
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                Open {providerCfg.name}
              </Button>
            )}
          </div>
        )}

        {/* ── Connection status (only for OAuth-capable providers) ────────── */}
        {hasOAuth && (
          <>
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                {isConnected ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="font-medium">Connected to {providerCfg.name}</p>
                      {providerUsername && (
                        <p className="text-sm text-muted-foreground">@{providerUsername}</p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Not Connected</p>
                      <p className="text-sm text-muted-foreground">Connect to upload SSH keys</p>
                    </div>
                  </>
                )}
              </div>

              {isConnected ? (
                <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={isDisconnecting}>
                  {isDisconnecting
                    ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    : <Unlink className="w-4 h-4 mr-2" />}
                  Disconnect
                </Button>
              ) : (
                <Button variant="default" size="sm" onClick={handleConnect} disabled={isConnecting}>
                  {isConnecting
                    ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    : <LinkIcon className="w-4 h-4 mr-2" />}
                  Connect {providerCfg.name}
                </Button>
              )}
            </div>

            {/* SSH Key Upload — only when connected */}
            {isConnected && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {sshKeyAdded ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <div>
                          <p className="font-medium">SSH Key Added</p>
                          <p className="text-sm text-muted-foreground">Key is configured on {providerCfg.name}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        <div>
                          <p className="font-medium">SSH Key Not Added</p>
                          <p className="text-sm text-muted-foreground">Upload your key to {providerCfg.name}</p>
                        </div>
                      </>
                    )}
                  </div>

                  {!sshKeyAdded && (
                    <Button variant="default" size="sm" onClick={handleUploadKey} disabled={isUploadingKey}>
                      {isUploadingKey
                        ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        : <Upload className="w-4 h-4 mr-2" />}
                      Upload Key
                    </Button>
                  )}
                </div>

                {!sshKeyAdded && (
                  <p className="text-xs text-muted-foreground">
                    ℹ️ Uploading your SSH key will allow you to push/pull to repositories using this profile
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* Status Message */}
        {message && (
          <div
            className={`p-3 text-sm rounded-md ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-900 dark:text-green-100'
                : message.type === 'info'
                ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100'
                : 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-100'
            }`}
          >
            {message.text}
          </div>
        )}

      </CardContent>
    </Card>
  );
}
