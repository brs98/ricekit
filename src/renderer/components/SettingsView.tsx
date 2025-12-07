import { useState, useEffect } from 'react';
import type { Preferences, Theme } from '../../shared/types';
import { ShortcutRecorder } from './ShortcutRecorder';
import { AboutDialog } from './AboutDialog';

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

  useEffect(() => {
    loadPreferences();
    loadThemes();
    loadSystemAppearance();
  }, []);

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

  if (loading) {
    return (
      <div className="settings-view">
        <div className="loading-spinner">Loading settings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="settings-view">
        <div className="error-state">
          <p>{error}</p>
          <button className="retry-button" onClick={loadPreferences}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!preferences) return null;

  return (
    <div className="settings-view">
      <div className="settings-header">
        <h2>Settings</h2>
        <p className="settings-description">
          Configure MacTheme preferences and behavior
        </p>
      </div>

      <div className="settings-content">
        {/* General Section */}
        <section className="settings-section">
          <h3 className="section-title">General</h3>
          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">Start at Login</label>
              <p className="setting-description">
                Launch MacTheme automatically when you log in
              </p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={preferences.startAtLogin}
                onChange={(e) => updatePreference('startAtLogin', e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">Show in Menu Bar</label>
              <p className="setting-description">
                Display MacTheme icon in the menu bar for quick access
              </p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={preferences.showInMenuBar}
                onChange={(e) => updatePreference('showInMenuBar', e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </section>

        {/* Auto-Switching Section */}
        <section className="settings-section">
          <h3 className="section-title">Auto-Switching</h3>

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">Enable Auto-Switching</label>
              <p className="setting-description">
                Automatically change themes based on system appearance or schedule
              </p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={preferences.autoSwitch.enabled}
                onChange={(e) => updateAutoSwitch({ enabled: e.target.checked })}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {preferences.autoSwitch.enabled && (
            <>
              <div className="setting-item">
                <div className="setting-info">
                  <label className="setting-label">Mode</label>
                  <p className="setting-description">
                    Choose how themes switch automatically
                  </p>
                </div>
                <select
                  className="setting-select"
                  value={preferences.autoSwitch.mode}
                  onChange={(e) => updateAutoSwitch({ mode: e.target.value as 'system' | 'schedule' | 'sunset' })}
                >
                  <option value="system">Match System Appearance</option>
                  <option value="schedule">Schedule</option>
                  <option value="sunset">Sunrise/Sunset</option>
                </select>
              </div>

              {preferences.autoSwitch.mode === 'system' && (
                <div className="auto-switch-themes">
                  <div className="setting-item">
                    <div className="setting-info">
                      <label className="setting-label">Light Theme</label>
                      <p className="setting-description">
                        Theme to use in light mode (Current: {systemAppearance === 'light' ? 'Active' : 'Inactive'})
                      </p>
                    </div>
                    <select
                      className="setting-select"
                      value={preferences.defaultLightTheme}
                      onChange={(e) => updatePreference('defaultLightTheme', e.target.value)}
                    >
                      <option value="">Select a theme...</option>
                      {themes
                        .filter(t => t.isLight)
                        .map(theme => (
                          <option key={theme.name} value={theme.name}>
                            {theme.metadata.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <label className="setting-label">Dark Theme</label>
                      <p className="setting-description">
                        Theme to use in dark mode (Current: {systemAppearance === 'dark' ? 'Active' : 'Inactive'})
                      </p>
                    </div>
                    <select
                      className="setting-select"
                      value={preferences.defaultDarkTheme}
                      onChange={(e) => updatePreference('defaultDarkTheme', e.target.value)}
                    >
                      <option value="">Select a theme...</option>
                      {themes
                        .filter(t => !t.isLight)
                        .map(theme => (
                          <option key={theme.name} value={theme.name}>
                            {theme.metadata.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )}

              {preferences.autoSwitch.mode === 'schedule' && (
                <div className="auto-switch-schedule">
                  <div className="setting-item">
                    <div className="setting-info">
                      <label className="setting-label">Light Theme Time</label>
                      <p className="setting-description">
                        Time to switch to light theme
                      </p>
                    </div>
                    <input
                      type="time"
                      className="setting-input"
                      value={preferences.schedule?.light || '06:00'}
                      onChange={(e) => updateSchedule({ light: e.target.value })}
                    />
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <label className="setting-label">Dark Theme Time</label>
                      <p className="setting-description">
                        Time to switch to dark theme
                      </p>
                    </div>
                    <input
                      type="time"
                      className="setting-input"
                      value={preferences.schedule?.dark || '18:00'}
                      onChange={(e) => updateSchedule({ dark: e.target.value })}
                    />
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <label className="setting-label">Light Theme</label>
                    </div>
                    <select
                      className="setting-select"
                      value={preferences.defaultLightTheme}
                      onChange={(e) => updatePreference('defaultLightTheme', e.target.value)}
                    >
                      <option value="">Select a theme...</option>
                      {themes.map(theme => (
                        <option key={theme.name} value={theme.name}>
                          {theme.metadata.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <label className="setting-label">Dark Theme</label>
                    </div>
                    <select
                      className="setting-select"
                      value={preferences.defaultDarkTheme}
                      onChange={(e) => updatePreference('defaultDarkTheme', e.target.value)}
                    >
                      <option value="">Select a theme...</option>
                      {themes.map(theme => (
                        <option key={theme.name} value={theme.name}>
                          {theme.metadata.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {preferences.autoSwitch.mode === 'sunset' && (
                <div className="auto-switch-sunset">
                  <div className="info-box">
                    <p>
                      Themes will switch automatically based on sunrise and sunset times
                      for your location.
                    </p>
                  </div>

                  {/* Display sunrise/sunset times */}
                  <div className="sunset-times">
                    {loadingSunTimes && (
                      <p className="loading-text">Loading sunrise and sunset times...</p>
                    )}
                    {!loadingSunTimes && sunriseSunset && (
                      <div className="sun-times-display">
                        <div className="sun-time-item">
                          <span className="sun-time-label">🌅 Sunrise:</span>
                          <span className="sun-time-value">{sunriseSunset.sunrise}</span>
                        </div>
                        <div className="sun-time-item">
                          <span className="sun-time-label">🌇 Sunset:</span>
                          <span className="sun-time-value">{sunriseSunset.sunset}</span>
                        </div>
                        <div className="sun-time-location">
                          <span className="location-text">Location: {sunriseSunset.location}</span>
                        </div>
                      </div>
                    )}
                    {!loadingSunTimes && !sunriseSunset && (
                      <p className="error-text">Unable to calculate sunrise/sunset times</p>
                    )}
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <label className="setting-label">Day Theme</label>
                    </div>
                    <select
                      className="setting-select"
                      value={preferences.defaultLightTheme}
                      onChange={(e) => updatePreference('defaultLightTheme', e.target.value)}
                    >
                      <option value="">Select a theme...</option>
                      {themes.map(theme => (
                        <option key={theme.name} value={theme.name}>
                          {theme.metadata.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <label className="setting-label">Night Theme</label>
                    </div>
                    <select
                      className="setting-select"
                      value={preferences.defaultDarkTheme}
                      onChange={(e) => updatePreference('defaultDarkTheme', e.target.value)}
                    >
                      <option value="">Select a theme...</option>
                      {themes.map(theme => (
                        <option key={theme.name} value={theme.name}>
                          {theme.metadata.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* Notifications Section */}
        <section className="settings-section">
          <h3 className="section-title">Notifications</h3>

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">Show Notifications on Theme Change</label>
              <p className="setting-description">
                Display a notification when you manually apply a theme
              </p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={preferences.notifications?.onThemeChange ?? preferences.showNotifications ?? true}
                onChange={(e) => updatePreference('notifications', {
                  ...preferences.notifications,
                  onThemeChange: e.target.checked,
                  onScheduledSwitch: preferences.notifications?.onScheduledSwitch ?? preferences.showNotifications ?? true
                })}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">Show Notifications on Scheduled Switch</label>
              <p className="setting-description">
                Display a notification when themes auto-switch based on schedule or system appearance
              </p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={preferences.notifications?.onScheduledSwitch ?? preferences.showNotifications ?? true}
                onChange={(e) => updatePreference('notifications', {
                  ...preferences.notifications,
                  onThemeChange: preferences.notifications?.onThemeChange ?? preferences.showNotifications ?? true,
                  onScheduledSwitch: e.target.checked
                })}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </section>

        {/* Keyboard Shortcuts Section */}
        <section className="settings-section">
          <h3 className="section-title">Keyboard Shortcuts</h3>

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">Quick Switcher</label>
              <p className="setting-description">
                Global shortcut to open quick theme switcher
              </p>
            </div>
            <ShortcutRecorder
              value={preferences.keyboardShortcuts.quickSwitcher}
              onChange={(shortcut) => updatePreference('keyboardShortcuts', {
                quickSwitcher: shortcut
              })}
              placeholder="⌘⇧T"
            />
          </div>
        </section>

        {/* Backup & Restore Section */}
        <section className="settings-section">
          <h3 className="section-title">Backup & Restore</h3>

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">Backup Preferences</label>
              <p className="setting-description">
                Export your settings to a JSON file for safekeeping or migration
              </p>
            </div>
            <button
              className="secondary-button"
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
            </button>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">Restore Preferences</label>
              <p className="setting-description">
                Import settings from a backup file
              </p>
            </div>
            <button
              className="secondary-button"
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
            </button>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">Export Themes</label>
              <p className="setting-description">
                Create a backup of your themes to share or restore later
              </p>
            </div>
            <button
              className="secondary-button"
              onClick={() => setShowExportDialog(true)}
            >
              Export...
            </button>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">Import Themes</label>
              <p className="setting-description">
                Restore themes from a backup file
              </p>
            </div>
            <button
              className="secondary-button"
              onClick={handleImportThemes}
              disabled={importing}
            >
              {importing ? 'Importing...' : 'Import...'}
            </button>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">Reset Preferences</label>
              <p className="setting-description">
                Reset all settings to defaults (themes are preserved)
              </p>
            </div>
            <button
              className="secondary-button danger"
              onClick={() => {
                if (confirm('Are you sure you want to reset all preferences to defaults?')) {
                  alert('Reset functionality coming soon');
                }
              }}
            >
              Reset
            </button>
          </div>
        </section>

        {/* Help & About Section */}
        <section className="settings-section">
          <h3 className="section-title">Help & About</h3>

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">Help & Documentation</label>
              <p className="setting-description">
                View user guide, troubleshooting tips, and feature documentation
              </p>
            </div>
            <button
              className="secondary-button"
              onClick={() => handleOpenHelp()}
            >
              Open Help
            </button>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">About MacTheme</label>
              <p className="setting-description">
                View application information, version, and credits
              </p>
            </div>
            <button
              className="secondary-button"
              onClick={() => setShowAboutDialog(true)}
            >
              About...
            </button>
          </div>
        </section>
      </div>

      {saving && (
        <div className="save-indicator">
          Saving...
        </div>
      )}

      {/* Export Themes Dialog */}
      {showExportDialog && (
        <div className="modal-overlay" onClick={() => !exporting && setShowExportDialog(false)}>
          <div className="modal-content export-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Export Themes</h3>
              <button
                className="close-button"
                onClick={() => setShowExportDialog(false)}
                disabled={exporting}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <p className="dialog-description">
                Select themes to export. Each theme will be saved as a .mactheme file.
              </p>

              <div className="theme-selection-list">
                {themes.map(theme => (
                  <label key={theme.name} className="theme-checkbox-item">
                    <input
                      type="checkbox"
                      checked={selectedThemesForExport.includes(theme.name)}
                      onChange={() => toggleThemeSelection(theme.name)}
                      disabled={exporting}
                    />
                    <span className="theme-checkbox-label">
                      <span className="theme-name">{theme.metadata.name}</span>
                      {theme.isCustom && (
                        <span className="theme-badge custom">Custom</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>

              <div className="dialog-actions">
                <button
                  className="secondary-button"
                  onClick={() => setShowExportDialog(false)}
                  disabled={exporting}
                >
                  Cancel
                </button>
                <button
                  className="primary-button"
                  onClick={handleExportThemes}
                  disabled={exporting || selectedThemesForExport.length === 0}
                >
                  {exporting ? 'Exporting...' : `Export ${selectedThemesForExport.length || ''} Theme${selectedThemesForExport.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* About Dialog */}
      <AboutDialog
        isOpen={showAboutDialog}
        onClose={() => setShowAboutDialog(false)}
      />
    </div>
  );
}
