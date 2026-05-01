import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/animate-ui/components/buttons/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SSHKeySelector } from '@/components/profiles/SSHKeySelector';
import { ProfileCustomization } from '@/components/profiles/ProfileCustomization';
import { ProviderSelector } from '@/components/profiles/ProviderSelector';
import type { UpdateProfileInput, SSHKeyType, KeyAlgorithm, Profile } from '@/types/profile';
import type { GitProvider } from '@/lib/providerUtils';
import { getProviderConfig } from '@/lib/providerUtils';
import { electronService } from '@/services/electronService';
import { Loader2, ArrowLeft } from 'lucide-react';

export function EditProfilePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [provider, setProvider] = useState<GitProvider>('github');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [sshKeyType, setSshKeyType] = useState<SSHKeyType>('default');
  const [keyAlgorithm, setKeyAlgorithm] = useState<KeyAlgorithm>('ed25519');
  const [keyName, setKeyName] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [existingKeyPath, setExistingKeyPath] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Customization
  const [avatar, setAvatar] = useState<string>('');
  const [color, setColor] = useState<string>('#3b82f6');

  const providerConfig = getProviderConfig(provider);

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
        setProvider((loadedProfile.provider as GitProvider) || 'github');
        setName(loadedProfile.name);
        setEmail(loadedProfile.email);
        setUsername(loadedProfile.username);
        setSshKeyType(loadedProfile.sshKeyType);
        if (loadedProfile.keyAlgorithm) {
          setKeyAlgorithm(loadedProfile.keyAlgorithm);
        }
        if (loadedProfile.keyPath) {
          setExistingKeyPath(loadedProfile.keyPath);
        }
        setAvatar(loadedProfile.avatar || '');
        setColor(loadedProfile.color || '#3b82f6');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [id, navigate]);

  const handleBrowseKey = async () => {
    try {
      const result = await electronService.selectExistingKey();
      if (result?.filePath) {
        setExistingKeyPath(result.filePath);
      }
    } catch (err) {
      console.error('Failed to select key:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!id) return;

    if (!name || !email || !username) {
      setError('Name, email, and username are required');
      return;
    }

    if (sshKeyType === 'generated' && !keyName) {
      setError('Key name is required when generating a new key');
      return;
    }

    if (sshKeyType === 'existing' && !existingKeyPath) {
      setError('Please select an existing key file');
      return;
    }

    setIsSubmitting(true);

    try {
      const input: UpdateProfileInput = {
        id,
        name,
        email,
        username,
        sshKeyType,
        provider,
        avatar: avatar || undefined,
        color: color || undefined,
      };

      if (sshKeyType === 'generated') {
        input.keyAlgorithm = keyAlgorithm;
        input.keyName = keyName;
        input.passphrase = passphrase || undefined;
      } else if (sshKeyType === 'existing') {
        input.existingKeyPath = existingKeyPath;
      }

      await electronService.updateProfile(input);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Profiles
          </Button>
          <h2 className="text-3xl font-bold mb-2">Edit {providerConfig.name} Profile</h2>
          <p className="text-muted-foreground">
            Update your {providerConfig.name} profile configuration
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4 bg-card border border-border rounded-lg p-6">
            <div className="space-y-2">
              <Label htmlFor="provider">Git Provider *</Label>
              <ProviderSelector value={provider} onChange={setProvider} disabled={isSubmitting} />
              <p className="text-xs text-muted-foreground">
                Select the platform that hosts your repositories
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Profile Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Work Account, Personal, Client Project"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                A friendly name to identify this profile
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">{providerConfig.name} Username *</Label>
              <Input
                id="username"
                placeholder={`${providerConfig.name.toLowerCase()}-username`}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              {providerConfig.id !== 'other' && (
                <p className="text-xs text-muted-foreground">
                  Your {providerConfig.name} account username — SSH host:{' '}
                  <span className="font-mono">{providerConfig.sshHost}</span>
                </p>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <SSHKeySelector
              value={sshKeyType}
              onChange={setSshKeyType}
              keyAlgorithm={keyAlgorithm}
              onKeyAlgorithmChange={setKeyAlgorithm}
              keyName={keyName}
              onKeyNameChange={setKeyName}
              passphrase={passphrase}
              onPassphraseChange={setPassphrase}
              existingKeyPath={existingKeyPath}
              onExistingKeyPathChange={setExistingKeyPath}
              onBrowseKey={handleBrowseKey}
              username={username}
            />
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <ProfileCustomization
              avatar={avatar}
              color={color}
              onAvatarChange={setAvatar}
              onColorChange={setColor}
            />
          </div>

          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive rounded-md">
              {error}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/')}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
