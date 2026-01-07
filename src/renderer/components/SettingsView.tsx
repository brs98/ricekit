import { useState, useEffect } from 'react';
import type { Preferences, Theme } from '../../shared/types';
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

export function SettingsView() {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [systemAppearance, setSystemAppearance] = useState<'light' | 'dark'>('light');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [selectedThemesForExport, setSelectedThemesForExport] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [sunriseSunset, setSunriseSunset] = useState<{ sunrise: string; sunset: string; location: string } | null>(null);
  const [loadingSunTimes, setLoadingSunTimes] = useState(false);
  const [showAboutDialog, setShowAboutDialog] = useState(false);
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

  useEffect(() => {
    loadPreferences();
    loadThemes();
    loadSystemAppearance();
    loadLoggingState();
  }, []);

  async function loadLoggingState() {
    try {
      const isEnabled = await window.electronAPI.isDebugLoggingEnabled();
      setDebugLogging(isEnabled);
      const logFilePath = await window.electronAPI.getLogFile();
      setLogFile(logFilePath);
    } catch (err) {
      console.error('Failed to load logging state:', err);
    }
  }

  async function loadPreferences() {
    try {
      setLoading(true);
      setError(null);
      const prefs = await window.electronAPI.getPreferences();
      setPreferences(prefs);
    } catch (err) {
      console.error('Failed to load preferences:', err);
      setError('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  }

  async function loadThemes() {
    try {
      const allThemes = await window.electronAPI.listThemes();
      setThemes(allThemes);
    } catch (err) {
      console.error('Failed to load themes:', err);
    }
  }

  async function loadSystemAppearance() {
    try {
      const appearance = await window.electronAPI.getSystemAppearance();
      setSystemAppearance(appearance);
    } catch (err) {
      console.error('Failed to get system appearance:', err);
    }
  }

  async function savePreferences(updatedPrefs: Preferences) {
    try {
      setSaving(true);
      await window.electronAPI.setPreferences(updatedPrefs);
      setPreferences(updatedPrefs);
    } catch (err) {
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

  function updateAutoSwitch(updates: Partial<Preferences['autoSwitch']>) {
    if (!preferences) return;
    const updated = {
      ...preferences,
      autoSwitch: { ...preferences.autoSwitch, ...updates }
    };
    savePreferences(updated);
  }

  function updateSchedule(updates: Partial<Preferences['schedule']>) {
    if (!preferences) return;
    const updated = {
      ...preferences,
      schedule: { ...preferences.schedule, ...updates } as Preferences['schedule']
    };
    savePreferences(updated);
  }

  async function loadSunriseSunset() {
    try {
      setLoadingSunTimes(true);
      const times = await window.electronAPI.getSunriseSunset();
      setSunriseSunset(times);
    } catch (err) {
      console.error('Failed to get sunrise/sunset times:', err);
      setSunriseSunset(null);
    } finally {
      setLoadingSunTimes(false);
    }
  }

  // Load sunrise/sunset times when sunset mode is selected
  useEffect(() => {
    if (preferences?.autoSwitch.mode === 'sunset') {
      loadSunriseSunset();
    }
  }, [preferences?.autoSwitch.mode]);

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
    } catch (error: any) {
      console.error('Failed to export themes:', error);
      if (error.message !== 'Export canceled') {
        alert(`Failed to export themes: ${error.message}`);
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
      await loadThemes();

      alert('Theme imported successfully!');
    } catch (error: any) {
      console.error('Failed to import theme:', error);
      if (error.message !== 'Import canceled') {
        alert(`Failed to import theme: ${error.message}`);
      }
    } finally {
      setImporting(false);
    }
  }

  async function handleOpenHelp() {
    try {
      // Try to open the local HELP.md file
      await window.electronAPI.openHelp?.();
    } catch (err: any) {
      console.error('Failed to open help:', err);
      // Fallback to GitHub README if local help file doesn't work
      const fallbackUrl = 'https://github.com/yourusername/mactheme#readme';
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
    } catch (err: any) {
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
          <Button variant="outline" onClick={loadPreferences}>
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
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-muted-foreground mt-1">
          Configure MacTheme preferences and behavior
        </p>
      </div>

      <div className="settings-content space-y-8 mt-6">
        {/* General Section */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold">General</h3>

          <SettingItem
            label="Start at Login"
            description="Launch MacTheme automatically when you log in"
          >
            <Switch
              checked={preferences.startAtLogin}
              onCheckedChange={(checked) => updatePreference('startAtLogin', checked)}
            />
          </SettingItem>

          <SettingItem
            label="Show in Menu Bar"
            description="Display MacTheme icon in the menu bar for quick access"
          >
            <Switch
              checked={preferences.showInMenuBar}
              onCheckedChange={(checked) => updatePreference('showInMenuBar', checked)}
            />
          </SettingItem>
        </section>

        {/* Auto-Switching Section */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold">Auto-Switching</h3>

          <SettingItem
            label="Enable Auto-Switching"
            description="Automatically change themes based on system appearance or schedule"
          >
            <Switch
              checked={preferences.autoSwitch.enabled}
              onCheckedChange={(checked) => updateAutoSwitch({ enabled: checked })}
            />
          </SettingItem>

          {preferences.autoSwitch.enabled && (
            <>
              <SettingItem
                label="Mode"
                description="Choose how themes switch automatically"
              >
                <Select
                  value={preferences.autoSwitch.mode}
                  onValueChange={(value) => updateAutoSwitch({ mode: value as 'system' | 'schedule' | 'sunset' })}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">Match System Appearance</SelectItem>
                    <SelectItem value="schedule">Schedule</SelectItem>
                    <SelectItem value="sunset">Sunrise/Sunset</SelectItem>
                  </SelectContent>
                </Select>
              </SettingItem>

              {preferences.autoSwitch.mode === 'system' && (
                <div className="space-y-4 pl-4 border-l-2 border-border">
                  <SettingItem
                    label="Light Theme"
                    description={`Theme to use in light mode (Current: ${systemAppearance === 'light' ? 'Active' : 'Inactive'})`}
                  >
                    <Select
                      value={preferences.defaultLightTheme || ''}
                      onValueChange={(value) => updatePreference('defaultLightTheme', value)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select a theme..." />
                      </SelectTrigger>
                      <SelectContent>
                        {themes.filter(t => t.isLight).map(theme => (
                          <SelectItem key={theme.name} value={theme.name}>
                            {theme.metadata.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </SettingItem>

                  <SettingItem
                    label="Dark Theme"
                    description={`Theme to use in dark mode (Current: ${systemAppearance === 'dark' ? 'Active' : 'Inactive'})`}
                  >
                    <Select
                      value={preferences.defaultDarkTheme || ''}
                      onValueChange={(value) => updatePreference('defaultDarkTheme', value)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select a theme..." />
                      </SelectTrigger>
                      <SelectContent>
                        {themes.filter(t => !t.isLight).map(theme => (
                          <SelectItem key={theme.name} value={theme.name}>
                            {theme.metadata.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </SettingItem>
                </div>
              )}

              {preferences.autoSwitch.mode === 'schedule' && (
                <div className="space-y-4 pl-4 border-l-2 border-border">
                  <SettingItem
                    label="Light Theme Time"
                    description="Time to switch to light theme"
                  >
                    <input
                      type="time"
                      className="flex h-9 w-[140px] rounded-[8px] border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={preferences.schedule?.light || '06:00'}
                      onChange={(e) => updateSchedule({ light: e.target.value })}
                    />
                  </SettingItem>

                  <SettingItem
                    label="Dark Theme Time"
                    description="Time to switch to dark theme"
                  >
                    <input
                      type="time"
                      className="flex h-9 w-[140px] rounded-[8px] border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={preferences.schedule?.dark || '18:00'}
                      onChange={(e) => updateSchedule({ dark: e.target.value })}
                    />
                  </SettingItem>

                  <SettingItem label="Light Theme">
                    <Select
                      value={preferences.defaultLightTheme || ''}
                      onValueChange={(value) => updatePreference('defaultLightTheme', value)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select a theme..." />
                      </SelectTrigger>
                      <SelectContent>
                        {themes.map(theme => (
                          <SelectItem key={theme.name} value={theme.name}>
                            {theme.metadata.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </SettingItem>

                  <SettingItem label="Dark Theme">
                    <Select
                      value={preferences.defaultDarkTheme || ''}
                      onValueChange={(value) => updatePreference('defaultDarkTheme', value)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select a theme..." />
                      </SelectTrigger>
                      <SelectContent>
                        {themes.map(theme => (
                          <SelectItem key={theme.name} value={theme.name}>
                            {theme.metadata.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </SettingItem>
                </div>
              )}

              {preferences.autoSwitch.mode === 'sunset' && (
                <div className="space-y-4 pl-4 border-l-2 border-border">
                  <div className="rounded-[10px] bg-muted p-4 text-sm">
                    <p className="text-muted-foreground">
                      Themes will switch automatically based on sunrise and sunset times
                      for your location.
                    </p>
                  </div>

                  {/* Sunrise/Sunset times display */}
                  <div className="rounded-[10px] border border-border p-4">
                    {loadingSunTimes && (
                      <p className="text-sm text-muted-foreground">Loading sunrise and sunset times...</p>
                    )}
                    {!loadingSunTimes && sunriseSunset && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🌅</span>
                          <span className="text-sm font-medium">Sunrise:</span>
                          <span className="text-sm text-muted-foreground">{sunriseSunset.sunrise}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🌇</span>
                          <span className="text-sm font-medium">Sunset:</span>
                          <span className="text-sm text-muted-foreground">{sunriseSunset.sunset}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          Location: {sunriseSunset.location}
                        </div>
                      </div>
                    )}
                    {!loadingSunTimes && !sunriseSunset && (
                      <p className="text-sm text-destructive">Unable to calculate sunrise/sunset times</p>
                    )}
                  </div>

                  <SettingItem label="Day Theme">
                    <Select
                      value={preferences.defaultLightTheme || ''}
                      onValueChange={(value) => updatePreference('defaultLightTheme', value)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select a theme..." />
                      </SelectTrigger>
                      <SelectContent>
                        {themes.map(theme => (
                          <SelectItem key={theme.name} value={theme.name}>
                            {theme.metadata.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </SettingItem>

                  <SettingItem label="Night Theme">
                    <Select
                      value={preferences.defaultDarkTheme || ''}
                      onValueChange={(value) => updatePreference('defaultDarkTheme', value)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select a theme..." />
                      </SelectTrigger>
                      <SelectContent>
                        {themes.map(theme => (
                          <SelectItem key={theme.name} value={theme.name}>
                            {theme.metadata.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </SettingItem>
                </div>
              )}
            </>
          )}
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
                } catch (error: any) {
                  console.error('Failed to backup preferences:', error);
                  alert(`Failed to backup preferences: ${error.message}`);
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
                    await loadPreferences();
                  }
                } catch (error: any) {
                  console.error('Failed to restore preferences:', error);
                  alert(`Failed to restore preferences: ${error.message}`);
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
                } catch (err) {
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
                } catch (err) {
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
                  } catch (err) {
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
                  <span>You're up to date (v{updateInfo.currentVersion})</span>
                )
              ) : (
                'Check if a newer version of MacTheme is available'
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
              {updateInfo?.hasUpdate && updateInfo.updateUrl && (
                <Button onClick={() => window.electronAPI.openExternal(updateInfo.updateUrl!)}>
                  Download Update
                </Button>
              )}
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
            label="About MacTheme"
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
              Select themes to export. Each theme will be saved as a .mactheme file.
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
