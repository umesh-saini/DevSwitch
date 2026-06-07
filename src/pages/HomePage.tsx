import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ProfileGrid } from '@/components/profiles/ProfileGrid';
import { DefaultProfileCard } from '@/components/profiles/DefaultProfileCard';
import { SyncProfileCard } from '@/components/profiles/SyncProfileCard';
import { DeleteProfileDialog } from '@/components/profiles/DeleteProfileDialog';
import { SyncWarningDialog } from '@/components/profiles/SyncWarningDialog';
import { ProfileSearchFilter } from '@/components/profiles/ProfileSearchFilter';
import { LayoutViewSwitcher } from '@/components/profiles/LayoutViewSwitcher';
import { Button } from '@/components/animate-ui/components/buttons/button';
import { useProfileStore } from '@/stores/profileStore';
import type { Profile } from '@/types/profile';
import { electronService } from '@/services/electronService';
import { 
  Plus, 
  Loader2, 
  RefreshCw, 
  Users, 
  ShieldCheck, 
  KeyRound, 
  CheckCircle2, 
  GitFork, 
  Terminal,
  Activity
} from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';

interface DefaultProfile {
  username: string;
  email: string;
  keyPath: string;
}

export function HomePage() {
  const navigate = useNavigate();
  const { profiles, isLoading, loadProfiles } = useProfileStore();
  const { layoutView } = useSettingsStore();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [defaultProfile, setDefaultProfile] = useState<DefaultProfile | null>(null);
  const [checkingDefault, setCheckingDefault] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncWarningOpen, setSyncWarningOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadProfiles();
    checkDefaultProfile();
  }, [loadProfiles]);

  // Filter profiles based on search query
  const filteredProfiles = useMemo(() => {
    if (!searchQuery.trim()) return profiles;
    
    const query = searchQuery.toLowerCase();
    return profiles.filter(profile => 
      profile.name.toLowerCase().includes(query) ||
      profile.email.toLowerCase().includes(query) ||
      profile.username.toLowerCase().includes(query) ||
      profile.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  }, [profiles, searchQuery]);

  // Premium Dashboard Stats Calculations
  const stats = useMemo(() => {
    const total = profiles.length;
    const configured = profiles.filter(p => p.hostConfigured).length;
    const providers = new Set(profiles.map(p => p.provider || 'github')).size;
    const keysCount = profiles.filter(p => p.keyPath).length;

    return { total, configured, providers, keysCount };
  }, [profiles]);

  const checkDefaultProfile = async () => {
    try {
      setCheckingDefault(true);
      const { config } = await electronService.getGlobalGitConfig();
      
      if (!config || Object.keys(config).length === 0) {
        setDefaultProfile(null);
        return;
      }

      const userName = config['user.name'];
      const userEmail = config['user.email'];
      

      if (!userName || !userEmail) {
        setDefaultProfile(null);
        return;
      }

      // Check if a profile with this email already exists
      const profiles = await electronService.getAllProfiles();
      const existingProfile = profiles.find(p => p.email === userEmail);

      if (existingProfile) {
        // Profile already exists, no need to show default card
        setDefaultProfile(null);
        return;
      }

      // Check for default SSH keys
      const defaultKeys = await electronService.checkDefaultSSHKeys();
      
      if (defaultKeys.length > 0) {
        // Use the first default key found
        setDefaultProfile({
          username: userName,
          email: userEmail,
          keyPath: defaultKeys[0].privatePath,
        });
      } else {
        setDefaultProfile(null);
      }
    } catch (err) {
      console.error('Failed to check default profile:', err);
      setDefaultProfile(null);
    } finally {
      setCheckingDefault(false);
    }
  };

  const handleEdit = (profile: Profile) => {
    navigate(`/${profile.id}`);
  };

  const handleDelete = (profile: Profile) => {
    setSelectedProfile(profile);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSuccess = () => {
    loadProfiles();
    checkDefaultProfile();
  };

  const handleCreateFromDefault = () => {
    if (defaultProfile) {
      // Navigate to create page with pre-filled data
      navigate('/new', { 
        state: { 
          email: defaultProfile.email,
          username: defaultProfile.username,
          keyPath: defaultProfile.keyPath,
        } 
      });
    }
  };

  const handleSyncClick = () => {
    // Show warning dialog before syncing
    setSyncWarningOpen(true);
  };

  const handleSyncConfirm = async () => {
    try {
      setIsSyncing(true);
      setSyncMessage(null);
      
      const result = await electronService.scanAndSyncProfiles();
      
      if (result.success) {
        if (result.syncedCount > 0) {
          setSyncMessage(`Successfully synced ${result.syncedCount} profile${result.syncedCount > 1 ? 's' : ''}!`);
        } else {
          setSyncMessage('No new profiles to sync. All SSH keys are already managed.');
        }
        
        // Reload profiles
        await loadProfiles();
        await checkDefaultProfile();
      } else {
        setSyncMessage(`Sync failed: ${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Sync error:', err);
      setSyncMessage('Failed to sync profiles. Please try again.');
    } finally {
      setIsSyncing(false);
      
      // Clear message after 5 seconds
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  return (
    <AppShell>
      <div className="space-y-8 animate-fade-in">
        {/* Header Block with Ambient Glowing Effect */}
        <div className="p-4 md:p-5 rounded-xl bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent border border-blue-500/10 shadow-soft relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 relative z-10">
            <span className="text-[9px] uppercase tracking-widest font-extrabold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full">
              Git Accounts Dashboard
            </span>
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
              Git Profiles
            </h2>
            <p className="text-muted-foreground/80 text-xs max-w-xl">
              Switch profiles effortlessly, configure unique SSH keys, and manage connections across multiple GitHub, GitLab, and Bitbucket hosts.
            </p>
          </div>
          
          <div className="flex items-center gap-3 relative z-10 shrink-0">
            <Button onClick={() => navigate('/new')} className="h-9 bg-primary hover:bg-primary/95 text-white active:scale-95 transition-transform duration-150 shadow-md shadow-primary/20 text-xs font-semibold px-4 rounded-lg">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Create Profile
            </Button>
          </div>
        </div>

        {/* Sync Status Banner */}
        {syncMessage && (
          <div className="p-4 text-sm bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-xl text-blue-900 dark:text-blue-200 shadow-xs flex items-center gap-2.5 animate-scale-in">
            <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
            <span className="font-semibold">{syncMessage}</span>
          </div>
        )}

        {/* Dashboard Statistics Widget */}
        {profiles.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 animate-scale-in">
            <div className="bg-card/45 backdrop-blur-md border border-border/40 p-2.5 rounded-xl flex items-center gap-3 hover:border-primary/30 transition-all duration-300">
              <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="text-base font-extrabold tracking-tight leading-none">{stats.total}</div>
                <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground mt-0.5">Total Profiles</div>
              </div>
            </div>

            <div className="bg-card/45 backdrop-blur-md border border-border/40 p-2.5 rounded-xl flex items-center gap-3 hover:border-primary/30 transition-all duration-300">
              <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-base font-extrabold tracking-tight leading-none">{stats.configured}</div>
                <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground mt-0.5">Configured Hosts</div>
              </div>
            </div>

            <div className="bg-card/45 backdrop-blur-md border border-border/40 p-2.5 rounded-xl flex items-center gap-3 hover:border-primary/30 transition-all duration-300">
              <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <div className="text-base font-extrabold tracking-tight leading-none">{stats.keysCount}</div>
                <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground mt-0.5">SSH Keys Linked</div>
              </div>
            </div>

            <div className="bg-card/45 backdrop-blur-md border border-border/40 p-2.5 rounded-xl flex items-center gap-3 hover:border-primary/30 transition-all duration-300">
              <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                <Activity className="w-4 h-4 animate-pulse-slow" />
              </div>
              <div>
                <div className="text-base font-extrabold tracking-tight leading-none">{stats.providers}</div>
                <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground mt-0.5">Linked Providers</div>
              </div>
            </div>
          </div>
        )}

        {/* Search, Filter & Layout Switcher */}
        {profiles.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-muted/20 dark:bg-muted/5 p-3 rounded-xl border border-border/40">
            <div className="flex-1 w-full">
              <ProfileSearchFilter 
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </div>
            <div className="shrink-0">
              <LayoutViewSwitcher />
            </div>
          </div>
        )}

        {/* Content View Area */}
        {isLoading || checkingDefault ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-9 h-9 animate-spin text-primary" />
            <p className="text-xs font-semibold text-muted-foreground animate-pulse">Loading secure profile vault...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Quick Actions (Empty vault state only) */}
            {profiles.length === 0 && (defaultProfile || !checkingDefault) && (
              <div className="space-y-4 animate-scale-in">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase">Recommended setup</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 max-w-4xl gap-6">
                  <SyncProfileCard onSync={handleSyncClick} isSyncing={isSyncing} />
                  {defaultProfile && (
                    <DefaultProfileCard
                      username={defaultProfile.username}
                      email={defaultProfile.email}
                      keyPath={defaultProfile.keyPath}
                      onCreateProfile={handleCreateFromDefault}
                    />
                  )}
                </div>
              </div>
            )}

            {/* List and Grids of Profiles */}
            {filteredProfiles.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <h3 className="text-sm font-extrabold tracking-wider text-muted-foreground uppercase">Registered Identities</h3>
                  </div>
                  <span className="text-[11px] font-bold text-muted-foreground">{filteredProfiles.length} of {profiles.length} items</span>
                </div>
                <ProfileGrid
                  profiles={filteredProfiles}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  layoutView={layoutView}
                /> 
              </div>
            )}

            {/* Empty matching result fallbacks */}
            {(!defaultProfile && filteredProfiles.length === 0) && (
              <div className="text-center py-20 bg-card/25 backdrop-blur-md rounded-2xl border border-dashed border-border/60 max-w-2xl mx-auto space-y-6 animate-scale-in">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <Users className="w-7 h-7 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold">No Git profiles configured</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Create your first identity containing your Git username, email, and SSH credentials to start switching hosts seamlessly.
                  </p>
                </div>
                <Button onClick={() => navigate('/new')} className="bg-primary hover:bg-primary/95 text-white shadow-md shadow-primary/10">
                  <Plus className="w-4 h-4 mr-2" />
                  Configure First Profile
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialogs & Overlays */}
      <DeleteProfileDialog
        profile={selectedProfile}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onSuccess={handleDeleteSuccess}
      />
      
      <SyncWarningDialog
        open={syncWarningOpen}
        onOpenChange={setSyncWarningOpen}
        onConfirm={handleSyncConfirm}
      />
    </AppShell>
  );
}
