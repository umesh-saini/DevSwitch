import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/animate-ui/components/buttons/button';
import { RefreshCw, Key } from 'lucide-react';

interface SyncProfileCardProps {
  onSync: () => void;
  isSyncing: boolean;
}

export function SyncProfileCard({ onSync, isSyncing }: SyncProfileCardProps) {
  return (
    <Card className="border-2 border-blue-500/30 bg-blue-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Sync SSH Keys
            </CardTitle>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full">
            <span>Auto-Detect</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 pb-4">
        <div className="flex items-start gap-2 text-sm">
          <Key className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">
              Automatically detect SSH keys
            </p>
            <p className="text-muted-foreground text-xs mt-1">
              Scan your .ssh directory and SSH config file to find all configured keys and create profiles for them.
            </p>
          </div>
        </div>

        <div className="pt-2 text-xs text-muted-foreground bg-muted/30 p-3 rounded border border-border">
          <p className="font-medium mb-1">This will:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Scan all SSH keys in ~/.ssh</li>
            <li>Extract emails from public keys</li>
            <li>Match with SSH config entries</li>
            <li>Create profiles for unmanaged keys</li>
          </ul>
        </div>
      </CardContent>
      
      <CardFooter className="gap-2 justify-end border-t pt-3 bg-muted/20">
        <Button onClick={onSync} disabled={isSyncing} size="sm">
          {isSyncing && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
          {isSyncing ? 'Syncing...' : 'Sync All Keys'}
        </Button>
      </CardFooter>
    </Card>
  );
}
