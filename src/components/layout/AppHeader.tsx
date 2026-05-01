import { ThemeTogglerButton } from '@/components/animate-ui/components/buttons/theme-toggler';
import { Github } from 'lucide-react';

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
            <Github className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">DevSwitch</h1>
            <p className="text-xs text-muted-foreground">GitHub Profile Manager</p>
          </div>
        </div>
        <ThemeTogglerButton variant="ghost" size="sm" />
      </div>
    </header>
  );
}
