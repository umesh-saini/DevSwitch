import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/animate-ui/components/buttons/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DeleteProfileDialog } from '@/components/profiles/DeleteProfileDialog';
import { SSHConnectionTester } from '@/components/profiles/SSHConnectionTester';
import { GitHubConnection } from '@/components/profiles/GitHubConnection';
import { CloneProjectDialog } from '@/components/profiles/CloneProjectDialog';
import { UpdateProjectDialog } from '@/components/profiles/UpdateProjectDialog';
import type { Profile } from '@/types/profile';
import { getProviderConfig, parseGitUrl, type GitProvider } from '@/lib/providerUtils';
import { electronService } from '@/services/electronService';
import { 
  Loader2, 
  ArrowLeft, 
  Copy, 
  Check, 
  User, 
  Mail, 
  Key, 
  CheckCircle2,
  AlertCircle,
  Edit,
  Trash2,
  Terminal,
  GitBranch,
  GitFork,
  RefreshCcw
} from 'lucide-react';

export function ProfileViewPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sshPublicKey, setSshPublicKey] = useState<string>('');
  const [gitUrl, setGitUrl] = useState('');
  const [hostAlias, setHostAlias] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (!id) {
        navigate('/');
        return;
      }

      try {
        const loadedProfile = await electronService.getProfileById(id);
        if (!loadedProfile) {
          setError('Profile not found');
          setTimeout(() => navigate('/'), 2000);
          return;
        }

        setProfile(loadedProfile);

        const providerCfg = getProviderConfig((loadedProfile.provider as GitProvider) || 'github');
        
        // Get the SSH config host alias, fall back to the provider's canonical host
        if (loadedProfile.keyPath) {
          try {
            const aliasResult = await electronService.getHostAliasForKey(loadedProfile.keyPath);
            setHostAlias(aliasResult.hostAlias || providerCfg.sshHost);
          } catch {
            setHostAlias(providerCfg.sshHost);
          }

          try {
            const result = await electronService.getSSHPublicKey(loadedProfile.keyPath);
            if (result.content) {
              setSshPublicKey(result.content);
            }
          } catch (err) {
            console.error('Failed to load SSH public key:', err);
          }
        } else {
          setHostAlias(providerCfg.sshHost);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [id, navigate]);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleGitHubStatusChange = async () => {
    if (!id) return;
    try {
      const updatedProfile = await electronService.getProfileById(id);
      if (updatedProfile) {
        setProfile(updatedProfile);
      }
    } catch (err) {
      console.error('Failed to reload profile:', err);
    }
  };

  const generateGitCommands = () => {
    if (!profile || !gitUrl || !hostAlias) return null;
    const parsed = parseGitUrl(gitUrl);
    if (!parsed) return null;

    const providerCfg = getProviderConfig((profile.provider as GitProvider) || 'github');
    const { owner, repo } = parsed;

    return {
      clone: providerCfg.buildSshUrl(hostAlias, owner, repo),
      remoteSetUrl: `git remote set-url origin ${providerCfg.buildSshUrl(hostAlias, owner, repo)}`,
      sshTest: `ssh -T ${providerCfg.sshUser}@${hostAlias}`,
    };
  };

  const gitCommands = generateGitCommands();

  const handleDeleteSuccess = () => {
    navigate('/');
  };

  const CopyButton = ({ text, field }: { text: string; field: string }) => (
    <Button
      variant="outline"
      size="sm"
      onClick={() => copyToClipboard(text, field)}
      className="flex-shrink-0"
    >
      {copiedField === field ? (
        <Check className="w-4 h-4 text-green-600" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </Button>
  );

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (!profile) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto text-center py-16">
          <h2 className="text-2xl font-bold mb-2">Profile Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The profile you're looking for doesn't exist.
          </p>
          <Button onClick={() => navigate('/')}>
            Back to Profiles
          </Button>
        </div>
      </AppShell>
    );
  }

  const providerCfg = getProviderConfig((profile.provider as GitProvider) || 'github');
  // isGitHub kept for any future GitHub-specific UI if needed
  const _isGitHub = providerCfg.id === 'github'; void _isGitHub;
  const profileUrl = providerCfg.buildProfileUrl(profile.username);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Profiles
            </Button>
            <h2 className="text-3xl font-bold mb-2">{profile.name}</h2>
            <div className="flex items-center gap-3">
              {/* Provider badge */}
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: providerCfg.color }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
                {providerCfg.name}
              </span>

              {profile.hostConfigured ? (
                <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>SSH Configured</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm font-medium text-yellow-600 dark:text-yellow-400">
                  <AlertCircle className="w-4 h-4" />
                  <span>Not Configured</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(`/${profile.id}`)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(true)}
              className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Git Project Actions */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Git Project Actions</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Clone a new repository or update an existing project with this profile's configuration
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setCloneDialogOpen(true)} variant="default">
              <GitFork className="w-4 h-4 mr-2" />
              Clone Project
            </Button>
            <Button onClick={() => setUpdateDialogOpen(true)} variant="outline">
              <RefreshCcw className="w-4 h-4 mr-2" />
              Update Project Config
            </Button>
          </div>
        </div>

        {/* Profile Details */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold mb-4">Profile Details</h3>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <Label className="text-xs text-muted-foreground">{providerCfg.name} Username</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm font-mono bg-muted px-2 py-1 rounded flex-1 truncate">
                    {profile.username}
                  </code>
                  <CopyButton text={profile.username} field="username" />
                </div>
                {profileUrl && (
                  <a
                    href={profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline mt-1 inline-block"
                  >
                    View {providerCfg.name} Profile →
                  </a>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <Label className="text-xs text-muted-foreground">Email</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm font-mono bg-muted px-2 py-1 rounded flex-1 truncate">
                    {profile.email}
                  </code>
                  <CopyButton text={profile.email} field="email" />
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Key className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
              <div className="flex-1 min-w-0">
                <Label className="text-xs text-muted-foreground">SSH Key Type</Label>
                <div className="mt-1">
                  <span className="text-sm font-medium">
                    {profile.sshKeyType === 'default' && 'Default Key'}
                    {profile.sshKeyType === 'generated' && (profile.keyAlgorithm === 'ed25519' ? 'ED25519' : 'RSA 4096')}
                    {profile.sshKeyType === 'existing' && 'Custom Key'}
                  </span>
                  {profile.keyPath && (
                    <div className="text-xs text-muted-foreground mt-1 break-all">
                      {profile.keyPath}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SSH host alias info */}
            {hostAlias && (
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 flex items-center justify-center text-muted-foreground flex-shrink-0 mt-0.5 text-xs font-bold">
                  @
                </span>
                <div className="flex-1 min-w-0">
                  <Label className="text-xs text-muted-foreground">SSH Host</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm font-mono bg-muted px-2 py-1 rounded flex-1 truncate">
                      {hostAlias}
                    </code>
                    <CopyButton text={hostAlias} field="hostAlias" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Canonical host: <span className="font-mono">{providerCfg.sshHost}</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Provider Integration — shown for all providers except 'other' */}
        {profile.provider !== 'other' && (
          <GitHubConnection
            profileId={profile.id}
            provider={profile.provider || 'github'}
            isConnected={profile.providerMeta?.connected ?? profile.githubConnected ?? false}
            providerUsername={profile.providerMeta?.username ?? profile.githubUsername}
            sshKeyAdded={profile.providerMeta?.sshKeyAdded ?? profile.sshKeyAddedToGithub ?? false}
            onStatusChange={handleGitHubStatusChange}
          />
        )}

        {/* SSH Connection Tester */}
        <div className="bg-card border border-border rounded-lg p-6">
          <SSHConnectionTester
            username={profile.username}
            provider={providerCfg.id}
            hostAlias={hostAlias || providerCfg.sshHost}
          />
        </div>

        {/* SSH Public Key */}
        {sshPublicKey && (
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">SSH Public Key</h3>
              <CopyButton text={sshPublicKey} field="sshKey" />
            </div>
            <div className="bg-muted p-3 rounded font-mono text-xs break-all">
              {sshPublicKey}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Copy this key and add it to your {providerCfg.name} account SSH settings
            </p>
          </div>
        )}

        {/* Git Config Commands */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            Git Config Commands
          </h3>
          
          <p className="text-sm text-muted-foreground">
            Use these commands to configure Git for this profile in your repository
          </p>

          <div className="space-y-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Set Git Username</Label>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono bg-muted px-3 py-2 rounded flex-1 break-all border border-border">
                  git config user.name "{profile.username}"
                </code>
                <CopyButton text={`git config user.name "${profile.username}"`} field="configName" />
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Set Git Email</Label>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono bg-muted px-3 py-2 rounded flex-1 break-all border border-border">
                  git config user.email "{profile.email}"
                </code>
                <CopyButton text={`git config user.email "${profile.email}"`} field="configEmail" />
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">View Current Config</Label>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono bg-muted px-3 py-2 rounded flex-1 break-all border border-border">
                  git config --local --list
                </code>
                <CopyButton text="git config --local --list" field="configList" />
              </div>
            </div>
          </div>
        </div>

        {/* Repository-Specific Git Commands */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Repository Commands
          </h3>
          
          <div className="space-y-2">
            <Label htmlFor="gitUrl">Repository URL (SSH or HTTPS)</Label>
            <Input
              id="gitUrl"
              placeholder={`git@${providerCfg.sshHost}:username/repo.git or https://${providerCfg.sshHost}/username/repo.git`}
              value={gitUrl}
              onChange={(e) => setGitUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Enter a repository URL to generate clone, remote, and SSH test commands
            </p>
          </div>

          {gitCommands && (
            <div className="space-y-3 pt-4 border-t">
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Clone Repository</Label>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono bg-muted px-3 py-2 rounded flex-1 break-all border border-border">
                      git clone {gitCommands.clone}
                    </code>
                    <CopyButton text={`git clone ${gitCommands.clone}`} field="clone" />
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Set Remote URL</Label>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono bg-muted px-3 py-2 rounded flex-1 break-all border border-border">
                      {gitCommands.remoteSetUrl}
                    </code>
                    <CopyButton text={gitCommands.remoteSetUrl} field="remoteSetUrl" />
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Test SSH Connection</Label>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono bg-muted px-3 py-2 rounded flex-1 break-all border border-border">
                      {gitCommands.sshTest}
                    </code>
                    <CopyButton text={gitCommands.sshTest} field="sshTest" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive rounded-md">
            {error}
          </div>
        )}
      </div>

      <DeleteProfileDialog
        profile={profile}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onSuccess={handleDeleteSuccess}
      />

      <CloneProjectDialog
        open={cloneDialogOpen}
        onOpenChange={setCloneDialogOpen}
        username={profile.username}
        email={profile.email}
        hostAlias={hostAlias || providerCfg.sshHost}
        provider={providerCfg.id}
      />

      <UpdateProjectDialog
        open={updateDialogOpen}
        onOpenChange={setUpdateDialogOpen}
        username={profile.username}
        email={profile.email}
        hostAlias={hostAlias || providerCfg.sshHost}
        provider={providerCfg.id}
      />
    </AppShell>
  );
}
