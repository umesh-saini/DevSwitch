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
  AlertTriangle,
  FileText,
  Activity,
  ShieldCheck
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

  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleClearBefore = async (dateStr: string) => {
    if (!dateStr) return;
    const [year, month, day] = dateStr.split('-').map(Number);
    const targetTimestamp = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
    
    if (window.electronAPI?.log) {
      const formattedDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(year, month - 1, day));
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
    handleClearBefore(getLocalDateString(date));
  };

  // Date Filter Presets
  const applyDatePreset = (days: number) => {
    const todayStr = getLocalDateString(new Date());
    const prevDate = new Date();
    prevDate.setDate(prevDate.getDate() - days);
    const prevStr = getLocalDateString(prevDate);
    
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
    downloadAnchor.setAttribute("download", `devswitch-activity-logs-${getLocalDateString(new Date())}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const exportCSV = () => {
    const csvField = (value: unknown) =>
      `"${String(value ?? '').replace(/"/g, '""')}"`;

    const headers = ['ID', 'Timestamp', 'Date', 'Action', 'Message', 'Provider', 'Details'];
    const rows = filteredLogs.map(log => {
      const logDate = new Date(log.timestamp).toISOString();
      const provider = log.details?.provider || '';
      const details = log.details ? JSON.stringify(log.details) : '';
      return [
        log.id,
        log.timestamp,
        logDate,
        log.action,
        csvField(log.message),
        csvField(provider),
        csvField(details)
      ];
    });
    
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", url);
    downloadAnchor.setAttribute("download", `devswitch-activity-logs-${getLocalDateString(new Date())}.csv`);
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
        return <UserPlus className="w-4 h-4 text-emerald-500" />;
      case 'PROFILE_UPDATED':
        return <UserCheck className="w-4 h-4 text-blue-500" />;
      case 'PROFILE_DELETED':
        return <UserMinus className="w-4 h-4 text-red-500" />;
      case 'SSH_KEY_GENERATED':
        return <KeyRound className="w-4 h-4 text-amber-500" />;
      case 'SSH_KEY_IMPORTED':
        return <KeyRound className="w-4 h-4 text-purple-500" />;
      case 'SSH_CONFIG_UPDATED':
        return <FileCode2 className="w-4 h-4 text-indigo-500" />;
      case 'PROVIDER_KEY_UPLOADED':
        return <Share2 className="w-4 h-4 text-sky-500" />;
      case 'PROVIDER_DISCONNECTED':
        return <PlugZap className="w-4 h-4 text-rose-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getLogBg = (action: string) => {
    switch (action) {
      case 'PROFILE_CREATED':
        return 'bg-emerald-500/10 border-emerald-500/25';
      case 'PROFILE_UPDATED':
        return 'bg-blue-500/10 border-blue-500/25';
      case 'PROFILE_DELETED':
        return 'bg-red-500/10 border-red-500/25';
      case 'SSH_KEY_GENERATED':
      case 'SSH_KEY_IMPORTED':
        return 'bg-amber-500/10 border-amber-500/25';
      case 'SSH_CONFIG_UPDATED':
        return 'bg-indigo-500/10 border-indigo-500/25';
      case 'PROVIDER_KEY_UPLOADED':
        return 'bg-sky-500/10 border-sky-500/25';
      case 'PROVIDER_DISCONNECTED':
        return 'bg-rose-500/10 border-rose-500/25';
      default:
        return 'bg-muted/40 border-border/40';
    }
  };

  const filteredLogs = useMemo(() => {
    return logs
      .filter((log) => {
        if (filterAction !== 'ALL' && log.action !== filterAction) return false;
        
        // Date filters
        const logDateStr = getLocalDateString(new Date(log.timestamp));
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
      <div className="max-w-4xl mx-auto space-y-6 animate-scale-in">
        {/* Header Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/setting')}
              className="rounded-full h-10 w-10 shrink-0 p-0 hover:bg-background/80"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight">Activity Log</h2>
              <p className="text-xs text-muted-foreground">
                Chronological system action logs and security handshake audit streams
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
                  className="h-8.5 text-xs font-bold gap-1.5 border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-950 dark:text-orange-400 dark:hover:bg-orange-950/20 rounded-xl"
                >
                  <History className="w-3.5 h-3.5" />
                  Prune Older Records
                </Button>
                
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={clearLogs}
                  className="h-8.5 text-xs font-bold gap-1.5 rounded-xl"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear Archive
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Filters and Actions Toolbar */}
        <div className="space-y-4 bg-card/45 backdrop-blur-md p-5 rounded-2xl border border-border/50 shadow-soft">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search events, messages or action keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-background/50 border border-border/80 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary h-10 font-medium"
              />
            </div>

            {/* Filter Dropdown */}
            <div className="relative min-w-[200px]">
              <Filter className="absolute left-3.5 top-2.5 h-4.5 w-4.5 text-muted-foreground pointer-events-none" />
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-background/50 border border-border/80 rounded-xl appearance-none focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary h-10 font-bold"
              >
                <option value="ALL">All Event Types</option>
                <option value="PROFILE_CREATED">Profile Created</option>
                <option value="PROFILE_UPDATED">Profile Updated</option>
                <option value="PROFILE_DELETED">Profile Deleted</option>
                <option value="SSH_KEY_GENERATED">SSH Key Generated</option>
                <option value="SSH_KEY_IMPORTED">SSH Key Imported</option>
                <option value="SSH_CONFIG_UPDATED">SSH Config Updated</option>
                <option value="PROVIDER_KEY_UPLOADED">Key Handshake</option>
                <option value="PROVIDER_DISCONNECTED">Disconnect Handshake</option>
              </select>
            </div>
            
            {/* Export Buttons */}
            {filteredLogs.length > 0 && (
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" onClick={exportCSV} className="h-10 text-xs font-bold px-4">
                  <Download className="w-3.5 h-3.5 mr-1.5 text-primary" />
                  CSV
                </Button>
                <Button variant="outline" onClick={exportJSON} className="h-10 text-xs font-bold px-4">
                  <FileText className="w-3.5 h-3.5 mr-1.5 text-purple-500" />
                  JSON
                </Button>
              </div>
            )}
          </div>

          {/* Date Picker Filters */}
          <div className="flex flex-wrap items-center gap-3 pt-3.5 border-t border-border/30">
            <div className="flex items-center gap-2 text-[10px] font-extrabold text-muted-foreground tracking-wider shrink-0">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              DATE BOUNDS
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-background/50 border border-border/80 text-[11px] px-2.5 py-1.5 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary font-semibold"
              />
              <span className="text-[11px] text-muted-foreground font-medium">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-background/50 border border-border/80 text-[11px] px-2.5 py-1.5 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary font-semibold"
              />
            </div>
            
            {/* Presets */}
            <div className="flex flex-wrap items-center gap-1.5 ml-auto">
              <button
                onClick={() => applyDatePreset(0)}
                className="text-[10px] bg-background border border-border/80 hover:bg-muted/50 text-foreground px-2.5 py-1 rounded-lg font-bold"
              >
                Today
              </button>
              <button
                onClick={() => applyDatePreset(7)}
                className="text-[10px] bg-background border border-border/80 hover:bg-muted/50 text-foreground px-2.5 py-1 rounded-lg font-bold"
              >
                7d range
              </button>
              <button
                onClick={() => applyDatePreset(30)}
                className="text-[10px] bg-background border border-border/80 hover:bg-muted/50 text-foreground px-2.5 py-1 rounded-lg font-bold"
              >
                30d range
              </button>
              {(startDate || endDate) && (
                <button
                  onClick={resetDateFilters}
                  className="flex items-center gap-1 text-[10px] text-destructive hover:bg-destructive/10 px-2.5 py-1 rounded-lg font-bold border border-destructive/20"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in-0 duration-200 backdrop-blur-xs">
            <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-xl p-6 relative flex flex-col gap-4 animate-in scale-in-95 duration-200">
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
                  <h3 className="text-base font-extrabold tracking-tight">Delete Older Activity Logs</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Select a cutoff date to clean up your logs database. All log records before this date will be permanently deleted.
                  </p>
                </div>
              </div>

              {/* Presets */}
              <div className="space-y-2 pt-2">
                <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Quick Presets</label>
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
                <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">Custom Date Cutoff</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={deleteBeforeDate}
                    onChange={(e) => setDeleteBeforeDate(e.target.value)}
                    className="flex-1 bg-background border border-border text-xs px-3 py-2 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                  <Button 
                    variant="destructive"
                    size="sm"
                    disabled={!deleteBeforeDate}
                    onClick={() => handleClearBefore(deleteBeforeDate)}
                    className="px-4"
                  >
                    Prune Older
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Logs List Chronological Panel */}
        <Card className="border border-border/50 bg-card/45 backdrop-blur-md rounded-2xl shadow-soft">
          <CardContent className="p-6">
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <Activity className="w-12 h-12 text-muted-foreground/30 animate-pulse-slow" />
                <div className="space-y-1">
                  <p className="text-base font-extrabold">No matching audit records</p>
                  <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                    {logs.length === 0 
                      ? "Handshake and profile switching actions will populate audit history logs here." 
                      : "Refine or widen your active queries or date bound range selection."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative border-l border-border/50 ml-4 pl-6 space-y-7">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="relative group animate-scale-in">
                    {/* Timeline dot */}
                    <div className={`absolute -left-[37px] top-1 p-1.5 rounded-full border shadow-sm shrink-0 z-10 ${getLogBg(log.action)}`}>
                      {getLogIcon(log.action)}
                    </div>
                    
                    {/* Log detail content */}
                    <div className="space-y-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="text-sm font-bold tracking-tight text-foreground leading-snug">
                          {log.message}
                        </span>
                        <span className="text-[10px] font-bold text-muted-foreground shrink-0 bg-muted/40 px-2 py-0.5 rounded-lg border border-border/30">
                          {formatDate(log.timestamp)}
                        </span>
                      </div>
                      
                      {/* Meta information tags */}
                      <div className="flex flex-wrap items-center gap-2 pt-1.5 text-[10px]">
                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md font-bold tracking-wide uppercase">
                          {log.action.replace(/_/g, ' ')}
                        </span>

                        {log.details?.provider && (
                          <span className="bg-purple-500/10 text-purple-500 px-2 py-0.5 rounded-md capitalize font-bold">
                            {log.details.provider}
                          </span>
                        )}

                        {log.details?.algorithm && (
                          <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-md font-bold">
                            {log.details.algorithm.toUpperCase()}
                          </span>
                        )}
                        
                        {log.details?.keyPath && (
                          <span className="text-[10px] text-muted-foreground font-mono bg-muted/30 px-2 py-0.5 rounded-md border border-border/30">
                            Path: {log.details.keyPath.split('/').pop()}
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
