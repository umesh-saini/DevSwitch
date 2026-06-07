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
import { Loader2, ArrowLeft, ShieldAlert, Sparkles, UserPlus } from 'lucide-react';

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
      <div className="max-w-3xl mx-auto space-y-6 animate-scale-in">
        {/* Navigation Action Bar */}
        <div className="flex items-center gap-4 pb-4 border-b border-border/40">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="rounded-full h-10 w-10 shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Create Profile</h2>
            <p className="text-xs text-muted-foreground">
              Add a new identity secure configuration for {providerConfig.name}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Main profile settings container */}
          <div className="space-y-5 bg-card/45 backdrop-blur-md border border-border/50 rounded-2xl p-6 shadow-soft">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase">Identity Configuration</h3>
            </div>

            {/* Provider Selection */}
            <div className="space-y-2 pt-2 border-t border-border/30">
              <Label htmlFor="provider" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Git Provider *</Label>
              <ProviderSelector value={provider} onChange={setProvider} disabled={isSubmitting} />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Choose the Git cloud provider where this profile represents your accounts.
              </p>
            </div>

            {/* Profile Friendly Name */}
            <div className="space-y-2 pt-2">
              <Label htmlFor="name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Profile Alias Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Work Profile, Side Projects"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-10 text-sm bg-background/50 border-border/80 focus:border-primary/80 transition-all duration-200"
              />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                A simple descriptive tag to select this profile in the DevSwitch dashboard.
              </p>
            </div>

            {/* Email Field */}
            <div className="space-y-2 pt-2">
              <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Git Config Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="developer@workplace.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10 text-sm bg-background/50 border-border/80 focus:border-primary/80 transition-all duration-200"
              />
            </div>

            {/* Account Username */}
            <div className="space-y-2 pt-2">
              <Label htmlFor="username" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{providerConfig.name} Username *</Label>
              <Input
                id="username"
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-10 text-sm bg-background/50 border-border/80 focus:border-primary/80 transition-all duration-200"
              />
              {providerConfig.id !== 'other' && (
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Your official user identity used for connection testing and setting up unique host rules (<span className="font-mono text-primary font-bold">{providerConfig.sshHost}</span>).
                </p>
              )}
            </div>
          </div>

          {/* SSH key configuration */}
          <div className="bg-card/45 backdrop-blur-md border border-border/50 rounded-2xl p-6 shadow-soft">
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

          {/* Profile Cosmetics */}
          <div className="bg-card/45 backdrop-blur-md border border-border/50 rounded-2xl p-6 shadow-soft">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase">Cosmetic Theme Customize</h3>
            </div>
            <ProfileCustomization
              avatar={avatar}
              color={color}
              onAvatarChange={setAvatar}
              onColorChange={setColor}
            />
          </div>

          {error && (
            <div className="p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-2.5 animate-scale-in">
              <ShieldAlert className="w-5 h-5 text-destructive shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Form Action Controls */}
          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/')}
              disabled={isSubmitting}
              className="h-10 active:scale-95 transition-transform"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="h-10 bg-primary hover:bg-primary/95 text-white active:scale-95 transition-transform">
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin text-white" />}
              Create Profile
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
