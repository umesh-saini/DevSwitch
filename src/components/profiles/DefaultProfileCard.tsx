import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/animate-ui/components/buttons/button';
import { Key, User, Mail, Star, ShieldCheck } from 'lucide-react';

interface DefaultProfileCardProps {
  username: string;
  email: string;
  keyPath: string;
  onCreateProfile: () => void;
}

export function DefaultProfileCard({ username, email, keyPath, onCreateProfile }: DefaultProfileCardProps) {
  // Create a nice monogram for default profile
  const monogram = username ? username.substring(0, 2).toUpperCase() : 'GP';

  return (
    <Card 
      className="border border-primary/25 bg-gradient-to-br from-primary/[0.04] via-primary/[0.01] to-transparent hover:shadow-[0_12px_30px_-8px_rgba(var(--primary),0.12)] transition-all duration-300 rounded-2xl flex flex-col justify-between overflow-hidden relative group"
    >
      {/* Top glowing aura */}
      <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-primary/[0.03] to-transparent pointer-events-none" />

      <div>
        <CardHeader className="pb-3 pt-5 px-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 group-hover:scale-105 transition-transform duration-200">
                <Star className="w-5 h-5 fill-primary" />
              </div>
              <CardTitle className="text-base font-extrabold tracking-tight text-foreground">
                Default Git Profile
              </CardTitle>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full flex-shrink-0">
              Global Config
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4 pb-4 px-5">
          {/* Default User Monogram Panel */}
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/20 dark:bg-muted/5 border border-border/30">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary border border-primary/20 font-bold text-xs flex-shrink-0">
              {monogram}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-foreground truncate">{username}</span>
                <ShieldCheck className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              </div>
              <span className="text-[11px] text-muted-foreground truncate block">{email}</span>
            </div>
          </div>
          
          {/* Default SSH Key Container */}
          <div className="p-3 rounded-xl bg-muted/30 dark:bg-muted/10 border border-border/50 space-y-1.5 hover:bg-muted/50 dark:hover:bg-muted/15 transition-all duration-200">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Global Key Mapping</span>
              <span className="font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md text-[9px]">
                Default SSH Key
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground mt-1.5 truncate" title={keyPath}>
              <Key className="w-3.5 h-3.5 text-primary flex-shrink-0 opacity-80" />
              <span className="truncate text-foreground/80">{keyPath.split('/').pop()}</span>
            </div>
          </div>

          <div className="text-[10px] leading-normal text-muted-foreground bg-primary/5 border border-primary/10 rounded-lg p-2.5">
            Detected from your active `~/.gitconfig` global profile. Add this profile to DevSwitch to enable easy key switching.
          </div>
        </CardContent>
      </div>
      
      <CardFooter className="border-t border-border/40 pt-3.5 pb-3.5 px-5 bg-muted/[0.03]">
        <Button 
          onClick={onCreateProfile} 
          size="sm"
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/15 border-0 rounded-xl py-2 font-semibold text-xs transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          Create Profile from Default
        </Button>
      </CardFooter>
    </Card>
  );
}
