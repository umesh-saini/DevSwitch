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
    <div className="app-titlebar flex items-center justify-between bg-background border-b border-border select-none shrink-0">
      <div className="flex items-center gap-3 px-4 py-2 app-drag">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground shrink-0">
          <Github className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-sm font-bold leading-tight">DevSwitch</h1>
          <p className="text-[10px] text-muted-foreground leading-tight">
            GitHub Profile Manager
          </p>
        </div>
      </div>

      <div className="flex items-center app-no-drag">
        <button
          onClick={() => window.electronAPI?.window?.close()}
          className="h-10 w-12 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
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
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const platform = result?.platform ?? 'linux';
  const granted  = result?.granted  ?? false;
  const status   = result?.status   ?? 'not-determined';

  return (
    <div className="h-screen rounded-xl flex flex-col bg-background text-foreground overflow-hidden">
      <PermissionTitleBar />

      <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
        <div className="w-full max-w-sm space-y-5">

          {/* ── Icon + Title ── */}
          <div className="text-center space-y-3">
            <div
              className={cn(
                'mx-auto w-16 h-16 rounded-2xl flex items-center justify-center',
                granted
                  ? 'bg-green-100 dark:bg-green-950/50'
                  : 'bg-amber-100 dark:bg-amber-950/50'
              )}
            >
              {granted ? (
                <ShieldCheck className="w-8 h-8 text-green-600 dark:text-green-400" />
              ) : platform === 'mac' ? (
                <ShieldAlert className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              ) : (
                <FolderLock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              )}
            </div>

            <div>
              <h2 className="text-xl font-bold">
                {granted ? 'Access Granted' : 'Permission Required'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {granted
                  ? 'Continuing to DevSwitch…'
                  : 'DevSwitch needs access to your ~/.ssh folder to manage SSH keys for your GitHub profiles.'}
              </p>
            </div>
          </div>

          {/* ── Granted banner ── */}
          {granted && (
            <div className="rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    SSH folder access confirmed
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                    {isContinuing
                      ? 'Opening DevSwitch…'
                      : 'DevSwitch will open automatically'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── macOS instructions ── */}
          {!granted && platform === 'mac' && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <p className="text-sm font-semibold">
                Full Disk Access required on macOS
              </p>
              <ol className="space-y-2">
                {[
                  'Click "Open System Preferences" below',
                  'Navigate to Privacy & Security → Full Disk Access',
                  'Find and enable DevSwitch in the list',
                  'Return to DevSwitch — access is detected automatically',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              {status === 'denied' && (
                <div className="flex items-center gap-1.5 pt-1 text-xs text-destructive">
                  <ChevronRight className="w-3 h-3 shrink-0" />
                  Access is currently denied. Please enable it in System Preferences.
                </div>
              )}
            </div>
          )}

          {/* ── Windows instructions ── */}
          {!granted && platform === 'windows' && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <p className="text-sm font-semibold">SSH Folder Access Issue</p>
              <p className="text-sm text-muted-foreground">
                DevSwitch couldn't read or write to{' '}
                <code className="font-mono bg-muted px-1 py-0.5 rounded text-xs">~/.ssh</code>.
                Ensure your user account has full control over this folder.
              </p>
              <ol className="space-y-1.5">
                {[
                  'Open File Explorer and navigate to your home folder',
                  'Right-click .ssh → Properties → Security',
                  'Confirm your user has Full Control',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              {result?.details && (
                <p className="text-xs text-destructive font-mono bg-destructive/5 p-2 rounded break-all">
                  {result.details}
                </p>
              )}
            </div>
          )}

          {/* ── Linux instructions ── */}
          {!granted && platform === 'linux' && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <p className="text-sm font-semibold">Fix SSH Folder Permissions</p>
              <p className="text-sm text-muted-foreground">
                Run these commands in your terminal to set the correct permissions:
              </p>
              <div className="space-y-1.5">
                {[
                  'chmod 700 ~/.ssh',
                  'chmod 600 ~/.ssh/id_*',
                  'chmod 644 ~/.ssh/id_*.pub',
                ].map((cmd) => (
                  <div
                    key={cmd}
                    className="font-mono text-xs bg-muted px-3 py-2 rounded-md text-foreground border border-border"
                  >
                    {cmd}
                  </div>
                ))}
              </div>
              {result?.details && (
                <p className="text-xs text-destructive font-mono bg-destructive/5 p-2 rounded break-all">
                  {result.details}
                </p>
              )}
            </div>
          )}

          {/* ── Actions ── */}
          {!granted && (
            <div className="space-y-2">
              {/* macOS: open System Preferences */}
              {platform === 'mac' && (
                <Button className="w-full" onClick={handleOpenSettings}>
                  <ExternalLink className="w-4 h-4" />
                  Open System Preferences
                </Button>
              )}

              {/* Retry / Check again */}
              <Button
                variant={platform === 'mac' ? 'outline' : 'default'}
                className="w-full"
                onClick={handleRetry}
                disabled={isChecking}
              >
                {isChecking ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCw className="w-4 h-4" />
                )}
                {isChecking ? 'Checking…' : platform === 'mac' ? 'Check Again' : 'Retry'}
              </Button>

              <button
                onClick={() => window.electronAPI?.window?.close()}
                className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip for now
              </button>
            </div>
          )}

          {/* Granted: manual continue button */}
          {granted && (
            <Button className="w-full" onClick={handleContinue} disabled={isContinuing}>
              {isContinuing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Continue to DevSwitch
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
