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
  RefreshCcw,
  Globe,
  Lock
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
      className="flex-shrink-0 h-8 w-8 p-0 border-border/40 hover:bg-background/80 active:scale-90 transition-transform duration-150"
    >
      {copiedField === field ? (
        <Check className="w-3.5 h-3.5 text-green-500 animate-scale-in" />
      ) : (
        <Copy className="w-3.5 h-3.5 opacity-70" />
      )}
    </Button>
  );

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-9 h-9 animate-spin text-primary" />
          <p className="text-xs font-semibold text-muted-foreground animate-pulse">Retrieving security profile...</p>
        </div>
      </AppShell>
    );
  }

  if (!profile) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto text-center py-20 space-y-4">
          <h2 className="text-2xl font-bold">Profile Not Found</h2>
          <p className="text-muted-foreground text-sm">
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
  const profileUrl = providerCfg.buildProfileUrl(profile.username);

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6 animate-scale-in">
        {/* Navigation Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/40">
          <div className="space-y-1">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="h-8 text-xs text-muted-foreground hover:text-foreground pl-0 group"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5 group-hover:-translate-x-0.5 transition-transform" />
              Back to dashboard
            </Button>
            
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-extrabold tracking-tight">{profile.name}</h2>
              <span
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider text-white"
                style={{ backgroundColor: providerCfg.color }}
              >
                {providerCfg.name}
              </span>

              {profile.hostConfigured ? (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  SSH Active
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Not Configured
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(`/${profile.id}`)}
              className="h-9 hover:bg-background/80"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(true)}
              className="h-9 border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Double Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Details & Connections (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Profile Info Card */}
            <div className="bg-card/45 backdrop-blur-md border border-border/50 rounded-2xl p-5 space-y-5 shadow-soft">
              <div className="flex items-center gap-2">
                <span className="w-1 h-3 rounded-full bg-primary" />
                <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase">Identity Details</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-muted rounded-lg shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Username</div>
                    <div className="font-semibold text-sm truncate mt-0.5">{profile.username}</div>
                    {profileUrl && (
                      <a
                        href={profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1 font-semibold"
                      >
                        <Globe className="w-3 h-3" />
                        View Account Profile
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-muted rounded-lg shrink-0 mt-0.5">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Email Address</div>
                    <div className="font-semibold text-sm truncate mt-0.5">{profile.email}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-muted rounded-lg shrink-0 mt-0.5">
                    <Key className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">SSH Credential Type</div>
                    <div className="font-semibold text-sm mt-0.5">
                      {profile.sshKeyType === 'default' && 'Default Key'}
                      {profile.sshKeyType === 'generated' && (profile.keyAlgorithm === 'ed25519' ? 'ED25519 Elliptic' : 'RSA 4096 Secure')}
                      {profile.sshKeyType === 'existing' && 'Custom Imported Key'}
                    </div>
                    {profile.keyPath && (
                      <div className="text-[11px] text-muted-foreground mt-1 break-all bg-muted/30 p-1.5 rounded font-mono">
                        {profile.keyPath}
                      </div>
                    )}
                  </div>
                </div>

                {hostAlias && (
                  <div className="flex items-start gap-3 border-t border-border/30 pt-3">
                    <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0 mt-0.5">
                      <Terminal className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">SSH Host Alias</div>
                      <code className="text-xs font-mono font-bold text-primary mt-1 block">
                        {hostAlias}
                      </code>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Provider Connections Box */}
            {profile.provider !== 'other' && (
              <div className="bg-card/45 backdrop-blur-md border border-border/50 rounded-2xl p-1 shadow-soft">
                <GitHubConnection
                  profileId={profile.id}
                  provider={profile.provider || 'github'}
                  isConnected={profile.providerMeta?.connected ?? profile.githubConnected ?? false}
                  providerUsername={profile.providerMeta?.username ?? profile.githubUsername}
                  sshKeyAdded={profile.providerMeta?.sshKeyAdded ?? profile.sshKeyAddedToGithub ?? false}
                  onStatusChange={handleGitHubStatusChange}
                />
              </div>
            )}

            {/* SSH Testing panel */}
            <div className="bg-card/45 backdrop-blur-md border border-border/50 rounded-2xl p-5 shadow-soft">
              <SSHConnectionTester
                username={profile.username}
                provider={providerCfg.id}
                hostAlias={hostAlias || providerCfg.sshHost}
              />
            </div>
          </div>

          {/* Right Column: Git Project Controls & Terminals (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Git project setup panel */}
            <div className="bg-gradient-to-r from-primary/10 to-indigo-500/5 border border-primary/20 rounded-2xl p-6 space-y-4 shadow-soft">
              <div className="flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-primary" />
                <h3 className="text-base font-extrabold">Git Project Integrations</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connect the current repository or a new workstation to this active profile seamlessly. You can clone directly or update config properties.
              </p>
              <div className="flex items-center gap-2.5 flex-wrap pt-1">
                <Button onClick={() => setCloneDialogOpen(true)} variant="default" className="bg-primary hover:bg-primary/95 shadow-md shadow-primary/15">
                  <GitFork className="w-4 h-4 mr-2" />
                  Clone Repository
                </Button>
                <Button onClick={() => setUpdateDialogOpen(true)} variant="outline">
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  Update Project Config
                </Button>
              </div>
            </div>

            {/* Glowing SSH Public Key box */}
            {sshPublicKey && (
              <div className="bg-card/45 backdrop-blur-md border border-border/50 rounded-2xl p-6 space-y-4 shadow-soft">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase">SSH Public Key</h3>
                  </div>
                  <CopyButton text={sshPublicKey} field="sshKey" />
                </div>
                <div className="bg-neutral-950 dark:bg-black p-4 rounded-xl border border-neutral-800 text-neutral-200 dark:text-neutral-300 font-mono text-xs break-all leading-relaxed shadow-inner max-h-[140px] overflow-y-auto custom-scrollbar select-all">
                  {sshPublicKey}
                </div>
                <p className="text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/30">
                  ⚠️ Note: Add this key inside your {providerCfg.name} account SSH dashboard to validate authentication requests.
                </p>
              </div>
            )}

            {/* High-Fidelity Terminal Console Mockups */}
            <div className="bg-neutral-950 rounded-2xl border border-neutral-800 p-6 space-y-5 shadow-xl select-text">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="text-[11px] font-bold font-mono text-neutral-500">git_config_helper.sh</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">BASH</span>
              </div>

              <div className="space-y-4 font-mono text-xs leading-relaxed text-neutral-300">
                <div className="space-y-1">
                  <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Set user name globally/locally:</div>
                  <div className="flex items-center justify-between gap-3 bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800/80">
                    <code className="text-emerald-400 select-all font-mono truncate">git config user.name "{profile.username}"</code>
                    <CopyButton text={`git config user.name "${profile.username}"`} field="cmdUser" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Set user email address:</div>
                  <div className="flex items-center justify-between gap-3 bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800/80">
                    <code className="text-emerald-400 select-all font-mono truncate">git config user.email "{profile.email}"</code>
                    <CopyButton text={`git config user.email "${profile.email}"`} field="cmdEmail" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Verify active configurations:</div>
                  <div className="flex items-center justify-between gap-3 bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800/80">
                    <code className="text-emerald-400 select-all font-mono truncate">git config --local --list</code>
                    <CopyButton text="git config --local --list" field="cmdList" />
                  </div>
                </div>
              </div>
            </div>

            {/* Repository specific dynamically populated helpers */}
            <div className="bg-card/45 backdrop-blur-md border border-border/50 rounded-2xl p-6 space-y-4 shadow-soft">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase">Repository Dynamic Commands</h3>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="gitUrl" className="text-xs">Repository URL (SSH or HTTPS)</Label>
                <Input
                  id="gitUrl"
                  placeholder={`e.g., git@${providerCfg.sshHost}:username/repo.git`}
                  value={gitUrl}
                  onChange={(e) => setGitUrl(e.target.value)}
                  className="h-10 text-sm bg-background/50 border-border/80 focus:border-primary/80"
                />
              </div>

              {gitCommands && (
                <div className="space-y-3 pt-3 border-t border-border/30 animate-scale-in">
                  <div className="space-y-3 font-mono text-xs">
                    <div className="space-y-1">
                      <div className="text-[10px] text-muted-foreground font-bold uppercase">Clone target repo:</div>
                      <div className="flex items-center justify-between bg-muted/40 p-2 rounded-lg border border-border/40 gap-3">
                        <code className="text-primary truncate select-all">git clone {gitCommands.clone}</code>
                        <CopyButton text={`git clone ${gitCommands.clone}`} field="clone" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[10px] text-muted-foreground font-bold uppercase">Update remote origin:</div>
                      <div className="flex items-center justify-between bg-muted/40 p-2 rounded-lg border border-border/40 gap-3">
                        <code className="text-primary truncate select-all">{gitCommands.remoteSetUrl}</code>
                        <CopyButton text={gitCommands.remoteSetUrl} field="remoteSetUrl" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[10px] text-muted-foreground font-bold uppercase">Direct connection dry run:</div>
                      <div className="flex items-center justify-between bg-muted/40 p-2 rounded-lg border border-border/40 gap-3">
                        <code className="text-primary truncate select-all">{gitCommands.sshTest}</code>
                        <CopyButton text={gitCommands.sshTest} field="sshTest" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
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
