import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  FolderLock,
  ExternalLink,
  RotateCw,
  X,
  Github,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Terminal,
  Activity
} from 'lucide-react';
import { Button } from '@/components/animate-ui/components/buttons/button';
import { cn } from '@/lib/utils';

type PermissionStatus = 'authorized' | 'denied' | 'not-determined' | 'restricted';
type AppPlatform = 'mac' | 'windows' | 'linux';

interface PermissionResult {
  granted: boolean;
  status: PermissionStatus;
  platform: AppPlatform;
  details?: string;
}

/** Minimal title bar for the permission window — only shows close. */
function PermissionTitleBar() {
  return (
    <div className="app-titlebar flex items-center justify-between bg-background border-b border-border/40 select-none shrink-0">
      <div className="flex items-center gap-3 px-4 py-2.5 app-drag">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary text-primary-foreground shrink-0 shadow-sm shadow-primary/20">
          <Github className="w-4.5 h-4.5" />
        </div>
        <div>
          <h1 className="text-xs font-extrabold leading-tight tracking-tight">DevSwitch</h1>
          <p className="text-[9px] text-muted-foreground leading-tight">
            Security Authorization Portal
          </p>
        </div>
      </div>

      <div className="flex items-center app-no-drag">
        <button
          onClick={() => window.electronAPI?.window?.close()}
          className="h-9 w-11 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function PermissionPage() {
  const [result, setResult] = useState<PermissionResult | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isContinuing, setIsContinuing] = useState(false);
  const autoContinuedRef = useRef(false);

  const checkPermission = useCallback(async () => {
    try {
      if (!window.electronAPI?.permissions) return;
      const res = await window.electronAPI.permissions.check();
      setResult(res);
    } catch (err) {
      console.error('[DevSwitch] Permission check failed:', err);
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Initial check + poll every 2.5 s (to detect macOS grant while System Prefs is open)
  useEffect(() => {
    checkPermission();
    const interval = setInterval(checkPermission, 2500);
    return () => clearInterval(interval);
  }, [checkPermission]);

  // Auto-continue 1.5 s after permission is detected as granted
  useEffect(() => {
    if (result?.granted && !autoContinuedRef.current && !isContinuing) {
      autoContinuedRef.current = true;
      const timer = setTimeout(handleContinue, 1500);
      return () => clearTimeout(timer);
    }
  }, [result?.granted, isContinuing]);

  const handleContinue = async () => {
    setIsContinuing(true);
    try {
      await window.electronAPI.permissions.continue();
    } catch {
      // Window may already be closing
    }
  };

  const handleOpenSettings = async () => {
    await window.electronAPI.permissions.openSettings();
  };

  const handleRetry = () => {
    setIsChecking(true);
    checkPermission();
  };

  /* ─── Loading skeleton ─── */
  if (isChecking && !result) {
    return (
      <div className="h-screen rounded-xl flex flex-col bg-background text-foreground overflow-hidden">
        <PermissionTitleBar />
        <div className="flex-1 flex flex-col gap-3 items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs font-semibold text-muted-foreground animate-pulse">Running authorization integrity diagnostics...</p>
        </div>
      </div>
    );
  }

  const platform = result?.platform ?? 'linux';
  const granted  = result?.granted  ?? false;
  const status   = result?.status   ?? 'not-determined';

  return (
    <div className="h-screen rounded-xl flex flex-col bg-background text-foreground overflow-hidden relative selection:bg-primary/25">
      {/* Decorative ambient lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/5 dark:bg-blue-600/8 blur-[100px] pointer-events-none" />
      <PermissionTitleBar />

      <div className="flex-1 flex items-center justify-center p-6 overflow-auto relative z-10">
        <div className="w-full max-w-sm space-y-6 animate-scale-in">

          {/* ── Active Tech Radar Icon + Title ── */}
          <div className="text-center space-y-4">
            <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
              {/* Pulsing Outer Radars */}
              <div className={cn(
                "absolute inset-0 rounded-full animate-ping opacity-20 duration-1000",
                granted ? "bg-green-500" : "bg-blue-500"
              )} />
              <div className={cn(
                "absolute inset-2 rounded-full animate-pulse opacity-30",
                granted ? "bg-green-500" : "bg-blue-500"
              )} />
              
              <div
                className={cn(
                  'relative w-16 h-16 rounded-2xl flex items-center justify-center border shadow-md',
                  granted
                    ? 'bg-green-500/10 border-green-500/20 text-green-500 shadow-green-500/15'
                    : 'bg-primary/10 border-primary/20 text-primary shadow-primary/15'
                )}
              >
                {granted ? (
                  <ShieldCheck className="w-8 h-8" />
                ) : platform === 'mac' ? (
                  <ShieldAlert className="w-8 h-8 text-amber-500" />
                ) : (
                  <FolderLock className="w-8 h-8" />
                )}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-extrabold tracking-tight">
                {granted ? 'Vault Authorized' : 'Permission Required'}
              </h2>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
                {granted
                  ? 'Access approved. Loading your Git Switch configurations…'
                  : 'DevSwitch requires access to the secure ~/.ssh directory rules to write host configurations.'}
              </p>
            </div>
          </div>

          {/* ── Granted banner ── */}
          {granted && (
            <div className="rounded-xl border border-green-200 dark:border-green-900/50 bg-green-500/5 dark:bg-green-950/20 p-4 shadow-sm animate-scale-in">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-green-800 dark:text-green-200">
                    SSH Folder Connection Active
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                    {isContinuing
                      ? 'Launching security workspace...'
                      : 'Automatic handshake complete'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── OS Specific instruction cards ── */}
          {!granted && (
            <div className="rounded-2xl border border-border/50 bg-card/45 backdrop-blur-md p-5 space-y-3 shadow-soft">
              <div className="flex items-center gap-2 pb-1 border-b border-border/30">
                <Terminal className="w-4 h-4 text-primary shrink-0" />
                <span className="text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">OS Rules Diagnostics</span>
              </div>
              
              {platform === 'mac' && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-foreground leading-tight">
                    Confirm Full Disk Access:
                  </p>
                  <ol className="space-y-2">
                    {[
                      'Open OS System Settings',
                      'Go to Privacy & Security → Full Disk Access',
                      'Find and authorize DevSwitch toggle',
                      'Diagnostic handshake runs automatically',
                    ].map((step, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                        <span className="shrink-0 w-4.5 h-4.5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold mt-0.5">
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                  {status === 'denied' && (
                    <div className="flex items-center gap-1.5 pt-1 text-xs text-destructive font-semibold">
                      <ChevronRight className="w-3 h-3 shrink-0 animate-pulse" />
                      Status: ACCESS_DENIED. Check settings toggle.
                    </div>
                  )}
                </div>
              )}

              {platform === 'windows' && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-foreground">File system lock error:</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Confirm your current profile owns write control over <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-[11px]">~/.ssh</code> directory.
                  </p>
                  <ol className="space-y-1.5 pt-1.5">
                    {[
                      'Go to user folder in explorer',
                      'Right-click .ssh → Properties → Security',
                      'Grant your active user Full Control rights',
                    ].map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="shrink-0 w-4.5 h-4.5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold mt-0.5">
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {platform === 'linux' && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-foreground">Set folder permissions via Terminal:</p>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    {[
                      'chmod 700 ~/.ssh',
                      'chmod 600 ~/.ssh/id_*',
                      'chmod 644 ~/.ssh/id_*.pub',
                    ].map((cmd) => (
                      <div
                        key={cmd}
                        className="bg-neutral-950 text-emerald-400 p-2 rounded-lg border border-neutral-800 flex items-center justify-between"
                      >
                        <span>{cmd}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result?.details && (
                <p className="text-[10px] text-destructive font-mono bg-destructive/5 p-2 rounded-lg border border-destructive/10 break-all">
                  Details: {result.details}
                </p>
              )}
            </div>
          )}

          {/* ── Actions Control block ── */}
          {!granted && (
            <div className="space-y-2">
              {platform === 'mac' && (
                <Button className="w-full h-10 bg-primary hover:bg-primary/95 text-white active:scale-95 shadow-md shadow-primary/10" onClick={handleOpenSettings}>
                  <ExternalLink className="w-4 h-4 mr-1.5" />
                  Open OS System Settings
                </Button>
              )}

              <Button
                variant={platform === 'mac' ? 'outline' : 'default'}
                className="w-full h-10 active:scale-95"
                onClick={handleRetry}
                disabled={isChecking}
              >
                {isChecking ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                ) : (
                  <RotateCw className="w-4 h-4 mr-1.5" />
                )}
                {isChecking ? 'Running checks…' : 'Check authorization again'}
              </Button>

              <button
                onClick={() => window.electronAPI?.window?.close()}
                className="w-full py-2.5 text-xs text-muted-foreground hover:text-foreground font-bold transition-colors"
              >
                Launch dashboard in dry run mode
              </button>
            </div>
          )}

          {/* Granted manually continue button */}
          {granted && (
            <Button className="w-full h-10 bg-green-500 hover:bg-green-600 text-white active:scale-95 shadow-md shadow-green-500/10" onClick={handleContinue} disabled={isContinuing}>
              {isContinuing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
              )}
              Continue to DevSwitch
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
