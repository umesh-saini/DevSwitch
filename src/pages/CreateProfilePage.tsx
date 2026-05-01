import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/animate-ui/components/buttons/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SSHKeySelector } from '@/components/profiles/SSHKeySelector';
import { ProfileCustomization } from '@/components/profiles/ProfileCustomization';
import { ProviderSelector } from '@/components/profiles/ProviderSelector';
import type { CreateProfileInput, SSHKeyType, KeyAlgorithm } from '@/types/profile';
import type { GitProvider } from '@/lib/providerUtils';
import { getProviderConfig } from '@/lib/providerUtils';
import { electronService } from '@/services/electronService';
import { Loader2, ArrowLeft } from 'lucide-react';

export function CreateProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const defaultData = location.state as { email?: string; username?: string; keyPath?: string } | null;
  
  // Check if the provided keyPath is a default key (id_rsa or id_ed25519)
  const isDefaultKey = (keyPath: string) => {
    const fileName = keyPath.split('/').pop() || '';
    return fileName === 'id_rsa' || fileName === 'id_ed25519';
  };

  // Determine initial SSH key type
  const getInitialSshKeyType = (): SSHKeyType => {
    if (!defaultData?.keyPath) return 'default';
    return isDefaultKey(defaultData.keyPath) ? 'default' : 'existing';
  };
  
  const [provider, setProvider] = useState<GitProvider>('github');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(defaultData?.email || '');
  const [username, setUsername] = useState(defaultData?.username || '');
  const [sshKeyType, setSshKeyType] = useState<SSHKeyType>(getInitialSshKeyType());
  const [keyAlgorithm, setKeyAlgorithm] = useState<KeyAlgorithm>('ed25519');
  const [keyName, setKeyName] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [existingKeyPath, setExistingKeyPath] = useState(defaultData?.keyPath || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Customization
  const [avatar, setAvatar] = useState('👤');
  const [color, setColor] = useState('#3b82f6');

  const providerConfig = getProviderConfig(provider);

  useEffect(() => {
    if (defaultData?.username) {
      setName(`${defaultData.username}'s Profile`);
    }
  }, [defaultData]);

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
      const input: CreateProfileInput = {
        name,
        email,
        username,
        sshKeyType,
        provider,
      };

      if (sshKeyType === 'generated') {
        input.keyAlgorithm = keyAlgorithm;
        input.keyName = keyName;
        input.passphrase = passphrase || undefined;
      } else if (sshKeyType === 'existing') {
        input.existingKeyPath = existingKeyPath;
      }

      const createdProfile = await electronService.createProfile(input);
      
      if (avatar || color) {
        await electronService.updateProfile({
          id: createdProfile.id,
          avatar: avatar || undefined,
          color: color || undefined,
        });
      }
      
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create profile');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <h2 className="text-3xl font-bold mb-2">Create Profile</h2>
          <p className="text-muted-foreground">
            Add a new {providerConfig.name} profile with SSH key configuration
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4 bg-card border border-border rounded-lg p-6">
            {/* Provider selection — first so it informs the rest of the labels */}
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
                  Your {providerConfig.name} account username — used to build SSH clone URLs (
                  <span className="font-mono">{providerConfig.sshHost}</span>)
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
              Create Profile
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
