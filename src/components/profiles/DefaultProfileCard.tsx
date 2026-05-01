import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/animate-ui/components/buttons/button';
import { Key, User, Mail, Star } from 'lucide-react';

interface DefaultProfileCardProps {
  username: string;
  email: string;
  keyPath: string;
  onCreateProfile: () => void;
}

export function DefaultProfileCard({ username, email, keyPath, onCreateProfile }: DefaultProfileCardProps) {
  return (
    <Card className="border-2 border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Star className="w-5 h-5 text-primary fill-primary" />
              Default Git Profile
            </CardTitle>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
            <span>Global Config</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 pb-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{username}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{email}</span>
          </div>
        </div>
        
        <div className="pt-2 border-t">
          <div className="flex items-center gap-2 text-sm">
            <Key className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="font-medium text-foreground">Default SSH Key</span>
          </div>
          
          <div className="text-xs text-muted-foreground mt-1 pl-6 truncate" title={keyPath}>
            {keyPath.split('/').pop()}
          </div>
        </div>

        <div className="pt-2 text-xs text-muted-foreground">
          This profile is detected from your global git config. Create a DevSwitch profile to manage it.
        </div>
      </CardContent>
      
      <CardFooter className="gap-2 justify-end border-t pt-3 bg-muted/20">
        <Button onClick={onCreateProfile} size="sm">
          Create Profile from Default
        </Button>
      </CardFooter>
    </Card>
  );
}
