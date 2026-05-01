import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { Profile } from '@/types/profile';
import type { LayoutView } from '@/stores/settingsStore';
import { Key, Edit, Trash2, User, Mail } from 'lucide-react';
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


  // Compact view
  if (isCompact) {
    return (
      <Card 
        className="hover:shadow-md transition-all duration-200 cursor-pointer group border-2 hover:border-primary/50"
        style={{ borderTopColor: accentColor, borderTopWidth: '3px' }}
        onClick={() => navigate(`/view/${profile.id}`)}
      >
        <CardHeader className="pb-2 px-3 pt-3">
          <div className="flex items-center gap-2">
            {profile.avatar && (
              <div 
                className="flex items-center justify-center w-8 h-8 rounded-full text-lg flex-shrink-0"
                style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
              >
                {profile.avatar}
              </div>
            )}
            <CardTitle className="text-sm font-bold truncate group-hover:text-primary transition-colors flex-1">
              {profile.name}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="text-xs text-muted-foreground truncate">{profile.email}</div>
        </CardContent>
      </Card>
    );
  }

  // List view
  if (isList) {
    return (
      <Card 
        className="hover:shadow-lg transition-all duration-200 cursor-pointer group border-l-4"
        style={{ borderLeftColor: accentColor }}
        onClick={() => navigate(`/view/${profile.id}`)}
      >
        <div className="flex items-center gap-4 p-4">
          {profile.avatar && (
            <div 
              className="flex items-center justify-center w-12 h-12 rounded-full text-2xl flex-shrink-0"
              style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
            >
              {profile.avatar}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold truncate group-hover:text-primary transition-colors">
                {profile.name}
              </h3>
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-white flex-shrink-0"
                style={{ backgroundColor: providerCfg.color }}
              >
                {providerCfg.name}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                <span>{profile.username}</span>
              </div>
              <div className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                <span className="truncate">{profile.email}</span>
              </div>
              <div className="flex items-center gap-1">
                <Key className="w-3.5 h-3.5" />
                <span>{getKeyTypeLabel()}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(profile);
              }}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(profile);
              }}
              className="hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Grid view (default)
  return (
    <Card 
      className="hover:shadow-lg transition-all duration-200 cursor-pointer group border-2 hover:border-primary/50"
      style={{ borderTopColor: accentColor, borderTopWidth: '4px' }}
      onClick={() => navigate(`/view/${profile.id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {profile.avatar && (
              <div 
                className="flex items-center justify-center w-10 h-10 rounded-full text-xl flex-shrink-0"
                style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
              >
                {profile.avatar}
              </div>
            )}
            <div className="flex items-center gap-2 min-w-0">
              <CardTitle className="text-lg font-bold truncate group-hover:text-primary transition-colors">
                {profile.name}
              </CardTitle>
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold text-white flex-shrink-0"
                style={{ backgroundColor: providerCfg.color }}
              >
                {providerCfg.name}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 pb-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{profile.username}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{profile.email}</span>
          </div>
        </div>
        
        <div className="pt-2 border-t">
          <div className="flex items-center gap-2 text-sm">
            <Key className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="font-medium text-foreground">{getKeyTypeLabel()}</span>
          </div>
          
          {profile.keyPath && (
            <div className="text-xs text-muted-foreground mt-1 pl-6 truncate" title={profile.keyPath}>
              {profile.keyPath.split('/').pop()}
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="gap-2 justify-end border-t pt-3 bg-muted/20">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(profile);
          }}
          // className="hover:bg-background"
        >
          <Edit className="w-4 h-4 mr-2" />
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(profile);
          }}
          className="hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
}
