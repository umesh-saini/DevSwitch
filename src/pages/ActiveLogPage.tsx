import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/animate-ui/components/buttons/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowLeft, 
  Trash2, 
  Clock, 
  Search,
  UserPlus,
  UserCheck,
  UserMinus,
  KeyRound,
  FileCode2,
  Share2,
  PlugZap,
  Filter,
  Download,
  Calendar,
  X,
  History,
  AlertTriangle
} from 'lucide-react';

export function ActiveLogPage() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('ALL');
  
  // Date Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Delete before state
  const [deleteBeforeOpen, setDeleteBeforeOpen] = useState(false);
  const [deleteBeforeDate, setDeleteBeforeDate] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    if (window.electronAPI?.log) {
      try {
        const allLogs = await window.electronAPI.log.getAll();
        setLogs(allLogs);
      } catch (err) {
        console.error('Failed to load logs:', err);
      }
    }
  };

  const clearLogs = async () => {
    if (window.electronAPI?.log) {
      if (confirm('Are you sure you want to clear all activity logs?')) {
        try {
          await window.electronAPI.log.clear();
          setLogs([]);
        } catch (err) {
          console.error('Failed to clear logs:', err);
        }
      }
    }
  };

  const handleClearBefore = async (dateStr: string) => {
    if (!dateStr) return;
    const targetTimestamp = new Date(dateStr).getTime() + 86400000; // include all of that day
    
    if (window.electronAPI?.log) {
      const formattedDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(dateStr));
      if (confirm(`Are you sure you want to delete all activity logs created BEFORE ${formattedDate}?`)) {
        try {
          await window.electronAPI.log.clearBefore(targetTimestamp);
          setDeleteBeforeOpen(false);
          await loadLogs();
        } catch (err) {
          console.error('Failed to clear logs before date:', err);
        }
      }
    }
  };

  const handleDeletePreset = (daysAgo: number) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const dateStr = date.toISOString().split('T')[0];
    handleClearBefore(dateStr);
  };

  // Date Filter Presets
  const applyDatePreset = (days: number) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const prevDate = new Date();
    prevDate.setDate(prevDate.getDate() - days);
    const prevStr = prevDate.toISOString().split('T')[0];
    
    setStartDate(prevStr);
    setEndDate(todayStr);
  };

  const resetDateFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  // Exporters
  const exportJSON = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(filteredLogs, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", `devswitch-activity-logs-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const exportCSV = () => {
    const headers = ['ID', 'Timestamp', 'Date', 'Action', 'Message', 'Provider', 'Details'];
    const rows = filteredLogs.map(log => {
      const logDate = new Date(log.timestamp).toISOString();
      const provider = log.details?.provider || '';
      const details = log.details ? JSON.stringify(log.details).replace(/"/g, '""') : '';
      return [
        log.id,
        log.timestamp,
        logDate,
        log.action,
        `"${log.message.replace(/"/g, '""')}"`,
        provider,
        `"${details}"`
      ];
    });
    
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", url);
    downloadAnchor.setAttribute("download", `devswitch-activity-logs-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(timestamp));
  };

  const getLogIcon = (action: string) => {
    switch (action) {
      case 'PROFILE_CREATED':
        return <UserPlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'PROFILE_UPDATED':
        return <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'PROFILE_DELETED':
        return <UserMinus className="w-4 h-4 text-red-600 dark:text-red-400" />;
      case 'SSH_KEY_GENERATED':
        return <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'SSH_KEY_IMPORTED':
        return <KeyRound className="w-4 h-4 text-violet-600 dark:text-violet-400" />;
      case 'SSH_CONFIG_UPDATED':
        return <FileCode2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      case 'PROVIDER_KEY_UPLOADED':
        return <Share2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />;
      case 'PROVIDER_DISCONNECTED':
        return <PlugZap className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getLogBg = (action: string) => {
    switch (action) {
      case 'PROFILE_CREATED':
        return 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50';
      case 'PROFILE_UPDATED':
        return 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50';
      case 'PROFILE_DELETED':
        return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50';
      case 'SSH_KEY_GENERATED':
      case 'SSH_KEY_IMPORTED':
        return 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50';
      case 'SSH_CONFIG_UPDATED':
        return 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/50';
      case 'PROVIDER_KEY_UPLOADED':
        return 'bg-sky-50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-900/50';
      case 'PROVIDER_DISCONNECTED':
        return 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50';
      default:
        return 'bg-muted/50 border-border';
    }
  };

  const filteredLogs = useMemo(() => {
    return logs
      .filter((log) => {
        if (filterAction !== 'ALL' && log.action !== filterAction) return false;
        
        // Date filters
        const logDateStr = new Date(log.timestamp).toISOString().split('T')[0];
        if (startDate && logDateStr < startDate) return false;
        if (endDate && logDateStr > endDate) return false;

        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          log.message.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          log.details?.provider?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.timestamp - a.timestamp); // newest first
  }, [logs, searchQuery, filterAction, startDate, endDate]);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/setting')}
              className="rounded-full h-10 w-10 shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Activity Log</h2>
              <p className="text-muted-foreground text-sm">
                System and profile events audit trail
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {logs.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteBeforeOpen(true)}
                  className="gap-1.5 border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-950 dark:text-orange-400 dark:hover:bg-orange-950/20"
                >
                  <History className="w-4 h-4" />
                  Delete Older Logs
                </Button>
                
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={clearLogs}
                  className="gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Filters and Actions Toolbar */}
        <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border/50">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-background border border-border rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>

            {/* Filter Dropdown */}
            <div className="relative min-w-[180px]">
              <Filter className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground pointer-events-none" />
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-background border border-border rounded-lg appearance-none focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
              >
                <option value="ALL">All Actions</option>
                <option value="PROFILE_CREATED">Profile Created</option>
                <option value="PROFILE_UPDATED">Profile Updated</option>
                <option value="PROFILE_DELETED">Profile Deleted</option>
                <option value="SSH_KEY_GENERATED">SSH Key Generated</option>
                <option value="SSH_KEY_IMPORTED">SSH Key Imported</option>
                <option value="SSH_CONFIG_UPDATED">SSH Config Updated</option>
                <option value="PROVIDER_KEY_UPLOADED">Key Uploaded</option>
                <option value="PROVIDER_DISCONNECTED">Account Disconnected</option>
              </select>
            </div>
            
            {/* Export Buttons */}
            {filteredLogs.length > 0 && (
              <div className="flex gap-1.5 self-stretch">
                <Button variant="outline" size="sm" onClick={exportCSV} className="flex-1 sm:flex-initial gap-1.5 px-3">
                  <Download className="w-3.5 h-3.5" />
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={exportJSON} className="flex-1 sm:flex-initial gap-1.5 px-3">
                  <Download className="w-3.5 h-3.5" />
                  JSON
                </Button>
              </div>
            )}
          </div>

          {/* Date Picker Filters */}
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border/40">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground shrink-0">
              <Calendar className="w-3.5 h-3.5" />
              DATE RANGE:
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-background border border-border text-xs px-2.5 py-1 rounded-md focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-background border border-border text-xs px-2.5 py-1 rounded-md focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>
            
            {/* Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => applyDatePreset(0)}
                className="text-[10px] bg-background hover:bg-muted text-foreground border px-2 py-0.5 rounded-md font-medium"
              >
                Today
              </button>
              <button
                onClick={() => applyDatePreset(7)}
                className="text-[10px] bg-background hover:bg-muted text-foreground border px-2 py-0.5 rounded-md font-medium"
              >
                Last 7 Days
              </button>
              <button
                onClick={() => applyDatePreset(30)}
                className="text-[10px] bg-background hover:bg-muted text-foreground border px-2 py-0.5 rounded-md font-medium"
              >
                Last 30 Days
              </button>
              {(startDate || endDate) && (
                <button
                  onClick={resetDateFilters}
                  className="flex items-center gap-0.5 text-[10px] text-destructive hover:bg-destructive/10 px-2 py-0.5 rounded-md font-semibold border border-destructive/20"
                >
                  <X className="w-3 h-3" />
                  Clear Date
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Custom Delete Before Modal Dialog */}
        {deleteBeforeOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in-0 duration-200">
            <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-xl p-6 relative flex flex-col gap-4 animate-in scale-in-95 duration-200">
              <button 
                onClick={() => setDeleteBeforeOpen(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground rounded-full p-1 hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              
              <div className="flex gap-3">
                <div className="p-2.5 bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 rounded-xl self-start">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Delete Older Activity Logs</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Select a cutoff date to clean up your logs database. All log records before this date will be permanently deleted.
                  </p>
                </div>
              </div>

              {/* Presets */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Presets</label>
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" size="sm" className="text-xs py-1" onClick={() => handleDeletePreset(7)}>
                    Older than 7d
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs py-1" onClick={() => handleDeletePreset(30)}>
                    Older than 30d
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs py-1" onClick={() => handleDeletePreset(90)}>
                    Older than 90d
                  </Button>
                </div>
              </div>

              {/* Custom Date Selection */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Custom Date Cutoff</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={deleteBeforeDate}
                    onChange={(e) => setDeleteBeforeDate(e.target.value)}
                    className="flex-1 bg-background border border-border text-sm px-3 py-2 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                  <Button 
                    variant="destructive"
                    size="sm"
                    disabled={!deleteBeforeDate}
                    onClick={() => handleClearBefore(deleteBeforeDate)}
                    className="px-4"
                  >
                    Delete Older
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Logs List */}
        <Card className="border border-border bg-card/50 backdrop-blur-xs">
          <CardContent className="p-6">
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <Clock className="w-12 h-12 text-muted-foreground/40" />
                <div className="space-y-1">
                  <p className="text-lg font-semibold">No logs found</p>
                  <p className="text-sm text-muted-foreground">
                    {logs.length === 0 
                      ? "System events will be shown here once you start editing profiles or generating keys." 
                      : "Try widening your search terms or date selection range."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative border-l border-border ml-3.5 pl-6 space-y-8">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="relative group">
                    {/* Timeline dot */}
                    <div className={`absolute -left-[38px] top-1.5 p-1.5 rounded-full border shadow-xs shrink-0 z-10 ${getLogBg(log.action)}`}>
                      {getLogIcon(log.action)}
                    </div>
                    
                    {/* Log detail card */}
                    <div className="space-y-1.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="text-sm font-semibold tracking-tight text-foreground/90 leading-none">
                          {log.message}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatDate(log.timestamp)}
                        </span>
                      </div>
                      
                      {/* Meta information tags */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                        <span className="bg-muted px-2 py-0.5 rounded-md font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                          {log.action.replace('_', ' ')}
                        </span>

                        {log.details?.provider && (
                          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md capitalize font-medium">
                            {log.details.provider}
                          </span>
                        )}

                        {log.details?.algorithm && (
                          <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-900/30 px-2 py-0.5 rounded-md text-[10px] uppercase font-semibold">
                            {log.details.algorithm}
                          </span>
                        )}
                        
                        {log.details?.keyPath && (
                          <span className="text-[10px] text-muted-foreground font-mono bg-muted/30 px-2 py-0.5 rounded border border-border/40">
                            Path: {log.details.keyPath}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
