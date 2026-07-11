import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/animate-ui/components/buttons/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettingsStore } from "@/stores/settingsStore";
import { useTheme } from "next-themes";
import {
  ArrowLeft,
  LayoutGrid,
  List,
  Menu,
  Sun,
  Moon,
  Laptop,
  ShieldCheck,
  ShieldAlert,
  ScrollText,
  ChevronRight,
  Info,
  Github,
  Plus,
  Trash2,
  Save,
  Loader2,
  FileText,
  Settings as SettingsIcon,
  CheckCircle2,
  AlertCircle,
  Terminal,
  BookOpen,
  Globe,
  Copy,
  Check,
  CheckCircle,
  Play,
  Database,
  Download,
  Upload,
  RefreshCw,
  Lock,
  Unlock,
  FileJson,
} from "lucide-react";
import type { SSHConfigEntry } from "@/types/sshConfig";
import { v4 as uuidv4 } from "uuid";

export function SettingsPage() {
  const navigate = useNavigate();
  const { layoutView, setLayoutView } = useSettingsStore();
  const { theme, setTheme } = useTheme();

  const [permissions, setPermissions] = useState<any>(null);
  const [checkingPerms, setCheckingPerms] = useState(false);
  const [logCount, setLogCount] = useState(0);
  const [appVersion, setAppVersion] = useState("1.0.0");

  // Tab State: 'general', 'ssh', 'cli', or 'backup'
  const [activeTab, setActiveTab] = useState<"general" | "ssh" | "cli" | "backup">(
    "general",
  );

  // SSH Config State
  const [entries, setEntries] = useState<SSHConfigEntry[]>([]);
  const [isLoadingSSH, setIsLoadingSSH] = useState(true);
  const [isSavingSSH, setIsSavingSSH] = useState(false);
  const [sshMessage, setSshMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // CLI Copied Field
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  // Backup & Restore State
  const [autoBackupEnabled, setAutoBackupEnabledState] = useState(false);
  const [backups, setBackups] = useState<any[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  
  // Export Settings
  const [exportWithSSH, setExportWithSSH] = useState(true);
  const [exportPasswordProtected, setExportPasswordProtected] = useState(false);
  const [exportPassword, setExportPassword] = useState("");
  
  // Import Settings & Modal
  const [importNewSSH, setImportNewSSH] = useState(false);
  const [importPassword, setImportPassword] = useState("");
  const [pendingImportPath, setPendingImportPath] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    checkPermissions();
    fetchLogCount();
    fetchAppVersion();
  }, []);

  useEffect(() => {
    if (activeTab === "ssh") {
      loadConfig();
    } else if (activeTab === "backup") {
      loadBackupSettings();
    }
  }, [activeTab]);

  const loadBackupSettings = async () => {
    if (window.electronAPI?.backup) {
      try {
        setLoadingBackups(true);
        const autoEnabled = await window.electronAPI.backup.isAutoEnabled();
        setAutoBackupEnabledState(autoEnabled);
        
        const list = await window.electronAPI.backup.list();
        setBackups(list);
      } catch (err) {
        console.error("Failed to load backup settings:", err);
      } finally {
        setLoadingBackups(false);
      }
    }
  };

  const handleToggleAutoBackup = async (enabled: boolean) => {
    if (window.electronAPI?.backup) {
      try {
        await window.electronAPI.backup.setAutoEnabled(enabled);
        setAutoBackupEnabledState(enabled);
        setSuccessMessage(`Auto-backup has been ${enabled ? "enabled" : "disabled"}.`);
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (err) {
        console.error("Failed to set auto-backup status:", err);
      }
    }
  };

  const handleCreateBackup = async () => {
    if (window.electronAPI?.backup) {
      try {
        const result = await window.electronAPI.backup.create();
        if (result.success) {
          setSuccessMessage(`Backup saved successfully to ${result.filePath}`);
          loadBackupSettings();
          setTimeout(() => setSuccessMessage(null), 4000);
        } else if (result.error && !result.error.includes("canceled")) {
          setImportError(result.error);
          setTimeout(() => setImportError(null), 4000);
        }
      } catch (err) {
        console.error("Failed to create backup:", err);
      }
    }
  };

  const handleRestoreBackup = async (filePath: string) => {
    if (window.electronAPI?.backup) {
      if (!confirm("Are you sure you want to restore this backup? This will overwrite existing profiles and merge logs.")) {
        return;
      }
      try {
        const result = await window.electronAPI.backup.restore(filePath);
        if (result.success) {
          setSuccessMessage("Backup restored successfully!");
          setTimeout(() => setSuccessMessage(null), 4000);
        } else {
          setImportError(result.error || "Failed to restore backup");
          setTimeout(() => setImportError(null), 4000);
        }
      } catch (err) {
        console.error("Failed to restore backup:", err);
      }
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    if (window.electronAPI?.backup) {
      if (!confirm(`Are you sure you want to permanently delete backup ${filename}?`)) {
        return;
      }
      try {
        const result = await window.electronAPI.backup.delete(filename);
        if (result.success) {
          setSuccessMessage("Backup deleted successfully.");
          loadBackupSettings();
          setTimeout(() => setSuccessMessage(null), 3000);
        } else {
          setImportError(result.error || "Failed to delete backup");
          setTimeout(() => setImportError(null), 3000);
        }
      } catch (err) {
        console.error("Failed to delete backup:", err);
      }
    }
  };

  const handleExportData = async () => {
    if (window.electronAPI?.transfer) {
      try {
        const password = exportPasswordProtected ? exportPassword : undefined;
        if (exportPasswordProtected && !password) {
          setImportError("Please enter a password for protection.");
          setTimeout(() => setImportError(null), 3000);
          return;
        }
        
        const result = await window.electronAPI.transfer.exportData({
          withSSH: exportWithSSH,
          password
        });
        
        if (result.success) {
          setSuccessMessage(`Data exported successfully to ${result.filePath}`);
          setTimeout(() => setSuccessMessage(null), 4000);
          setExportPassword("");
        } else if (result.error && !result.error.includes("canceled")) {
          setImportError(result.error);
          setTimeout(() => setImportError(null), 4000);
        }
      } catch (err) {
        console.error("Failed to export data:", err);
      }
    }
  };

  const handleImportData = async (filePath?: string, passwordInput?: string) => {
    if (window.electronAPI?.transfer) {
      try {
        setImportError(null);
        const result = await window.electronAPI.transfer.importData({
          newSSH: importNewSSH,
          password: passwordInput,
          filePath: filePath || undefined
        });

        if (result.success) {
          setSuccessMessage(`Successfully imported: ${result.addedCount ?? 0} added, ${result.updatedCount ?? 0} updated, ${result.skippedCount ?? 0} skipped.`);
          setShowPasswordModal(false);
          setPendingImportPath(null);
          setImportPassword("");
          setTimeout(() => setSuccessMessage(null), 4000);
        } else if (result.requiresPassword) {
          setPendingImportPath(result.filePath || null);
          setShowPasswordModal(true);
        } else if (result.error && !result.error.includes("canceled")) {
          setImportError(result.error);
          setTimeout(() => setImportError(null), 4000);
        }
      } catch (err) {
        console.error("Failed to import data:", err);
      }
    }
  };

  const checkPermissions = async () => {
    if (window.electronAPI?.permissions) {
      setCheckingPerms(true);
      try {
        const status = await window.electronAPI.permissions.check();
        setPermissions(status);
      } catch (err) {
        console.error("Failed to check permissions:", err);
      } finally {
        setCheckingPerms(false);
      }
    }
  };

  const fetchLogCount = async () => {
    if (window.electronAPI?.log) {
      try {
        const logs = await window.electronAPI.log.getAll();
        setLogCount(logs.length);
      } catch (err) {
        console.error("Failed to fetch logs:", err);
      }
    }
  };

  const fetchAppVersion = async () => {
    if (window.electronAPI?.app) {
      try {
        const version = await window.electronAPI.app.getVersion();
        setAppVersion(version);
      } catch (err) {
        console.error("Failed to fetch app version:", err);
      }
    }
  };

  const loadConfig = async () => {
    setIsLoadingSSH(true);
    setSshMessage(null);
    try {
      const result = await window.electronAPI.sshConfigEditor.read();
      if (result.entries) {
        setEntries(result.entries);
      } else if (result.error) {
        setSshMessage({ type: "error", text: result.error });
      }
    } catch (err) {
      setSshMessage({ type: "error", text: "Failed to load SSH config" });
    } finally {
      setIsLoadingSSH(false);
    }
  };

  const handleSave = async () => {
    setIsSavingSSH(true);
    setSshMessage(null);
    try {
      const result = await window.electronAPI.sshConfigEditor.save(entries);
      if (result.success) {
        setSshMessage({
          type: "success",
          text: "SSH config saved successfully!",
        });
      } else {
        setSshMessage({
          type: "error",
          text: result.error || "Failed to save config",
        });
      }
    } catch (err) {
      setSshMessage({ type: "error", text: "An error occurred while saving" });
    } finally {
      setIsSavingSSH(false);
      setTimeout(() => setSshMessage(null), 3000);
    }
  };

  const handleAddEntry = () => {
    const newEntry: SSHConfigEntry = {
      id: uuidv4(),
      Host: "new-host",
      HostName: "",
      User: "",
      Port: "",
      IdentityFile: "",
      customFields: [],
    };
    setEntries([newEntry, ...entries]);
  };

  const handleRemoveEntry = (id: string) => {
    setEntries(entries.filter((e) => e.id !== id));
  };

  const updateEntry = (
    id: string,
    field: keyof SSHConfigEntry,
    value: string,
  ) => {
    setEntries(
      entries.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
    );
  };

  const handleCopy = async (text: string, identifier: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCmd(identifier);
      setTimeout(() => setCopiedCmd(null), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  const isSSHMode = activeTab === "ssh";

  return (
    <AppShell>
      <div
        className={`${isSSHMode ? "max-w-5xl" : "max-w-3xl"} mx-auto space-y-6 transition-all duration-350 ease-in-out`}
      >
        {/* Header Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="rounded-full h-10 w-10 shrink-0 p-0 hover:bg-background/80"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight">
                Settings
              </h2>
              <p className="text-xs text-muted-foreground">
                Manage your profile listings view, system permission integrity,
                and SSH configuration rules
              </p>
            </div>
          </div>

          {isSSHMode && (
            <div className="flex items-center gap-2 animate-scale-in">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddEntry}
                className="h-9"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add Host Rule
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSavingSSH || isLoadingSSH}
                className="h-9 bg-primary hover:bg-primary/95 text-white shadow-sm active:scale-95 transition-transform"
              >
                {isSavingSSH ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-1.5" />
                )}
                Save Changes
              </Button>
            </div>
          )}
        </div>

        {/* Sliding Tab Header Selector */}
        <div className="flex bg-muted/30 dark:bg-muted/10 p-1.5 rounded-xl border border-border/40 gap-1 max-w-lg">
          <button
            onClick={() => setActiveTab("general")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 active:scale-95 ${
              activeTab === "general"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
            General
          </button>
          <button
            onClick={() => setActiveTab("ssh")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 active:scale-95 ${
              activeTab === "ssh"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="w-4 h-4" />
            SSH Config
          </button>
          <button
            onClick={() => setActiveTab("backup")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 active:scale-95 ${
              activeTab === "backup"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Database className="w-4 h-4" />
            Backups & Data
          </button>
          <button
            onClick={() => setActiveTab("cli")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 active:scale-95 ${
              activeTab === "cli"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Terminal className="w-4 h-4" />
            CLI & Docs
          </button>
        </div>

        {/* Tab Content Panels */}
        {activeTab === "general" && (
          <div className="space-y-6 animate-scale-in">
            {/* Interface Preferences */}
            <Card className="border border-border/50 bg-card/45 backdrop-blur-md shadow-soft rounded-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-extrabold">
                  App Interface Preferences
                </CardTitle>
                <CardDescription className="text-xs">
                  Customize the color palette mode and default display layouts
                  of profile identities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Theme Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 border-t border-border/30">
                  <div>
                    <h4 className="text-sm font-bold text-foreground">
                      Theme Color Mode
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Select your preferred app appearance
                    </p>
                  </div>
                  <div className="flex bg-muted/40 p-1.5 rounded-xl border border-border/30 self-start sm:self-auto gap-1">
                    <button
                      onClick={() => setTheme("light")}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all active:scale-95 ${
                        theme === "light"
                          ? "bg-card shadow-xs text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5" />
                      Light
                    </button>
                    <button
                      onClick={() => setTheme("dark")}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all active:scale-95 ${
                        theme === "dark"
                          ? "bg-card shadow-xs text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5" />
                      Dark
                    </button>
                    <button
                      onClick={() => setTheme("system")}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all active:scale-95 ${
                        theme === "system"
                          ? "bg-card shadow-xs text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Laptop className="w-3.5 h-3.5" />
                      System
                    </button>
                  </div>
                </div>

                {/* Layout View Preference */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 border-t border-border/30">
                  <div>
                    <h4 className="text-sm font-bold text-foreground">
                      Listing View Mode
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Preferred default list template on homepage
                    </p>
                  </div>
                  <div className="flex bg-muted/40 p-1.5 rounded-xl border border-border/30 self-start sm:self-auto gap-1">
                    <button
                      onClick={() => setLayoutView("grid")}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all active:scale-95 ${
                        layoutView === "grid"
                          ? "bg-card shadow-xs text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      Grid
                    </button>
                    <button
                      onClick={() => setLayoutView("list")}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all active:scale-95 ${
                        layoutView === "list"
                          ? "bg-card shadow-xs text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <List className="w-3.5 h-3.5" />
                      List
                    </button>
                    <button
                      onClick={() => setLayoutView("compact")}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all active:scale-95 ${
                        layoutView === "compact"
                          ? "bg-card shadow-xs text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Menu className="w-3.5 h-3.5" />
                      Compact
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System & Security */}
            <Card className="border border-border/50 bg-card/45 backdrop-blur-md shadow-soft rounded-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-extrabold">
                  System & Local Security
                </CardTitle>
                <CardDescription className="text-xs">
                  Monitor SSH folder access status required for automated SSH
                  key rules injection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* SSH Permissions Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 border-t border-border/30">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-foreground">
                      Local .ssh Access Permission
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Access to directory paths for SSH rules and credentials
                      storage
                    </p>
                    {permissions && (
                      <div className="flex items-center gap-1.5 pt-1.5 text-xs">
                        {permissions.granted ? (
                          <span className="flex items-center gap-1 text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full font-bold">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" />{" "}
                            Confirmed
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-500 bg-red-500/10 px-2.5 py-0.5 rounded-full font-bold">
                            <ShieldAlert className="w-4 h-4 text-red-500" />{" "}
                            Restrict Authorized (Status: {permissions.status})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    onClick={checkPermissions}
                    disabled={checkingPerms}
                    className="self-start sm:self-auto h-9"
                  >
                    {checkingPerms ? "Checking..." : "Re-verify"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Premium Activity Log Card */}
            <button
              onClick={() => navigate("/setting/active-log")}
              className="w-full text-left focus:outline-hidden group active:scale-98 transition-transform"
            >
              <Card className="border border-border/50 bg-card/45 hover:bg-card/70 backdrop-blur-md shadow-soft rounded-2xl transition-all duration-300">
                <CardContent className="flex items-center justify-between p-5">
                  <div className="flex gap-4 items-center min-w-0">
                    <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl group-hover:scale-105 transition-transform duration-200 shrink-0">
                      <ScrollText className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-extrabold flex items-center gap-2 flex-wrap">
                        <span>Systems Activity Audit Log</span>
                        {logCount > 0 && (
                          <span className="bg-primary/15 text-primary text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                            {logCount} records
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">
                        Audit history of profile switching actions, SSH creation
                        updates, and security logs.
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform shrink-0" />
                </CardContent>
              </Card>
            </button>

            {/* About App Info Card */}
            <Card className="border border-border/50 bg-card/45 backdrop-blur-md shadow-soft rounded-2xl">
              <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex gap-4 items-start">
                  <div className="p-3 bg-muted/40 border rounded-xl shrink-0">
                    <Info className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold">DevSwitch</h4>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                      Version {appVersion}
                    </p>
                    <p className="text-xs text-muted-foreground pt-1 max-w-md leading-relaxed">
                      Sleek multi-account credentials switching application
                      crafted to make Git setups satisfying and risk-free.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0 self-start sm:self-auto">
                  <a
                    href="https://devswitch.in/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors border border-border/40 px-3.5 py-2 rounded-xl hover:bg-muted/40 font-bold"
                  >
                    <Globe className="w-4 h-4 text-blue-500" />
                    Visit Website
                  </a>
                  <a
                    href="https://github.com/umesh-saini/DevSwitch"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors border border-border/40 px-3.5 py-2 rounded-xl hover:bg-muted/40 font-bold"
                  >
                    <Github className="w-4 h-4 text-slate-500" />
                    Github Project
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "ssh" && (
          <div className="space-y-6 animate-scale-in">
            {sshMessage && (
              <div
                className={`p-4 rounded-xl border text-sm flex items-center gap-2.5 shadow-xs animate-scale-in ${
                  sshMessage.type === "success"
                    ? "bg-green-50/70 border-green-200 text-green-900 dark:bg-green-950/20 dark:border-green-900/50 dark:text-green-200"
                    : "bg-red-50/70 border-red-200 text-red-900 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-200"
                }`}
              >
                {sshMessage.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                )}
                <span className="font-semibold">{sshMessage.text}</span>
              </div>
            )}

            {isLoadingSSH ? (
              <div className="flex flex-col justify-center items-center py-20 gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground font-semibold">
                  Reading ssh config file safely...
                </p>
              </div>
            ) : entries.length === 0 ? (
              <Card className="border border-dashed border-border/60 py-16 bg-card/25 backdrop-blur-md flex flex-col items-center justify-center text-center rounded-2xl">
                <FileText className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground text-sm mb-4 max-w-xs">
                  No active SSH host rule blocks defined in your local config.
                </p>
                <Button
                  variant="outline"
                  onClick={handleAddEntry}
                  className="h-9"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Create First SSH Rule
                </Button>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {entries.map((entry) => (
                  <Card
                    key={entry.id}
                    className="relative p-5 border border-border/50 bg-card/45 backdrop-blur-md shadow-soft space-y-4 hover:border-primary/40 transition-all duration-300 group rounded-2xl"
                  >
                    <Button
                      variant="ghost"
                      className="absolute top-4 right-4 h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                      onClick={() => handleRemoveEntry(entry.id)}
                      title="Remove Host Block"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>

                    <div className="space-y-1.5 pt-2">
                      <Label className="text-[10px] font-extrabold text-muted-foreground tracking-wider uppercase">
                        Host Alias Name
                      </Label>
                      <Input
                        value={entry.Host}
                        onChange={(e) =>
                          updateEntry(entry.id, "Host", e.target.value)
                        }
                        placeholder="github.com-work"
                        className="font-mono text-xs bg-background/50 border-border/80 focus:border-primary/80 h-9 transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-extrabold text-muted-foreground tracking-wider uppercase">
                        Canonical HostName
                      </Label>
                      <Input
                        value={entry.HostName}
                        onChange={(e) =>
                          updateEntry(entry.id, "HostName", e.target.value)
                        }
                        placeholder="github.com"
                        className="font-mono text-xs bg-background/50 border-border/80 focus:border-primary/80 h-9 transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-extrabold text-muted-foreground tracking-wider uppercase">
                          SSH User
                        </Label>
                        <Input
                          value={entry.User}
                          onChange={(e) =>
                            updateEntry(entry.id, "User", e.target.value)
                          }
                          placeholder="git"
                          className="font-mono text-xs bg-background/50 border-border/80 focus:border-primary/80 h-9 transition-colors"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-extrabold text-muted-foreground tracking-wider uppercase">
                          Port
                        </Label>
                        <Input
                          value={entry.Port}
                          onChange={(e) =>
                            updateEntry(entry.id, "Port", e.target.value)
                          }
                          placeholder="22"
                          className="font-mono text-xs bg-background/50 border-border/80 focus:border-primary/80 h-9 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-extrabold text-muted-foreground tracking-wider uppercase">
                        Identity SSH Key File
                      </Label>
                      <Input
                        value={entry.IdentityFile}
                        onChange={(e) =>
                          updateEntry(entry.id, "IdentityFile", e.target.value)
                        }
                        placeholder="~/.ssh/id_rsa_work"
                        className="font-mono text-xs bg-background/50 border-border/80 focus:border-primary/80 h-9 transition-colors"
                      />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CLI & Documentation Tab View Content */}
        {activeTab === "cli" && (
          <div className="space-y-6 animate-scale-in">
            {/* Quick Website Navigation Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a
                href="https://devswitch.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="group p-5 rounded-2xl border border-blue-500/10 bg-gradient-to-r from-blue-500/5 to-transparent hover:from-blue-500/10 transition-all duration-300 flex items-center justify-between"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-blue-500" />
                    <h3 className="font-bold text-sm">Official Website</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Visit our landing page to discover updates, release notes,
                    and more.
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </a>

              <a
                href="https://devswitch.in/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="group p-5 rounded-2xl border border-purple-500/10 bg-gradient-to-r from-purple-500/5 to-transparent hover:from-purple-500/10 transition-all duration-300 flex items-center justify-between"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-purple-500" />
                    <h3 className="font-bold text-sm">
                      CLI & API Documentation
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Comprehensive references, CLI guides, and scripting
                    cookbooks.
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </a>
            </div>

            {/* Standalone CLI Section */}
            <Card className="border border-border/50 bg-card/45 backdrop-blur-md shadow-soft rounded-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-extrabold flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-primary" />
                  <span>Standalone devswitch-cli Utility</span>
                </CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  The Standalone CLI shares the same secure filesystem profiles
                  database. Changing profiles in your terminal updates your
                  active profile here in the app instantly!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Installation console */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    Installation Command
                  </Label>
                  <div className="bg-neutral-950 dark:bg-black p-3.5 rounded-xl border border-neutral-800 text-neutral-200 dark:text-neutral-300 font-mono text-xs flex items-center justify-between gap-3">
                    <code className="text-emerald-400 font-mono">
                      npm install -g devswitch-cli
                    </code>
                    <button
                      onClick={() =>
                        handleCopy("npm install -g devswitch-cli", "install")
                      }
                      className="h-8 w-8 hover:bg-neutral-800 rounded-lg flex items-center justify-center transition-colors text-neutral-400 hover:text-white shrink-0 active:scale-90"
                    >
                      {copiedCmd === "install" ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Core commands terminal reference sheet */}
                <div className="space-y-3">
                  <Label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                    Core CLI Commands Reference
                  </Label>

                  <div className="grid grid-cols-1 gap-3 font-mono text-xs">
                    {[
                      {
                        cmd: "devswitch list",
                        desc: "List all profiles currently configured in the secure database",
                      },
                      {
                        cmd: "devswitch use <profile>",
                        desc: "Instantly switch to profile (SSH config + agent + global git)",
                      },
                      {
                        cmd: "devswitch current",
                        desc: "Print the username and details of the currently active profile",
                      },
                      {
                        cmd: "devswitch test <profile>",
                        desc: "Perform a dry-run test connection of the SSH key",
                      },
                      {
                        cmd: "devswitch sync",
                        desc: "Scan and import unmanaged SSH keys as profiles automatically",
                      },
                      {
                        cmd: "devswitch help [command]",
                        desc: "Show help documents, optionally for specific sub-commands",
                      },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-neutral-950 dark:bg-neutral-900 border border-neutral-800 dark:border-neutral-700 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 group/item"
                      >
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-1.5 font-bold font-mono">
                            <Play className="w-3 h-3 text-emerald-400 fill-emerald-400 shrink-0" />
                            <span className="text-emerald-400">{item.cmd}</span>
                          </div>
                          <p className="text-[11px] text-neutral-400 font-sans">
                            {item.desc}
                          </p>
                        </div>
                        <button
                          onClick={() => handleCopy(item.cmd, `cmd-${idx}`)}
                          className="h-8 w-8 hover:bg-neutral-800 rounded-lg flex items-center justify-center transition-colors text-neutral-500 hover:text-white shrink-0 active:scale-90 opacity-80 sm:opacity-0 sm:group-hover/item:opacity-100"
                        >
                          {copiedCmd === `cmd-${idx}` ? (
                            <Check className="w-3.5 h-3.5 text-green-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Backups & Restore Tab View Content */}
        {activeTab === "backup" && (
          <div className="space-y-6 animate-scale-in">
            {successMessage && (
              <div className="p-4 rounded-xl border border-green-200 bg-green-50/70 text-green-950 dark:bg-green-950/20 dark:border-green-900/50 dark:text-green-200 text-sm flex items-center gap-2.5 shadow-xs animate-scale-in">
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                <span className="font-semibold">{successMessage}</span>
              </div>
            )}
            {importError && !showPasswordModal && (
              <div className="p-4 rounded-xl border border-red-200 bg-red-50/70 text-red-950 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-200 text-sm flex items-center gap-2.5 shadow-xs animate-scale-in">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <span className="font-semibold">{importError}</span>
              </div>
            )}

            {/* Auto-Backup Configurations */}
            <Card className="border border-border/50 bg-card/45 backdrop-blur-md shadow-soft rounded-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-extrabold flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" />
                  <span>Backup Settings & Auto-Backup</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Configure automated snapshots of your profiles database.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 border-t border-border/30">
                  <div>
                    <h4 className="text-sm font-bold text-foreground">
                      Automatic Profile Backups
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Automatically create snapshots when profiles are added, updated, or removed
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleAutoBackup(!autoBackupEnabled)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        autoBackupEnabled ? "bg-primary" : "bg-muted"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          autoBackupEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <span className="text-xs font-bold text-foreground min-w-[30px]">
                      {autoBackupEnabled ? "On" : "Off"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 border-t border-border/30">
                  <div>
                    <h4 className="text-sm font-bold text-foreground">
                      Manual Backup Snapshot
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Export a full JSON backup of profiles and log activity immediately
                    </p>
                  </div>
                  <Button
                    onClick={handleCreateBackup}
                    variant="outline"
                    className="self-start sm:self-auto h-9"
                  >
                    <Save className="w-4 h-4 mr-1.5" />
                    Create Backup File
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Profile Import / Export Transfer Panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Export Card */}
              <Card className="border border-border/50 bg-card/45 backdrop-blur-md shadow-soft rounded-2xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-extrabold flex items-center gap-2">
                    <Upload className="w-5 h-5 text-blue-500" />
                    <span>Secure Export</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Export your profile data to a JSON file.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Export Options */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="export-with-ssh" className="text-xs font-bold text-muted-foreground cursor-pointer">
                        Include SSH Keys
                      </Label>
                      <button
                        id="export-with-ssh"
                        onClick={() => setExportWithSSH(!exportWithSSH)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          exportWithSSH ? "bg-blue-500" : "bg-muted"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            exportWithSSH ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="export-pwd-protected" className="text-xs font-bold text-muted-foreground cursor-pointer">
                        Password Protection
                      </Label>
                      <button
                        id="export-pwd-protected"
                        onClick={() => setExportPasswordProtected(!exportPasswordProtected)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          exportPasswordProtected ? "bg-blue-500" : "bg-muted"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            exportPasswordProtected ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {exportPasswordProtected && (
                      <div className="space-y-1.5 animate-scale-in pt-1">
                        <Label htmlFor="export-pwd" className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                          Archive Password
                        </Label>
                        <Input
                          id="export-pwd"
                          type="password"
                          value={exportPassword}
                          onChange={(e) => setExportPassword(e.target.value)}
                          placeholder="Password to encrypt database archive"
                          className="h-9 bg-background/50 font-mono text-xs"
                        />
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleExportData}
                    className="w-full h-9 bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs"
                  >
                    <Upload className="w-4 h-4 mr-1.5" />
                    Export Profiles Archive
                  </Button>
                </CardContent>
              </Card>

              {/* Import Card */}
              <Card className="border border-border/50 bg-card/45 backdrop-blur-md shadow-soft rounded-2xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-extrabold flex items-center gap-2">
                    <Download className="w-5 h-5 text-emerald-500" />
                    <span>Secure Import</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Restore and merge profiles from an export archive.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Import Options */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="import-new-ssh" className="text-xs font-bold text-muted-foreground cursor-pointer block">
                          Generate Fresh SSH Keys
                        </Label>
                        <span className="text-[10px] text-muted-foreground">
                          Create brand new keys instead of restoring exported key files
                        </span>
                      </div>
                      <button
                        id="import-new-ssh"
                        onClick={() => setImportNewSSH(!importNewSSH)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          importNewSSH ? "bg-emerald-500" : "bg-muted"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            importNewSSH ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleImportData()}
                    className="w-full h-9 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs mt-4"
                  >
                    <Download className="w-4 h-4 mr-1.5" />
                    Import Profiles Archive
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Backup History Snapshots List */}
            <Card className="border border-border/50 bg-card/45 backdrop-blur-md shadow-soft rounded-2xl">
              <CardHeader className="pb-4 flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-extrabold flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-primary" />
                    <span>Backup Snapshots History</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    View and restore recent automated system recovery snapshots
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  onClick={loadBackupSettings}
                  disabled={loadingBackups}
                  className="rounded-full h-8 w-8 p-0 hover:bg-background/85"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingBackups ? "animate-spin" : ""}`} />
                </Button>
              </CardHeader>
              <CardContent className="pb-5">
                {loadingBackups ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <p className="text-[10px] text-muted-foreground font-medium">Fetching snapshot indices...</p>
                  </div>
                ) : backups.length === 0 ? (
                  <div className="text-center py-10">
                    <FileJson className="w-10 h-10 text-muted-foreground mx-auto opacity-40 mb-2" />
                    <p className="text-xs text-muted-foreground">No backup snapshots recorded yet.</p>
                  </div>
                ) : (
                  <div className="border border-border/40 rounded-xl overflow-hidden divide-y divide-border/30 bg-background/30">
                    {backups.map((bk, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3.5 hover:bg-muted/10 transition-colors gap-4">
                        <div className="min-w-0">
                          <p className="text-xs font-bold font-mono text-foreground truncate">
                            {bk.filename}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(bk.timestamp).toLocaleString()} • {(bk.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRestoreBackup(bk.filePath)}
                            className="h-8 text-[11px] font-bold text-primary hover:bg-primary/10 px-3 rounded-lg"
                          >
                            Restore
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteBackup(bk.filename)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                            title="Delete Backup Snapshot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Password Prompt Modal for Encrypted Imports */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs animate-fade-in p-4">
          <div className="bg-card border border-border/80 w-full max-w-md p-6 rounded-2xl shadow-premium space-y-4 animate-scale-in">
            <div className="flex items-center gap-2.5 text-primary">
              <Lock className="w-5 h-5" />
              <h3 className="text-lg font-extrabold">Decryption Required</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This DevSwitch profiles archive is password-protected. Enter the decryption password to proceed.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="decrypt-pwd" className="text-xs font-bold text-muted-foreground">
                Decryption Password
              </Label>
              <Input
                id="decrypt-pwd"
                type="password"
                value={importPassword}
                onChange={(e) => setImportPassword(e.target.value)}
                placeholder="Enter archive password"
                className="h-10 bg-background/50 focus-visible:ring-1 focus-visible:ring-primary/80 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleImportData(pendingImportPath || undefined, importPassword);
                  }
                }}
              />
            </div>
            {importError && (
              <div className="text-xs text-red-500 bg-red-500/10 p-2.5 rounded-lg flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>{importError}</span>
              </div>
            )}
            <div className="flex justify-end gap-2.5 pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowPasswordModal(false);
                  setPendingImportPath(null);
                  setImportPassword("");
                  setImportError(null);
                }}
                className="h-9 px-4 text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleImportData(pendingImportPath || undefined, importPassword)}
                className="h-9 px-4 bg-primary text-white hover:bg-primary/95 text-xs font-bold"
              >
                Decrypt & Import
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
