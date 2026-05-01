import { useState, useEffect } from 'react';
import { ThemeTogglerButton } from '@/components/animate-ui/components/buttons/theme-toggler';
import { Github, Minus, Maximize2, X, Minimize2 } from 'lucide-react';

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Check if running in Electron
    if (window.electronAPI?.window) {
      // Listen for maximize/unmaximize events
      const checkMaximized = async () => {
        const maximized = await window.electronAPI.window.isMaximized();
        setIsMaximized(maximized);
      };
      
      checkMaximized();
      
      // Poll for state changes (in production, you'd use IPC events)
      const interval = setInterval(checkMaximized, 500);
      return () => clearInterval(interval);
    }
  }, []);

  const handleMinimize = () => {
    window.electronAPI?.window?.minimize();
  };

  const handleMaximize = () => {
    window.electronAPI?.window?.maximize();
  };

  const handleClose = () => {
    window.electronAPI?.window?.close();
  };

  return (
    <div className="app-titlebar flex items-center justify-between bg-background border-b border-border select-none">
      {/* Left: App Info */}
      <div className="flex items-center gap-3 px-4 py-2 app-drag">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground shrink-0">
          <Github className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-sm font-bold leading-tight">DevSwitch</h1>
          <p className="text-[10px] text-muted-foreground leading-tight">GitHub Profile Manager</p>
        </div>
      </div>

      {/* Right: Theme Toggle + Window Controls */}
      <div className="flex items-center gap-1">
        <div className="app-no-drag px-2">
          <ThemeTogglerButton variant="ghost" size="sm" />
        </div>
        
        {/* Window Controls - Only show in Electron */}
        {window.electronAPI?.window && (
          <div className="flex items-center app-no-drag">
            <button
              onClick={handleMinimize}
              className="h-10 w-12 flex items-center justify-center hover:bg-muted/50 transition-colors"
              aria-label="Minimize"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              onClick={handleMaximize}
              className="h-10 w-12 flex items-center justify-center hover:bg-muted/50 transition-colors"
              aria-label={isMaximized ? 'Restore' : 'Maximize'}
            >
              {isMaximized ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              onClick={handleClose}
              className="h-10 w-12 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
