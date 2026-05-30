import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/animate-ui/components/buttons/button';
import { RefreshCw, Key, Check } from 'lucide-react';

interface SyncProfileCardProps {
  onSync: () => void;
  isSyncing: boolean;
}

export function SyncProfileCard({ onSync, isSyncing }: SyncProfileCardProps) {
  const steps = [
    'Scan all SSH keys in ~/.ssh',
    'Extract emails from public keys',
    'Match with SSH config entries',
    'Create profiles for unmanaged keys',
  ];

  return (
    <Card 
      className="border border-blue-500/25 bg-gradient-to-br from-blue-500/[0.04] via-blue-500/[0.01] to-transparent hover:shadow-[0_12px_30px_-8px_rgba(59,130,246,0.12)] transition-all duration-300 rounded-2xl flex flex-col justify-between overflow-hidden relative group"
    >
      {/* Top glowing aura */}
      <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-blue-500/[0.03] to-transparent pointer-events-none" />

      <div>
        <CardHeader className="pb-3 pt-5 px-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 group-hover:scale-105 transition-transform duration-200">
                <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
              </div>
              <CardTitle className="text-base font-extrabold tracking-tight text-foreground">
                Sync SSH Keys
              </CardTitle>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-500 bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded-full flex-shrink-0">
              Auto-Detect
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4 pb-4 px-5">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-foreground/90">
              Automatically build profile database
            </p>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Scan your default system configuration to import active connections automatically.
            </p>
          </div>

          <div className="pt-3 border-t border-blue-500/15 space-y-2">
            <p className="text-[10px] font-bold text-blue-500/90 uppercase tracking-wider">Detection Pipeline:</p>
            <div className="space-y-2">
              {steps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  <div className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                  <span className="text-muted-foreground text-[11px] font-medium leading-none">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </div>
      
      <CardFooter className="border-t border-border/40 pt-3.5 pb-3.5 px-5 bg-muted/[0.03]">
        <Button 
          onClick={onSync} 
          disabled={isSyncing} 
          size="sm"
          className="w-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/15 border-0 rounded-xl py-2 font-semibold text-xs transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          {isSyncing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Syncing Keys...
            </>
          ) : (
            'Sync All Keys'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
