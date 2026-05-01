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
import { Plus, Loader2, RefreshCw } from 'lucide-react';
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
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">Git Profiles</h2>
              <p className="text-muted-foreground">
                Manage your GitHub, GitLab, Bitbucket and other accounts with SSH keys
              </p>
            </div>
            <div className="flex items-center gap-2">
              {profiles.length > 0 && (
                <Button onClick={handleSyncClick} disabled={isSyncing} variant="outline">
                  {isSyncing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  {isSyncing ? 'Syncing...' : 'Sync'}
                </Button>
              )}
              <Button onClick={() => navigate('/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Create Profile
              </Button>
            </div>
          </div>

          {/* Search and View Options */}
          {profiles.length > 0 && (
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <ProfileSearchFilter 
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                />
              </div>
              <LayoutViewSwitcher />
            </div>
          )}
        </div>

        {/* Sync Message */}
        {syncMessage && (
          <div className="p-3 text-sm bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md text-blue-900 dark:text-blue-100">
            {syncMessage}
          </div>
        )}

        {/* Content */}
        {isLoading || checkingDefault ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Quick Actions - Only show when no profiles exist */}
            {profiles.length === 0 && (defaultProfile || !checkingDefault) && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
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

            {/* User Profiles */}
            {filteredProfiles.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Your Profiles</h3>
                <ProfileGrid
                  profiles={filteredProfiles}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  layoutView={layoutView}
                />
              </div>
            )}

            {(!defaultProfile && filteredProfiles.length === 0) && (
              <div className="text-center py-16">
                <p className="text-muted-foreground mb-4">
                  No profiles found. Create your first GitHub profile to get started.
                </p>
                <Button onClick={() => navigate('/new')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Profile
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
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
