import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { Profile } from '@/types/profile';
import type { LayoutView } from '@/stores/settingsStore';
import { Key, Edit, Trash2, User, Mail, ChevronRight } from 'lucide-react';
import { Button } from '@/components/animate-ui/components/buttons/button';
import { getProviderConfig, type GitProvider } from '@/lib/providerUtils';

interface ProfileCardProps {
  profile: Profile;
  onEdit: (profile: Profile) => void;
  onDelete: (profile: Profile) => void;
  layoutView?: LayoutView;
}

export function ProfileCard({ profile, onEdit, onDelete, layoutView = 'grid' }: ProfileCardProps) {
  const navigate = useNavigate();
  
  // Get custom color or default
  const accentColor = profile.color || '#3b82f6';
  const isCompact = layoutView === 'compact';
  const isList = layoutView === 'list';
  const providerCfg = getProviderConfig((profile.provider as GitProvider) || 'github');

  const getKeyTypeLabel = () => {
    if (profile.sshKeyType === 'default') return 'Default Key';
    if (profile.sshKeyType === 'generated') {
      return profile.keyAlgorithm === 'ed25519' ? 'ED25519' : 'RSA 4096';
    }
    return 'Custom Key';
  };

  // Compact view - Sleek dashboard badges
  if (isCompact) {
    return (
      <div 
        className="hover:shadow-md transition-all duration-300 cursor-pointer group border border-border/60 hover:border-border/80 bg-card hover:bg-accent/[0.01] rounded-xl overflow-hidden relative p-3 flex items-center gap-3 h-[62px]"
        style={{ borderLeft: `3px solid ${accentColor}` }}
        onClick={() => navigate(`/view/${profile.id}`)}
      >
        {profile.avatar && (
          <div 
            className="flex items-center justify-center w-9 h-9 rounded-lg text-lg flex-shrink-0 transition-transform group-hover:scale-105 duration-200 shadow-sm"
            style={{ backgroundColor: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}25` }}
          >
            {profile.avatar}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1.5">
            <h4 className="text-sm font-extrabold text-foreground group-hover:text-primary transition-colors truncate">
              {profile.name}
            </h4>
            <span
              className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider border flex-shrink-0"
              style={{ 
                backgroundColor: `${providerCfg.color}15`, 
                color: providerCfg.color,
                borderColor: `${providerCfg.color}35`
              }}
            >
              {providerCfg.name.substring(0, 2)}
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground truncate mt-0.5">{profile.email}</div>
        </div>
      </div>
    );
  }

  // List view - Left-aligned details in elegant columns
  if (isList) {
    return (
      <div 
        className="hover:shadow-md transition-all duration-300 cursor-pointer group border border-border/60 hover:border-border/80 bg-card hover:bg-accent/[0.01] rounded-xl relative overflow-hidden flex items-center p-4 pl-6"
        onClick={() => navigate(`/view/${profile.id}`)}
      >
        {/* Colorful left indicator */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-300 group-hover:w-2" 
          style={{ backgroundColor: accentColor }}
        />
        
        {profile.avatar && (
          <div 
            className="flex items-center justify-center w-11 h-11 rounded-xl text-xl flex-shrink-0 mr-4 shadow-sm"
            style={{ backgroundColor: `${accentColor}15`, color: accentColor, border: `1.5px solid ${accentColor}25` }}
          >
            {profile.avatar}
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* First row: Name, Badge, Status */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-base font-extrabold text-foreground group-hover:text-primary transition-colors truncate">
              {profile.name}
            </h3>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border flex-shrink-0"
              style={{ 
                backgroundColor: `${providerCfg.color}15`, 
                color: providerCfg.color,
                borderColor: `${providerCfg.color}35`
              }}
            >
              {providerCfg.name}
            </span>

            {profile.hostConfigured ? (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                Ready
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                <span className="w-1 h-1 rounded-full bg-amber-500" />
                Unconfigured
              </span>
            )}
          </div>

          {/* Second row: Columns for Username, Email, Key Info */}
          <div className="flex items-center gap-6 mt-2 text-xs text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1.5 min-w-0">
              <User className="w-3.5 h-3.5 flex-shrink-0 opacity-70 text-foreground" />
              <span className="truncate font-medium text-foreground/80">{profile.username}</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <Mail className="w-3.5 h-3.5 flex-shrink-0 opacity-70 text-foreground" />
              <span className="truncate font-medium text-foreground/80">{profile.email}</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <Key className="w-3.5 h-3.5 flex-shrink-0 text-primary opacity-80" />
              <span className="font-semibold text-foreground/85">{getKeyTypeLabel()}</span>
              {profile.keyPath && (
                <span className="font-mono text-muted-foreground/75 truncate max-w-[200px]" title={profile.keyPath}>
                  ({profile.keyPath.split('/').pop()})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons on the far right */}
        <div className="flex items-center gap-2 pl-4 ml-auto border-l border-border/40">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(profile);
            }}
            className="h-8 w-8 p-0 rounded-lg hover:bg-background border border-transparent hover:border-border transition-all duration-200"
          >
            <Edit className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(profile);
            }}
            className="h-8 w-8 p-0 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive border border-transparent hover:border-destructive/20 transition-all duration-200"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform duration-200" />
        </div>
      </div>
    );
  }

  // Grid view (default)
  return (
    <Card 
      className="hover:shadow-xl transition-all duration-300 cursor-pointer group border border-border/60 hover:border-border rounded-2xl bg-card hover:bg-accent/[0.02] relative overflow-hidden flex flex-col h-full"
      style={{ 
        borderTop: `4px solid ${accentColor}`,
        boxShadow: `0 4px 30px -10px ${accentColor}10`
      }}
      onClick={() => navigate(`/view/${profile.id}`)}
    >
      {/* Dynamic hover-glow background */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(circle 180px at 50% 0px, ${accentColor}06, transparent)`
        }}
      />

      <CardHeader className="pb-3 pt-5 px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 flex-1 min-w-0">
            {profile.avatar && (
              <div 
                className="flex items-center justify-center w-12 h-12 rounded-xl text-2xl flex-shrink-0 transition-all duration-300 group-hover:scale-110 shadow-sm"
                style={{ 
                  background: `linear-gradient(135deg, ${accentColor}15, ${accentColor}30)`, 
                  color: accentColor,
                  border: `1.5px solid ${accentColor}25`,
                  boxShadow: `0 8px 20px -8px ${accentColor}40`
                }}
              >
                {profile.avatar}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border flex-shrink-0"
                  style={{ 
                    backgroundColor: `${providerCfg.color}15`, 
                    color: providerCfg.color,
                    borderColor: `${providerCfg.color}35`
                  }}
                >
                  {providerCfg.name}
                </span>

                {/* Status Dot */}
                {profile.hostConfigured ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                    Ready
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Pending Config
                  </span>
                )}
              </div>

              <CardTitle className="text-base font-extrabold truncate mt-1 text-foreground group-hover:text-primary transition-colors tracking-tight">
                {profile.name}
              </CardTitle>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 pb-5 px-5 flex-1">
        {/* User Info Fields */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground bg-muted/20 dark:bg-muted/5 p-2 rounded-lg border border-border/30">
            <User className="w-4 h-4 flex-shrink-0 opacity-70 text-foreground" />
            <span className="truncate font-medium text-foreground/80">{profile.username}</span>
          </div>
          
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground bg-muted/20 dark:bg-muted/5 p-2 rounded-lg border border-border/30">
            <Mail className="w-4 h-4 flex-shrink-0 opacity-70 text-foreground" />
            <span className="truncate font-medium text-foreground/80">{profile.email}</span>
          </div>
        </div>
        
        {/* SSH Key Box */}
        <div className="p-3 rounded-xl bg-muted/30 dark:bg-muted/10 border border-border/50 space-y-1.5 hover:bg-muted/50 dark:hover:bg-muted/15 transition-all duration-200">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">SSH Key</span>
            <span className="font-semibold text-foreground bg-primary/10 text-primary px-2 py-0.5 rounded-md text-[9px]">
              {getKeyTypeLabel()}
            </span>
          </div>
          {profile.keyPath && (
            <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground mt-1.5 truncate" title={profile.keyPath}>
              <Key className="w-3.5 h-3.5 text-primary flex-shrink-0 opacity-80" />
              <span className="truncate text-foreground/80">{profile.keyPath.split('/').pop()}</span>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="gap-2 justify-end border-t border-border/40 pt-3.5 pb-3.5 px-5 bg-muted/[0.05] mt-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(profile);
          }}
          className="h-8 hover:bg-background border border-transparent hover:border-border transition-all duration-200"
        >
          <Edit className="w-3.5 h-3.5 mr-1.5" />
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(profile);
          }}
          className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive border border-transparent hover:border-destructive/20 transition-all duration-200"
        >
          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
}
