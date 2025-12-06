import { useState, useEffect } from 'react';
import type { Preferences, Theme } from '../../shared/types';

export function SettingsView() {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [systemAppearance, setSystemAppearance] = useState<'light' | 'dark'>('light');

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
                      for your location. This requires location permissions.
                    </p>
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
            <input
              type="text"
              className="setting-input"
              value={preferences.keyboardShortcuts.quickSwitcher}
              onChange={(e) => updatePreference('keyboardShortcuts', {
                quickSwitcher: e.target.value
              })}
              placeholder="Cmd+Shift+T"
            />
          </div>
        </section>

        {/* Backup & Restore Section */}
        <section className="settings-section">
          <h3 className="section-title">Backup & Restore</h3>

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">Export Themes</label>
              <p className="setting-description">
                Create a backup of all your custom themes
              </p>
            </div>
            <button
              className="secondary-button"
              onClick={() => alert('Export functionality coming soon')}
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
              onClick={() => alert('Import functionality coming soon')}
            >
              Import...
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
      </div>

      {saving && (
        <div className="save-indicator">
          Saving...
        </div>
      )}
    </div>
  );
}
