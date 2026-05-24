import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/animate-ui/components/buttons/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSettingsStore, type LayoutView } from '@/stores/settingsStore';
import { useTheme } from 'next-themes';
import { 
  ArrowLeft, 
  LayoutGrid, 
  List, 
  Menu, 
  Sun, 
  Moon, 
  Laptop, 
  ShieldCheck, 
  ShieldAlert,
  ScrollText, 
  ChevronRight,
  Info,
  Github,
  Plus,
  Trash2,
  Save,
  Loader2,
  FileText,
  Settings as SettingsIcon
} from 'lucide-react';
import type { SSHConfigEntry } from '@/types/sshConfig';
import { v4 as uuidv4 } from 'uuid';

export function SettingsPage() {
  const navigate = useNavigate();
  const { layoutView, setLayoutView } = useSettingsStore();
  const { theme, setTheme } = useTheme();
  
  const [permissions, setPermissions] = useState<any>(null);
  const [checkingPerms, setCheckingPerms] = useState(false);
  const [logCount, setLogCount] = useState(0);

  // Tab State: 'general' or 'ssh'
  const [activeTab, setActiveTab] = useState<'general' | 'ssh'>('general');

  // SSH Config State
  const [entries, setEntries] = useState<SSHConfigEntry[]>([]);
  const [isLoadingSSH, setIsLoadingSSH] = useState(true);
  const [isSavingSSH, setIsSavingSSH] = useState(false);
  const [sshMessage, setSshMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    checkPermissions();
    fetchLogCount();
  }, []);

  useEffect(() => {
    if (activeTab === 'ssh') {
      loadConfig();
    }
  }, [activeTab]);

  const checkPermissions = async () => {
    if (window.electronAPI?.permissions) {
      setCheckingPerms(true);
      try {
        const status = await window.electronAPI.permissions.check();
        setPermissions(status);
      } catch (err) {
        console.error('Failed to check permissions:', err);
      } finally {
        setCheckingPerms(false);
      }
    }
  };

  const fetchLogCount = async () => {
    if (window.electronAPI?.log) {
      try {
        const logs = await window.electronAPI.log.getAll();
        setLogCount(logs.length);
      } catch (err) {
        console.error('Failed to fetch logs:', err);
      }
    }
  };

  const loadConfig = async () => {
    setIsLoadingSSH(true);
    setSshMessage(null);
    try {
      const result = await window.electronAPI.sshConfigEditor.read();
      if (result.entries) {
        setEntries(result.entries);
      } else if (result.error) {
        setSshMessage({ type: 'error', text: result.error });
      }
    } catch (err) {
      setSshMessage({ type: 'error', text: 'Failed to load SSH config' });
    } finally {
      setIsLoadingSSH(false);
    }
  };

  const handleSave = async () => {
    setIsSavingSSH(true);
    setSshMessage(null);
    try {
      const result = await window.electronAPI.sshConfigEditor.save(entries);
      if (result.success) {
        setSshMessage({ type: 'success', text: 'SSH config saved successfully!' });
      } else {
        setSshMessage({ type: 'error', text: result.error || 'Failed to save config' });
      }
    } catch (err) {
      setSshMessage({ type: 'error', text: 'An error occurred while saving' });
    } finally {
      setIsSavingSSH(false);
      setTimeout(() => setSshMessage(null), 3000);
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
    setEntries([newEntry, ...entries]);
  };

  const handleRemoveEntry = (id: string) => {
    setEntries(entries.filter(e => e.id !== id));
  };

  const updateEntry = (id: string, field: keyof SSHConfigEntry, value: string) => {
    setEntries(entries.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const isSSHMode = activeTab === 'ssh';

  return (
    <AppShell>
      <div className={`${isSSHMode ? 'max-w-5xl' : 'max-w-3xl'} mx-auto space-y-6 transition-all duration-300`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/')}
              className="rounded-full h-10 w-10 shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
              <p className="text-muted-foreground text-sm">
                Configure DevSwitch preferences and system integrations
              </p>
            </div>
          </div>

          {isSSHMode && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <Button variant="outline" size="sm" onClick={handleAddEntry}>
                <Plus className="w-4 h-4 mr-2" />
                Add Host
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSavingSSH || isLoadingSSH}>
                {isSavingSSH ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
            </div>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-border pb-px gap-2">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium text-sm transition-all -mb-[2px] ${
              activeTab === 'general'
                ? 'border-primary text-foreground font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
            General Preferences
          </button>
          <button
            onClick={() => setActiveTab('ssh')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium text-sm transition-all -mb-[2px] ${
              activeTab === 'ssh'
                ? 'border-primary text-foreground font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <FileText className="w-4 h-4" />
            SSH Config Editor
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'general' ? (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Interface Preferences */}
            <Card className="border border-border bg-card/50 backdrop-blur-xs">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span>Interface Preferences</span>
                </CardTitle>
                <CardDescription>
                  Customize how DevSwitch looks and displays your profiles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Theme Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-semibold">Theme Mode</h4>
                    <p className="text-xs text-muted-foreground">Select your preferred app appearance</p>
                  </div>
                  <div className="flex bg-muted p-1 rounded-lg self-start sm:self-auto">
                    <button
                      onClick={() => setTheme('light')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        theme === 'light' 
                          ? 'bg-background shadow-xs text-foreground' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5" />
                      Light
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        theme === 'dark' 
                          ? 'bg-background shadow-xs text-foreground' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5" />
                      Dark
                    </button>
                    <button
                      onClick={() => setTheme('system')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        theme === 'system' 
                          ? 'bg-background shadow-xs text-foreground' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Laptop className="w-3.5 h-3.5" />
                      System
                    </button>
                  </div>
                </div>

                {/* Layout View Preference */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t">
                  <div>
                    <h4 className="text-sm font-semibold">Default Layout</h4>
                    <p className="text-xs text-muted-foreground">Choose your default profile listing view</p>
                  </div>
                  <div className="flex bg-muted p-1 rounded-lg self-start sm:self-auto">
                    <button
                      onClick={() => setLayoutView('grid')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        layoutView === 'grid' 
                          ? 'bg-background shadow-xs text-foreground' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      Grid
                    </button>
                    <button
                      onClick={() => setLayoutView('list')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        layoutView === 'list' 
                          ? 'bg-background shadow-xs text-foreground' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <List className="w-3.5 h-3.5" />
                      List
                    </button>
                    <button
                      onClick={() => setLayoutView('compact')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        layoutView === 'compact' 
                          ? 'bg-background shadow-xs text-foreground' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Menu className="w-3.5 h-3.5" />
                      Compact
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System & Security */}
            <Card className="border border-border bg-card/50 backdrop-blur-xs">
              <CardHeader>
                <CardTitle className="text-lg">System & Security</CardTitle>
                <CardDescription>
                  Verify system permissions and account integration integrity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* SSH Permissions Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold">SSH Directory Permissions</h4>
                    <p className="text-xs text-muted-foreground">
                      Required to generate, read and write SSH keys
                    </p>
                    {permissions && (
                      <div className="flex items-center gap-1.5 pt-1 text-xs">
                        {permissions.granted ? (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                            <ShieldCheck className="w-4 h-4" /> Granted
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                            <ShieldAlert className="w-4 h-4" /> Action Required (Status: {permissions.status})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={checkPermissions}
                    disabled={checkingPerms}
                    className="self-start sm:self-auto"
                  >
                    {checkingPerms ? 'Checking...' : 'Re-check'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Activity Log Navigation Card */}
            <button
              onClick={() => navigate('/setting/active-log')}
              className="w-full text-left focus:outline-hidden group"
            >
              <Card className="border border-border bg-card/50 hover:bg-muted/30 backdrop-blur-xs transition-all duration-200">
                <CardContent className="flex items-center justify-between p-6">
                  <div className="flex gap-4 items-center">
                    <div className="p-3 bg-primary/10 text-primary rounded-xl group-hover:scale-105 transition-transform duration-200">
                      <ScrollText className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <span>Activity Log</span>
                        {logCount > 0 && (
                          <span className="bg-primary/15 text-primary text-xs px-2 py-0.5 rounded-full font-medium">
                            {logCount} logs
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        View recent profiles switches, SSH key generation, and configurations updates.
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </CardContent>
              </Card>
            </button>

            {/* About Card */}
            <Card className="border border-border bg-card/50 backdrop-blur-xs">
              <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex gap-4">
                  <div className="p-3 bg-muted rounded-xl">
                    <Info className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">DevSwitch</h4>
                    <p className="text-xs text-muted-foreground">Version 1.0.0 (Beta)</p>
                    <p className="text-xs text-muted-foreground pt-1">
                      Made as an open-source tool for professional developer profiles switching.
                    </p>
                  </div>
                </div>
                <a 
                  href="https://github.com/umesh-saini/DevSwitch" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors self-start sm:self-auto border border-border px-3 py-1.5 rounded-md hover:bg-muted/50"
                >
                  <Github className="w-4 h-4" />
                  Repository
                </a>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-200">
            {sshMessage && (
              <div className={`p-3 rounded-md border text-sm animate-in fade-in duration-255 ${
                sshMessage.type === 'success' 
                  ? 'bg-green-50 border-green-200 text-green-900 dark:bg-green-900/30 dark:border-green-800 dark:text-green-100' 
                  : 'bg-red-50 border-red-200 text-red-900 dark:bg-red-900/30 dark:border-red-800 dark:text-red-100'
              }`}>
                {sshMessage.text}
              </div>
            )}

            {isLoadingSSH ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : entries.length === 0 ? (
              <Card className="border border-dashed border-border py-12 bg-card/25 backdrop-blur-xs flex flex-col items-center justify-center text-center">
                <FileText className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground mb-4">No SSH config entries found.</p>
                <Button variant="outline" onClick={handleAddEntry}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create your first Host entry
                </Button>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {entries.map((entry) => (
                  <Card key={entry.id} className="relative p-5 border border-border bg-card/30 backdrop-blur-xs shadow-xs space-y-4 hover:border-primary/45 transition-colors group animate-in fade-in zoom-in-95 duration-200">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-3 right-3 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                      onClick={() => handleRemoveEntry(entry.id)}
                      title="Remove Host"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    
                    <div className="space-y-2 pt-2">
                      <Label className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Host Alias</Label>
                      <Input 
                        value={entry.Host} 
                        onChange={(e) => updateEntry(entry.id, 'Host', e.target.value)}
                        placeholder="github.com-work"
                        className="font-mono text-sm bg-background/50 border-border/80 focus:border-primary"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">HostName</Label>
                      <Input 
                        value={entry.HostName} 
                        onChange={(e) => updateEntry(entry.id, 'HostName', e.target.value)}
                        placeholder="github.com"
                        className="font-mono text-sm bg-background/50 border-border/80 focus:border-primary"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">User</Label>
                        <Input 
                          value={entry.User} 
                          onChange={(e) => updateEntry(entry.id, 'User', e.target.value)}
                          placeholder="git"
                          className="font-mono text-sm bg-background/50 border-border/80 focus:border-primary"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Port</Label>
                        <Input 
                          value={entry.Port} 
                          onChange={(e) => updateEntry(entry.id, 'Port', e.target.value)}
                          placeholder="22"
                          className="font-mono text-sm bg-background/50 border-border/80 focus:border-primary"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">IdentityFile</Label>
                      <Input 
                        value={entry.IdentityFile} 
                        onChange={(e) => updateEntry(entry.id, 'IdentityFile', e.target.value)}
                        placeholder="~/.ssh/id_rsa"
                        className="font-mono text-sm bg-background/50 border-border/80 focus:border-primary"
                      />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
