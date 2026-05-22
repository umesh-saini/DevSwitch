import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/animate-ui/components/buttons/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
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
  Github
} from 'lucide-react';

export function SettingsPage() {
  const navigate = useNavigate();
  const { layoutView, setLayoutView } = useSettingsStore();
  const { theme, setTheme } = useTheme();
  
  const [permissions, setPermissions] = useState<any>(null);
  const [checkingPerms, setCheckingPerms] = useState(false);
  const [logCount, setLogCount] = useState(0);

  useEffect(() => {
    checkPermissions();
    fetchLogCount();
  }, []);

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

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
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
    </AppShell>
  );
}
