import { useEffect, useState } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/animate-ui/components/buttons/button';
import type { SSHKeyType, KeyAlgorithm, DefaultSSHKey } from '@/types/profile';
import { FolderOpen, CheckCircle2, AlertCircle } from 'lucide-react';
import { electronService } from '@/services/electronService';

interface SSHKeySelectorProps {
  value: SSHKeyType;
  onChange: (value: SSHKeyType) => void;
  keyAlgorithm?: KeyAlgorithm;
  onKeyAlgorithmChange?: (value: KeyAlgorithm) => void;
  keyName?: string;
  onKeyNameChange?: (value: string) => void;
  passphrase?: string;
  onPassphraseChange?: (value: string) => void;
  existingKeyPath?: string;
  onExistingKeyPathChange?: (value: string) => void;
  onBrowseKey?: () => void;
  username?: string;
}

export function SSHKeySelector({
  value,
  onChange,
  keyAlgorithm = 'ed25519',
  onKeyAlgorithmChange,
  keyName = '',
  onKeyNameChange,
  passphrase = '',
  onPassphraseChange,
  existingKeyPath = '',
  onExistingKeyPathChange,
  onBrowseKey,
  username = '',
}: SSHKeySelectorProps) {
  const [defaultKeys, setDefaultKeys] = useState<DefaultSSHKey[]>([]);
  const [selectedDefaultKey, setSelectedDefaultKey] = useState<DefaultSSHKey | null>(null);
  const [isCheckingKeys, setIsCheckingKeys] = useState(false);

  // Auto-populate key name when username or algorithm changes
  useEffect(() => {
    if (username && value === 'generated') {
      const defaultKeyName = keyAlgorithm === 'ed25519' 
        ? `id_ed25519_${username}` 
        : `id_rsa_${username}`;
      onKeyNameChange?.(defaultKeyName);
    }
  }, [username, keyAlgorithm, value, onKeyNameChange]);

  // Check for default SSH keys
  useEffect(() => {
    const checkKeys = async () => {
      setIsCheckingKeys(true);
      try {
        const keys = await electronService.checkDefaultSSHKeys();
        setDefaultKeys(keys);
        
        // If only one key exists, auto-select it
        if (keys.length === 1) {
          setSelectedDefaultKey(keys[0]);
          onExistingKeyPathChange?.(keys[0].privatePath);
        }
      } catch (err) {
        console.error('Failed to check default keys:', err);
      } finally {
        setIsCheckingKeys(false);
      }
    };

    if (value === 'default') {
      checkKeys();
    }
  }, [value, onExistingKeyPathChange]);

  const handleDefaultKeySelect = (key: DefaultSSHKey) => {
    setSelectedDefaultKey(key);
    onExistingKeyPathChange?.(key.privatePath);
  };

  return (
    <div className="space-y-4">
      <Label>SSH Key Configuration</Label>
      
      <RadioGroup value={value} onValueChange={(v) => onChange(v as SSHKeyType)}>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="default" id="default" />
          <Label htmlFor="default" className="font-normal cursor-pointer">
            Use default SSH key
          </Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="generated" id="generated" />
          <Label htmlFor="generated" className="font-normal cursor-pointer">
            Generate new SSH key
          </Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="existing" id="existing" />
          <Label htmlFor="existing" className="font-normal cursor-pointer">
            Select existing SSH key
          </Label>
        </div>
      </RadioGroup>

      {value === 'default' && (
        <div className="ml-6 space-y-4 p-4 border border-border rounded-lg bg-muted/30">
          {isCheckingKeys ? (
            <div className="text-sm text-muted-foreground">
              Checking for default SSH keys...
            </div>
          ) : defaultKeys.length === 0 ? (
            <div className="flex items-start gap-2 text-sm text-yellow-600 dark:text-yellow-400">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">No default SSH keys found</p>
                <p className="text-xs mt-1">
                  No id_rsa or id_ed25519 keys found in ~/.ssh directory. 
                  Consider generating a new key instead.
                </p>
              </div>
            </div>
          ) : defaultKeys.length === 1 ? (
            <div className="flex items-start gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Default key found</p>
                <p className="text-xs mt-1 text-muted-foreground">
                  Using {defaultKeys[0].algorithm.toUpperCase()} key: {defaultKeys[0].privatePath}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="font-medium">Multiple default keys found</p>
                  <p className="text-xs mt-1 text-muted-foreground">
                    Please select which key to use:
                  </p>
                </div>
              </div>
              
              <RadioGroup
                value={selectedDefaultKey?.privatePath || ''}
                onValueChange={(path) => {
                  const key = defaultKeys.find(k => k.privatePath === path);
                  if (key) handleDefaultKeySelect(key);
                }}
              >
                {defaultKeys.map((key) => (
                  <div key={key.privatePath} className="flex items-start space-x-2">
                    <RadioGroupItem value={key.privatePath} id={key.privatePath} />
                    <Label htmlFor={key.privatePath} className="font-normal cursor-pointer flex-1">
                      <div>
                        <div className="font-medium text-sm">
                          {key.algorithm.toUpperCase()} Key
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {key.privatePath}
                        </div>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}
        </div>
      )}

      {value === 'generated' && (
        <div className="ml-6 space-y-4 p-4 border border-border rounded-lg bg-muted/30">
          <div className="space-y-2">
            <Label>Key Type</Label>
            <RadioGroup
              value={keyAlgorithm}
              onValueChange={(v) => onKeyAlgorithmChange?.(v as KeyAlgorithm)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ed25519" id="ed25519" />
                <Label htmlFor="ed25519" className="font-normal cursor-pointer">
                  ED25519 (Recommended)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="rsa" id="rsa" />
                <Label htmlFor="rsa" className="font-normal cursor-pointer">
                  RSA 4096
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="keyName">Key Name</Label>
            <Input
              id="keyName"
              placeholder={
                username 
                  ? (keyAlgorithm === 'ed25519' ? `id_ed25519_${username}` : `id_rsa_${username}`)
                  : 'e.g., id_ed25519_work'
              }
              value={keyName}
              onChange={(e) => onKeyNameChange?.(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Default: {keyAlgorithm === 'ed25519' ? 'id_ed25519' : 'id_rsa'}_{username || 'username'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="passphrase">Passphrase (Optional)</Label>
            <Input
              id="passphrase"
              type="password"
              placeholder="Leave empty for no passphrase"
              value={passphrase}
              onChange={(e) => onPassphraseChange?.(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Keep empty for default (no passphrase)
            </p>
          </div>
        </div>
      )}

      {value === 'existing' && (
        <div className="ml-6 space-y-2">
          <Label htmlFor="existingKeyPath">SSH Key Path</Label>
          <div className="flex gap-2">
            <Input
              id="existingKeyPath"
              placeholder="Path to private key file"
              value={existingKeyPath}
              onChange={(e) => onExistingKeyPathChange?.(e.target.value)}
              readOnly
            />
            <Button
              type="button"
              variant="outline"
              onClick={onBrowseKey}
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              Browse
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
