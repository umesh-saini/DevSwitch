import type { ReactNode } from 'react';
import { TitleBar } from './TitleBar';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="h-screen rounded-xl flex flex-col bg-background text-foreground overflow-hidden relative font-sans selection:bg-primary/25 select-none">
      {/* Dynamic Ambient Background Lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full bg-blue-500/8 dark:bg-blue-600/10 blur-[120px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-indigo-500/8 dark:bg-indigo-600/10 blur-[120px] pointer-events-none animate-pulse-slow" />
      
      {/* Decorative top ambient bar */}
      <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent pointer-events-none" />

      {/* Main TitleBar */}
      <TitleBar />
      
      {/* Page Content Viewport */}
      <main className="flex-1 overflow-auto custom-scrollbar relative z-10">
        <div className="container mx-auto px-6 py-8 animate-scale-in">
          {children}
        </div>
      </main>
    </div>
  );
}
