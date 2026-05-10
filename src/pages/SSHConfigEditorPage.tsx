import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/animate-ui/components/buttons/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Trash2, Save, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { SSHConfigEntry } from '@/types/sshConfig';
import { v4 as uuidv4 } from 'uuid';

export function SSHConfigEditorPage() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<SSHConfigEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const result = await window.electronAPI.sshConfigEditor.read();
      if (result.entries) {
        setEntries(result.entries);
      } else if (result.error) {
        setSaveMessage({ type: 'error', text: result.error });
      }
    } catch (err) {
      setSaveMessage({ type: 'error', text: 'Failed to load SSH config' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const result = await window.electronAPI.sshConfigEditor.save(entries);
      if (result.success) {
        setSaveMessage({ type: 'success', text: 'SSH config saved successfully!' });
      } else {
        setSaveMessage({ type: 'error', text: result.error || 'Failed to save config' });
      }
    } catch (err) {
      setSaveMessage({ type: 'error', text: 'An error occurred while saving' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const handleAddEntry = () => {
    const newEntry: SSHConfigEntry = {
      id: uuidv4(),
      Host: 'new-host',
      HostName: '',
      User: '',
      Port: '',
      IdentityFile: '',
      customFields: []
    };
    setEntries([newEntry, ...entries]); // Add to top for visibility
  };

  const handleRemoveEntry = (id: string) => {
    setEntries(entries.filter(e => e.id !== id));
  };

  const updateEntry = (id: string, field: keyof SSHConfigEntry, value: string) => {
    setEntries(entries.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold">SSH Config Editor</h2>
              <p className="text-muted-foreground text-sm">
                Visual editor for your ~/.ssh/config file
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleAddEntry}>
              <Plus className="w-4 h-4 mr-2" />
              Add Host
            </Button>
            <Button onClick={handleSave} disabled={isSaving || isLoading}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </div>

        {saveMessage && (
          <div className={`p-3 rounded-md border text-sm ${
            saveMessage.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-900 dark:bg-green-900/30 dark:border-green-800 dark:text-green-100' 
              : 'bg-red-50 border-red-200 text-red-900 dark:bg-red-900/30 dark:border-red-800 dark:text-red-100'
          }`}>
            {saveMessage.text}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 border rounded-lg border-dashed">
            <p className="text-muted-foreground mb-4">No SSH config entries found.</p>
            <Button variant="outline" onClick={handleAddEntry}>
              <Plus className="w-4 h-4 mr-2" />
              Create your first Host entry
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {entries.map((entry) => (
              <div key={entry.id} className="relative p-5 border rounded-xl bg-card shadow-sm space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleRemoveEntry(entry.id)}
                  title="Remove Host"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                
                <div className="space-y-2 pt-2">
                  <Label>Host Alias</Label>
                  <Input 
                    value={entry.Host} 
                    onChange={(e) => updateEntry(entry.id, 'Host', e.target.value)}
                    placeholder="github.com-work"
                    className="font-mono"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>HostName</Label>
                  <Input 
                    value={entry.HostName} 
                    onChange={(e) => updateEntry(entry.id, 'HostName', e.target.value)}
                    placeholder="github.com"
                    className="font-mono text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>User</Label>
                    <Input 
                      value={entry.User} 
                      onChange={(e) => updateEntry(entry.id, 'User', e.target.value)}
                      placeholder="git"
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Port</Label>
                    <Input 
                      value={entry.Port} 
                      onChange={(e) => updateEntry(entry.id, 'Port', e.target.value)}
                      placeholder="22"
                      className="font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>IdentityFile</Label>
                  <Input 
                    value={entry.IdentityFile} 
                    onChange={(e) => updateEntry(entry.id, 'IdentityFile', e.target.value)}
                    placeholder="~/.ssh/id_rsa"
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
