import { useState, useEffect } from 'react';
import type { Preferences, Theme, ScheduleEntry } from '../../shared/types';
import { ShortcutRecorder } from './ShortcutRecorder';
import { AboutDialog } from './AboutDialog';
import { Switch } from '@/renderer/components/ui/switch';
import { Button } from '@/renderer/components/ui/button';
import { Checkbox } from '@/renderer/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/renderer/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/renderer/components/ui/dialog';
import { Label } from '@/renderer/components/ui/label';
import { Input } from '@/renderer/components/ui/input';

// Schedule Modal component for managing theme/wallpaper schedules
interface ScheduleModalProps {
  themes: readonly Theme[];
  currentSchedules: readonly ScheduleEntry[];
  onClose: () => void;
  onSave: (schedules: ScheduleEntry[]) => void;
}

function ScheduleModal({ themes, currentSchedules, onClose, onSave }: ScheduleModalProps) {
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([...currentSchedules]);

  const addSchedule = () => {
    const newEntry: ScheduleEntry = {
      timeStart: '09:00',
      timeEnd: '17:00',
      type: 'theme',
      themeName: themes[0]?.name || '',
      name: 'New Schedule',
    };
    setSchedules([...schedules, newEntry]);
  };

  const updateSchedule = (index: number, field: string, value: string) => {
    const updated = [...schedules];
    const existing = updated[index];
    if (!existing) return;

    // Handle type change specially - need to create a new entry with correct shape
    if (field === 'type') {
      if (value === 'theme') {
        const newEntry: ScheduleEntry = {
          timeStart: existing.timeStart,
          timeEnd: existing.timeEnd,
          name: existing.name,
          type: 'theme',
          themeName: themes[0]?.name || '',
        };
        updated[index] = newEntry;
      } else {
        const newEntry: ScheduleEntry = {
          timeStart: existing.timeStart,
          timeEnd: existing.timeEnd,
          name: existing.name,
          type: 'wallpaper',
          wallpaperPath: '',
        };
        updated[index] = newEntry;
      }
    } else if (field === 'themeName' && existing.type === 'theme') {
      updated[index] = { ...existing, themeName: value };
    } else if (field === 'wallpaperPath' && existing.type === 'wallpaper') {
      updated[index] = { ...existing, wallpaperPath: value };
    } else if (field === 'name' || field === 'timeStart' || field === 'timeEnd') {
      // Common fields can be updated directly
      updated[index] = { ...existing, [field]: value };
    }
    setSchedules(updated);
  };

  const removeSchedule = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Schedule Manager</DialogTitle>
          <DialogDescription>
            Set different themes or wallpapers for different times of day. Schedules are checked every minute.
            <br />
            <span className="text-yellow-500">Note: Manually applying a theme or wallpaper will disable scheduling.</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {schedules.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No schedules yet. Click &quot;Add Schedule&quot; to create one.
            </div>
          )}

          {schedules.map((schedule, index) => (
            <div
              key={index}
              className="p-4 rounded-lg border border-border bg-card text-card-foreground space-y-3"
            >
              <div className="flex gap-2">
                <Input
                  placeholder="Schedule name (e.g., Morning)"
                  value={schedule.name || ''}
                  onChange={(e) => updateSchedule(index, 'name', e.target.value)}
                  className="flex-1"
                />
                <Button variant="outline" onClick={() => removeSchedule(index)}>
                  Remove
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Start Time</Label>
                  <Input
                    type="time"
                    value={schedule.timeStart}
                    onChange={(e) => updateSchedule(index, 'timeStart', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">End Time</Label>
                  <Input
                    type="time"
                    value={schedule.timeEnd}
                    onChange={(e) => updateSchedule(index, 'timeEnd', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Type</Label>
                  <Select
                    value={schedule.type}
                    onValueChange={(value) => updateSchedule(index, 'type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="theme">Theme</SelectItem>
                      <SelectItem value="wallpaper">Wallpaper</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">{schedule.type === 'theme' ? 'Theme' : 'Wallpaper Path'}</Label>
                  {schedule.type === 'theme' ? (
                    <Select
                      value={schedule.themeName}
                      onValueChange={(value) => updateSchedule(index, 'themeName', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select theme..." />
                      </SelectTrigger>
                      <SelectContent>
                        {themes.map((theme) => (
                          <SelectItem key={theme.name} value={theme.name}>
                            {theme.metadata.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder="/path/to/wallpaper.jpg"
                      value={schedule.wallpaperPath}
                      onChange={(e) => updateSchedule(index, 'wallpaperPath', e.target.value)}
                    />
                  )}
                </div>
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            onClick={addSchedule}
            className="w-full"
          >
            + Add Schedule
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(schedules)}>
            Save Schedules
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export function SettingsView() {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [selectedThemesForExport, setSelectedThemesForExport] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showAboutDialog, setShowAboutDialog] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [debugLogging, setDebugLogging] = useState(false);
  const [logFile, setLogFile] = useState<string>('');
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{
    currentVersion: string;
    latestVersion: string;
    hasUpdate: boolean;
    updateUrl?: string;
    error?: string;
  } | null>(null);

  // Load all settings data in parallel on mount
  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    try {
      setLoading(true);
      setError(null);

      // Parallelize all independent data fetches
      const [prefs, allThemes, isLoggingEnabled, logFilePath] = await Promise.all([
        window.electronAPI.getPreferences(),
        window.electronAPI.listThemes(),
        window.electronAPI.isDebugLoggingEnabled(),
        window.electronAPI.getLogFile(),
      ]);

      setPreferences(prefs);
      setThemes(allThemes);
      setDebugLogging(isLoggingEnabled);
      setLogFile(logFilePath);
    } catch (err: unknown) {
      console.error('Failed to load settings data:', err);
      setError('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  }

  async function savePreferences(updatedPrefs: Preferences) {
    try {
      setSaving(true);
      await window.electronAPI.setPreferences(updatedPrefs);
      setPreferences(updatedPrefs);
    } catch (err: unknown) {
      console.error('Failed to save preferences:', err);
      setError('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  }

  function updatePreference<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    if (!preferences) return;
    const updated = { ...preferences, [key]: value };
    savePreferences(updated);
  }

  function updateScheduleEnabled(enabled: boolean) {
    if (!preferences) return;
    const updated = {
      ...preferences,
      schedule: {
        ...preferences.schedule,
        enabled,
        schedules: preferences.schedule?.schedules || [],
      },
    };
    savePreferences(updated);
  }

  function saveSchedules(schedules: ScheduleEntry[]) {
    if (!preferences) return;
    const updated = {
      ...preferences,
      schedule: {
        enabled: preferences.schedule?.enabled || false,
        schedules,
      },
    };
    savePreferences(updated);
    setShowScheduleModal(false);
  }

  async function handleExportThemes() {
    if (selectedThemesForExport.length === 0) {
      alert('Please select at least one theme to export');
      return;
    }

    try {
      setExporting(true);

      // For simplicity, if multiple themes are selected, export them one by one
      // In a more advanced version, we could create a single archive with all themes
      for (const themeName of selectedThemesForExport) {
        console.log(`Exporting theme: ${themeName}`);
        const exportPath = await window.electronAPI.exportTheme(themeName);
        console.log(`Theme exported to: ${exportPath}`);
      }

      alert(`Successfully exported ${selectedThemesForExport.length} theme(s)`);
      setShowExportDialog(false);
      setSelectedThemesForExport([]);
    } catch (error: unknown) {
      console.error('Failed to export themes:', error);
      const message = error instanceof Error ? error.message : String(error);
      if (message !== 'Export canceled') {
        alert(`Failed to export themes: ${message}`);
      }
    } finally {
      setExporting(false);
    }
  }

  function toggleThemeSelection(themeName: string) {
    setSelectedThemesForExport(prev => {
      if (prev.includes(themeName)) {
        return prev.filter(t => t !== themeName);
      } else {
        return [...prev, themeName];
      }
    });
  }

  async function handleImportThemes() {
    try {
      setImporting(true);

      // Call import with no path to show file picker dialog
      await window.electronAPI.importTheme('');

      // Reload themes to show the newly imported theme(s)
      await loadAllData();

      alert('Theme imported successfully!');
    } catch (error: unknown) {
      console.error('Failed to import theme:', error);
      const message = error instanceof Error ? error.message : String(error);
      if (message !== 'Import canceled') {
        alert(`Failed to import theme: ${message}`);
      }
    } finally {
      setImporting(false);
    }
  }

  async function handleOpenHelp() {
    try {
      // Try to open the local HELP.md file
      await window.electronAPI.openHelp?.();
    } catch (err: unknown) {
      console.error('Failed to open help:', err);
      // Fallback to GitHub README if local help file doesn't work
      const fallbackUrl = 'https://github.com/yourusername/flowstate#readme';
      window.electronAPI.openExternal?.(fallbackUrl).catch((fallbackErr: Error) => {
        console.error('Failed to open fallback URL:', fallbackErr);
        alert('Failed to open help documentation.');
      });
    }
  }

  async function handleCheckForUpdates() {
    try {
      setCheckingUpdates(true);
      setUpdateInfo(null);
      const result = await window.electronAPI.checkForUpdates();
      setUpdateInfo(result);
    } catch (err: unknown) {
      console.error('Failed to check for updates:', err);
      setUpdateInfo({
        currentVersion: '0.1.0',
        latestVersion: '0.1.0',
        hasUpdate: false,
        error: 'Failed to check for updates'
      });
    } finally {
      setCheckingUpdates(false);
    }
  }

  if (loading) {
    return (
      <div className="settings-view">
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Loading settings...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="settings-view">
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <p className="text-destructive">{error}</p>
          <Button variant="outline" onClick={loadAllData}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!preferences) return null;

  return (
    <div className="settings-view">
      <div className="settings-header">
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground mt-1">
          Configure Flowstate preferences and behavior
        </p>
      </div>

      <div className="settings-content space-y-8 mt-6">
        {/* General Section */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold">General</h3>

          <SettingItem
            label="Start at Login"
            description="Launch Flowstate automatically when you log in"
          >
            <Switch
              checked={preferences.startAtLogin}
              onCheckedChange={(checked) => updatePreference('startAtLogin', checked)}
            />
          </SettingItem>

          <SettingItem
            label="Show in Menu Bar"
            description="Display Flowstate icon in the menu bar for quick access"
          >
            <Switch
              checked={preferences.showInMenuBar}
              onCheckedChange={(checked) => updatePreference('showInMenuBar', checked)}
            />
          </SettingItem>
        </section>

        {/* Scheduling Section */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold">Scheduling</h3>

          <SettingItem
            label="Enable Scheduling"
            description="Automatically apply themes or wallpapers at scheduled times"
          >
            <Switch
              checked={preferences.schedule?.enabled || false}
              onCheckedChange={(checked) => updateScheduleEnabled(checked)}
            />
          </SettingItem>

          <SettingItem
            label="Manage Schedules"
            description={`${preferences.schedule?.schedules?.length || 0} schedule(s) configured`}
          >
            <Button variant="secondary" onClick={() => setShowScheduleModal(true)}>
              Manage Schedules
            </Button>
          </SettingItem>

          {preferences.schedule?.enabled && preferences.schedule?.schedules?.length === 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              Scheduling is enabled but no schedules are configured.
            </p>
          )}

          <p className="text-xs text-muted-foreground/70 mt-3">
            Manually applying a theme or wallpaper will disable scheduling until re-enabled.
          </p>
        </section>

        {/* Notifications Section */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold">Notifications</h3>

          <SettingItem
            label="Show Notifications on Theme Change"
            description="Display a notification when you manually apply a theme"
          >
            <Switch
              checked={preferences.notifications?.onThemeChange ?? preferences.showNotifications ?? true}
              onCheckedChange={(checked) => updatePreference('notifications', {
                ...preferences.notifications,
                onThemeChange: checked,
                onScheduledSwitch: preferences.notifications?.onScheduledSwitch ?? preferences.showNotifications ?? true
              })}
            />
          </SettingItem>

          <SettingItem
            label="Show Notifications on Scheduled Switch"
            description="Display a notification when themes auto-switch based on schedule or system appearance"
          >
            <Switch
              checked={preferences.notifications?.onScheduledSwitch ?? preferences.showNotifications ?? true}
              onCheckedChange={(checked) => updatePreference('notifications', {
                ...preferences.notifications,
                onThemeChange: preferences.notifications?.onThemeChange ?? preferences.showNotifications ?? true,
                onScheduledSwitch: checked
              })}
            />
          </SettingItem>
        </section>

        {/* Keyboard Shortcuts Section */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold">Keyboard Shortcuts</h3>

          <SettingItem
            label="Quick Switcher"
            description="Global shortcut to open quick theme switcher"
          >
            <ShortcutRecorder
              value={preferences.keyboardShortcuts.quickSwitcher}
              onChange={(shortcut) => updatePreference('keyboardShortcuts', {
                quickSwitcher: shortcut
              })}
              placeholder="⌘⇧T"
            />
          </SettingItem>
        </section>

        {/* Backup & Restore Section */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold">Backup & Restore</h3>

          <SettingItem
            label="Backup Preferences"
            description="Export your settings to a JSON file for safekeeping or migration"
          >
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  setSaving(true);
                  const backupPath = await window.electronAPI.backupPreferences();
                  if (backupPath) {
                    alert(`Preferences backed up successfully to:\n${backupPath}`);
                  }
                } catch (error: unknown) {
                  console.error('Failed to backup preferences:', error);
                  const message = error instanceof Error ? error.message : String(error);
                  alert(`Failed to backup preferences: ${message}`);
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
            >
              {saving ? 'Backing up...' : 'Backup...'}
            </Button>
          </SettingItem>

          <SettingItem
            label="Restore Preferences"
            description="Import settings from a backup file"
          >
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  if (!confirm('Restoring preferences will overwrite your current settings. Continue?')) {
                    return;
                  }
                  setSaving(true);
                  const restored = await window.electronAPI.restorePreferences();
                  if (restored) {
                    alert('Preferences restored successfully! Reloading...');
                    await loadAllData();
                  }
                } catch (error: unknown) {
                  console.error('Failed to restore preferences:', error);
                  const message = error instanceof Error ? error.message : String(error);
                  alert(`Failed to restore preferences: ${message}`);
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
            >
              {saving ? 'Restoring...' : 'Restore...'}
            </Button>
          </SettingItem>

          <SettingItem
            label="Export Themes"
            description="Create a backup of your themes to share or restore later"
          >
            <Button variant="secondary" onClick={() => setShowExportDialog(true)}>
              Export...
            </Button>
          </SettingItem>

          <SettingItem
            label="Import Themes"
            description="Restore themes from a backup file"
          >
            <Button
              variant="secondary"
              onClick={handleImportThemes}
              disabled={importing}
            >
              {importing ? 'Importing...' : 'Import...'}
            </Button>
          </SettingItem>

          <SettingItem
            label="Reset Preferences"
            description="Reset all settings to defaults (themes are preserved)"
          >
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm('Are you sure you want to reset all preferences to defaults?')) {
                  alert('Reset functionality coming soon');
                }
              }}
            >
              Reset
            </Button>
          </SettingItem>
        </section>

        {/* Developer & Logging Section */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold">Developer & Logging</h3>

          <SettingItem
            label="Debug Logging"
            description="Enable detailed debug logging for troubleshooting"
          >
            <Switch
              checked={debugLogging}
              onCheckedChange={async (checked) => {
                setDebugLogging(checked);
                try {
                  await window.electronAPI.setDebugLogging(checked);
                } catch (err: unknown) {
                  console.error('Failed to toggle debug logging:', err);
                  setDebugLogging(!checked); // Revert on error
                }
              }}
            />
          </SettingItem>

          <SettingItem
            label="View Log Files"
            description={logFile ? `Located at: ${logFile}` : 'View application logs for debugging'}
          >
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  const logDir = await window.electronAPI.getLogDirectory();
                  await window.electronAPI.openExternal(`file://${logDir}`);
                } catch (err: unknown) {
                  console.error('Failed to open log directory:', err);
                  alert('Failed to open log directory');
                }
              }}
            >
              Open Log Folder
            </Button>
          </SettingItem>

          <SettingItem
            label="Clear Log Files"
            description="Delete all log files to free up space"
          >
            <Button
              variant="destructive"
              onClick={async () => {
                if (confirm('Are you sure you want to delete all log files?')) {
                  try {
                    await window.electronAPI.clearLogs();
                    alert('Log files cleared successfully');
                  } catch (err: unknown) {
                    console.error('Failed to clear logs:', err);
                    alert('Failed to clear log files');
                  }
                }
              }}
            >
              Clear Logs
            </Button>
          </SettingItem>
        </section>

        {/* Help & About Section */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold">Help & About</h3>

          <SettingItem
            label="Check for Updates"
            description={
              updateInfo ? (
                updateInfo.error ? (
                  <span className="text-destructive">{updateInfo.error}</span>
                ) : updateInfo.hasUpdate ? (
                  <span className="text-primary">Update available: v{updateInfo.latestVersion}</span>
                ) : (
                  <span>You&apos;re up to date (v{updateInfo.currentVersion})</span>
                )
              ) : (
                'Check if a newer version of Flowstate is available'
              )
            }
          >
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={handleCheckForUpdates}
                disabled={checkingUpdates}
              >
                {checkingUpdates ? 'Checking...' : 'Check for Updates'}
              </Button>
              {(() => {
                const url = updateInfo?.updateUrl;
                if (!updateInfo?.hasUpdate || !url) return null;
                return (
                  <Button onClick={() => window.electronAPI.openExternal(url)}>
                    Download Update
                  </Button>
                );
              })()}
            </div>
          </SettingItem>

          <SettingItem
            label="Help & Documentation"
            description="View user guide, troubleshooting tips, and feature documentation"
          >
            <Button variant="secondary" onClick={() => handleOpenHelp()}>
              Open Help
            </Button>
          </SettingItem>

          <SettingItem
            label="About Flowstate"
            description="View application information, version, and credits"
          >
            <Button variant="secondary" onClick={() => setShowAboutDialog(true)}>
              About...
            </Button>
          </SettingItem>
        </section>
      </div>

      {saving && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-[10px] shadow-lg text-sm">
          Saving...
        </div>
      )}

      {/* Export Themes Dialog */}
      <Dialog open={showExportDialog} onOpenChange={(open) => !exporting && setShowExportDialog(open)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Export Themes</DialogTitle>
            <DialogDescription>
              Select themes to export. Each theme will be saved as a .flowstate file.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[300px] overflow-y-auto space-y-2 py-4">
            {themes.map(theme => (
              <label
                key={theme.name}
                className="flex items-center gap-3 p-3 rounded-[8px] hover:bg-accent cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={selectedThemesForExport.includes(theme.name)}
                  onCheckedChange={() => toggleThemeSelection(theme.name)}
                  disabled={exporting}
                />
                <span className="flex-1">
                  <span className="font-medium">{theme.metadata.name}</span>
                  {theme.isCustom && (
                    <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                      Custom
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowExportDialog(false)}
              disabled={exporting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExportThemes}
              disabled={exporting || selectedThemesForExport.length === 0}
            >
              {exporting ? 'Exporting...' : `Export ${selectedThemesForExport.length || ''} Theme${selectedThemesForExport.length !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* About Dialog */}
      <AboutDialog
        isOpen={showAboutDialog}
        onClose={() => setShowAboutDialog(false)}
      />

      {/* Schedule Modal */}
      {showScheduleModal && (
        <ScheduleModal
          themes={themes}
          currentSchedules={preferences?.schedule?.schedules || []}
          onClose={() => setShowScheduleModal(false)}
          onSave={saveSchedules}
        />
      )}
    </div>
  );
}

// Helper component for consistent setting item layout
function SettingItem({
  label,
  description,
  children,
}: {
  label: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex-1 min-w-0">
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
