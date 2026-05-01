import { useState } from 'react';
import { Button } from '@/components/animate-ui/components/buttons/button';
import { CheckCircle2, XCircle, Loader2, Wifi } from 'lucide-react';
import type { GitProvider } from '@/lib/providerUtils';
import { getProviderConfig } from '@/lib/providerUtils';

interface SSHConnectionTesterProps {
  username: string;
  /** The active provider — determines which SSH host to test. */
  provider?: GitProvider;
  /** The resolved SSH host alias from ~/.ssh/config (e.g. "github.com-work"). */
  hostAlias?: string;
  /** Optional key path to use for the test (passed to -i flag). */
  keyPath?: string;
}

export function SSHConnectionTester({ 
  username,
  provider = 'github',
  hostAlias,
  keyPath,
}: SSHConnectionTesterProps) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<'success' | 'failed' | null>(null);
  const [output, setOutput] = useState<string>('');

  const providerCfg = getProviderConfig(provider);
  const testHost = hostAlias || providerCfg.sshHost;
  const testCommand = `ssh -T ${providerCfg.sshUser}@${testHost}`;

  const testConnection = async () => {
    setTesting(true);
    setResult(null);
    setOutput('');

    try {
      const response = await window.electronAPI.ssh.testConnection({
        hostAlias: testHost,
        sshUser: providerCfg.sshUser,
        ...(keyPath ? { keyPath } : {}),
      });

      setOutput(response.output || response.error || '');
      setResult(response.success ? 'success' : 'failed');
    } catch (err) {
      setOutput(err instanceof Error ? err.message : 'Unexpected error');
      setResult('failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Wifi className="w-4 h-4" />
          SSH Connection Test
        </h4>
        <Button 
          onClick={testConnection} 
          disabled={testing}
          size="sm"
          variant="outline"
        >
          {testing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {testing ? 'Testing...' : 'Test Connection'}
        </Button>
      </div>

      {/* Command preview */}
      <div className="text-xs text-muted-foreground">
        <span>Command: </span>
        <code className="font-mono bg-muted px-1.5 py-0.5 rounded">{testCommand}</code>
      </div>

      {result && (
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md border border-border text-sm">
            <span className="text-muted-foreground">{providerCfg.name} ({testHost})</span>
            <div className="flex items-center gap-2">
              {result === 'success' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="font-medium text-green-600 dark:text-green-400">Connected as {username}</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="font-medium text-red-600 dark:text-red-400">Connection Failed</span>
                </>
              )}
            </div>
          </div>
          {output && (
            <pre className="text-xs font-mono bg-muted px-3 py-2 rounded-md border border-border text-muted-foreground whitespace-pre-wrap break-all max-h-24 overflow-y-auto">
              {output}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
